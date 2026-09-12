/**
 * MZY SSO —— 部署在 Cloudflare Worker 上的轻量级单点登录服务
 *
 * 路由总览
 *   页面：  /  /login  /register  /profile  /admin/*  /docs  /setup  /sdk.js  /logout
 *   OAuth： /oauth/authorize  /oauth/authorize/decision  /oauth/token  /oauth/userinfo
 *           /oauth/introspect  /oauth/revoke  /oauth/register
 *   发现：  /.well-known/openid-configuration  /.well-known/jwks.json
 *   第三方：/api/connect/qq[/callback]  /api/connect/github[/callback]
 *   第三方：/api/connect/qq[/callback]  /api/connect/github[/callback]
 *   API：   /api/me
 *   AI 契约：/llms.txt  /llms-full.txt  /openapi.json
 *   管理API：/api/admin/apps[/id[/reset-secret]]  /users  /tokens  /stats  /logs
 */

import { createStore } from './store.js';
import { randomId, randomToken, hashPassword, verifyPassword } from './crypto.js';
import {
  handleAuthorize, handleToken, handleUserinfo, handleIntrospect, handleRevoke,
  openidConfiguration, jwksDocument, getCurrentUser, getCookie, json,
  normalizeScopes, DEFAULT_SCOPES
} from './oauth.js';
import { PROVIDERS, newState } from './providers.js';
import {
  homePage, loginPage, registerPage, consentPage, profilePage, errorPage, esc
} from './ui.js';
import { handleAdmin } from './admin.js';
import { docsPage, sdkScript } from './docs.js';
import { llmsTxt, llmsFullTxt, openApiSpec, textRes, jsonRes } from './openapi.js';
import { handleAdminApi } from './adminapi.js';

const VERSION = 'v1.2.0';

/* =========================================================
 *  工具函数
 * ========================================================= */

function html(res, status = 200) {
  return new Response(res, {
    status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' }
  });
}

function redirect(to, status = 302) {
  return new Response(null, { status, headers: { Location: to } });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Admin-Token',
  'Access-Control-Max-Age': '86400'
};

function withCORS(res) {
  const next = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS_HEADERS)) next.headers.set(k, v);
  return next;
}

const SESSION_COOKIE = 'mzy_sid';

function setSessionCookie(res, sid, maxAge) {
  const secure = '; Secure';
  res.headers.append('Set-Cookie',
    `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`);
  return res;
}

function clearSessionCookie(res) {
  res.headers.append('Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`);
  return res;
}

/**
 * 站内跳转安全校验：只允许相对路径，阻断 //evil.com 这类开放重定向
 */
function safeInternal(to, fallback = '/profile') {
  if (!to) return fallback;
  if (typeof to !== 'string') return fallback;
  if (to.startsWith('//')) return fallback;
  if (to.startsWith('/') && !to.startsWith('/\\')) return to;
  if (/^https?:\/\//i.test(to)) return fallback;
  return fallback;
}

/* =========================================================
 *  Worker 入口
 * ========================================================= */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const store = createStore(env.SSO_KV, env);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      const res = await route(request, env, store, url, pathname);
      return res;
    } catch (err) {
      console.error('[MZY SSO ERROR]', err);
      const accept = request.headers.get('Accept') || '';
      if (pathname.startsWith('/oauth') || pathname.startsWith('/api') || accept.includes('json')) {
        return withCORS(json({
          error: 'server_error',
          error_description: err.message || '服务内部错误'
        }, 500));
      }
      return errorPage({
        siteName: env.SITE_NAME,
        title: '服务出错了',
        message: err.message || '请稍后重试',
        status: 500
      });
    }
  }
};

async function route(request, env, store, url, pathname) {
  const method = request.method;
  const user = await getCurrentUser(request, store);

  /* ================= 发现文档 ================= */

  if (pathname === '/.well-known/openid-configuration') {
    return withCORS(openidConfiguration(env, url.origin));
  }
  if (pathname === '/.well-known/jwks.json') {
    return withCORS(jwksDocument());
  }

  /* ========== 面向 AI 助手 / 自动化工具的机读契约 ========== */

  if (pathname === '/llms.txt') {
    return textRes(llmsTxt(env.ISSUER || url.origin, env));
  }
  if (pathname === '/llms-full.txt') {
    return textRes(llmsFullTxt(env.ISSUER || url.origin, env));
  }
  if (pathname === '/openapi.json') {
    return jsonRes(openApiSpec(env.ISSUER || url.origin, env));
  }

  /* ========== 管理 API（REST，需 ADMIN_API_TOKEN） ========== */

  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
    return handleAdminApi(request, env, store, url, pathname);
  }

  /* ================= OAuth 标准端点 ================= */

  if (pathname === '/oauth/authorize') {
    return handleAuthorize(request, env, store);
  }

  if (pathname === '/oauth/token') {
    if (method !== 'POST') return withCORS(json({ error: 'invalid_request', error_description: '请使用 POST' }, 405));
    return withCORS(await handleToken(request, env, store));
  }

  if (pathname === '/oauth/userinfo') {
    return withCORS(await handleUserinfo(request, env, store));
  }

  if (pathname === '/oauth/introspect') {
    if (method !== 'POST') return withCORS(json({ error: 'invalid_request', error_description: '请使用 POST' }, 405));
    return withCORS(await handleIntrospect(request, env, store));
  }

  if (pathname === '/oauth/revoke') {
    if (method !== 'POST') return withCORS(json({ error: 'invalid_request', error_description: '请使用 POST' }, 405));
    return withCORS(await handleRevoke(request, env, store));
  }

  // 动态客户端注册（RFC 7591）
  if (pathname === '/oauth/register') {
    if (method !== 'POST') return withCORS(json({ error: 'invalid_request', error_description: '请使用 POST' }, 405));
    if (String(env.ALLOW_APP_REGISTER) !== 'true') {
      return withCORS(json({ error: 'registration_not_allowed', error_description: '未开放自助注册应用，请联系管理员' }, 403));
    }
    return withCORS(await dynamicRegister(request, env, store));
  }

  /* ================= 授权同意页提交 ================= */

  if (pathname === '/oauth/authorize/decision' && method === 'POST') {
    return handleDecision(request, env, store);
  }

  /* ================= 第三方登录 ================= */

  if (pathname === '/api/connect/qq') return startProvider(request, env, store, url, 'qq');
  if (pathname === '/api/connect/qq/callback') return finishProvider(request, env, store, url, 'qq');
  if (pathname === '/api/connect/github') return startProvider(request, env, store, url, 'github');
  if (pathname === '/api/connect/github/callback') return finishProvider(request, env, store, url, 'github');

  /* ================= 页面 ================= */

  if (pathname === '/') {
    const stats = await store.getStats();
    return html(homePage({
      siteName: env.SITE_NAME,
      issuer: env.ISSUER || url.origin,
      user,
      qqEnabled: !!(env.QQ_APPID && env.QQ_APPKEY),
      githubEnabled: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      version: VERSION
    }));
  }

  if (pathname === '/docs') {
    return docsPage({ siteName: env.SITE_NAME, issuer: env.ISSUER || url.origin });
  }

  if (pathname === '/sdk.js') {
    return sdkScript(env.ISSUER || url.origin);
  }

  if (pathname === '/setup') {
    return handleSetup(request, env, store, url);
  }

  if (pathname === '/login') {
    if (user) return redirect(safeInternal(url.searchParams.get('redirect_uri')));
    if (method === 'GET') return renderLogin(request, env, store, url);
    if (method === 'POST') return doLogin(request, env, store, url);
  }

  if (pathname === '/register') {
    if (String(env.ALLOW_REGISTER) !== 'true') {
      return errorPage({ siteName: env.SITE_NAME, title: '注册已关闭', message: '管理员已关闭公开注册', status: 403 });
    }
    if (user) return redirect(safeInternal(url.searchParams.get('redirect_uri')));
    if (method === 'GET') return renderRegister(request, env, url);
    if (method === 'POST') return doRegister(request, env, store, url);
  }

  if (pathname === '/logout') {
    return doLogout(request, env, store, url, user);
  }

  if (pathname === '/profile') {
    if (!user) return redirect(`/login?redirect_uri=${encodeURIComponent(pathname)}`);
    const msg = url.searchParams.get('msg');
    const apps = await store.listUserApps(user.uid);
    return html(profilePage({ siteName: env.SITE_NAME, user, message: msg, apps }));
  }

  // 用户自主撤销对某个应用的授权
  if (pathname === '/profile/revoke-consent' && method === 'POST') {
    if (!user) return redirect('/login');
    const form = await request.formData().catch(() => null);
    const clientId = String(form?.get('client_id') || '');
    if (clientId) await store.revokeConsent(user.uid, clientId);
    return redirect('/profile?msg=' + encodeURIComponent('已撤销该应用的授权'));
  }

  if (pathname === '/profile/update' && method === 'POST') {
    if (!user) return redirect('/login');
    const form = await request.formData();
    await store.updateUser(user.uid, {
      nickname: String(form.get('nickname') || '').trim() || user.nickname,
      avatar: String(form.get('avatar') || '').trim() || null
    });
    return redirect('/profile?msg=' + encodeURIComponent('资料已保存'));
  }

  if (pathname === '/profile/unbind' && method === 'POST') {
    if (!user) return redirect('/login');
    const form = await request.formData();
    const provider = String(form.get('provider') || '');
    if (PROVIDERS[provider]) await store.unbindProvider(user.uid, provider);
    return redirect('/profile?msg=' + encodeURIComponent('已解绑'));
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!user) return redirect('/login?redirect_uri=' + encodeURIComponent(pathname));
    return handleAdmin(request, env, store, user, pathname);
  }

  /* ================= 轻量 JSON API ================= */

  if (pathname === '/api/me') {
    if (!user) return withCORS(json({ error: 'not_logged_in' }, 401));
    return withCORS(json({
      sub: user.uid,
      name: user.nickname,
      preferred_username: user.username,
      email: user.email,
      picture: user.avatar,
      providers: Object.keys(user.providers || {}),
      is_admin: !!user.is_admin
    }));
  }

  /* ================= 404 ================= */

  return errorPage({
    siteName: env.SITE_NAME,
    title: '页面不存在',
    message: `找不到 ${pathname}`,
    status: 404
  });
}

/* =========================================================
 *  登录 / 注册
 * ========================================================= */

async function renderLogin(request, env, store, url) {
  const redirectUri = safeInternal(url.searchParams.get('redirect_uri'), '/profile');
  const clientId = url.searchParams.get('client_id');
  const app = clientId ? await store.getApp(clientId) : null;

  return html(loginPage({
    siteName: env.SITE_NAME,
    error: url.searchParams.get('error'),
    redirectUri,
    app,
    allowRegister: String(env.ALLOW_REGISTER) === 'true',
    qqEnabled: !!(env.QQ_APPID && env.QQ_APPKEY),
    githubEnabled: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    version: VERSION
  }));
}

async function doLogin(request, env, store, url) {
  const form = await request.formData();
  const account = String(form.get('account') || '').trim();
  const password = String(form.get('password') || '');
  const target = safeInternal(form.get('redirect_uri'), '/profile');

  const back = (err) => {
    const u = new URL('/login', url.origin);
    u.searchParams.set('error', err);
    u.searchParams.set('redirect_uri', target);
    return redirect(u.toString(), 303);
  };

  if (!account || !password) return back('请输入账号和密码');

  const user = account.includes('@')
    ? await store.getUserByEmail(account)
    : await store.getUserByUsername(account);

  // 统一错误提示，避免账号枚举
  if (!user || !user.password_hash) return back('账号或密码错误');
  if (user.status && user.status !== 'active') return back('账号已被禁用');

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return back('账号或密码错误');

  return issueSession(request, env, store, user, target);
}

function renderRegister(request, env, url) {
  return html(registerPage({
    siteName: env.SITE_NAME,
    error: url.searchParams.get('error'),
    redirectUri: safeInternal(url.searchParams.get('redirect_uri'), '/profile'),
    qqEnabled: !!(env.QQ_APPID && env.QQ_APPKEY),
    githubEnabled: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
  }));
}

async function doRegister(request, env, store, url) {
  const form = await request.formData();
  const username = String(form.get('username') || '').trim();
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  const password2 = String(form.get('password2') || '');
  const target = safeInternal(form.get('redirect_uri'), '/profile');

  const back = (err) => {
    const u = new URL('/register', url.origin);
    u.searchParams.set('error', err);
    u.searchParams.set('redirect_uri', target);
    return redirect(u.toString(), 303);
  };

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return back('用户名需为 3-20 位字母、数字或下划线');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back('邮箱格式不正确');
  if (password.length < 6) return back('密码至少 6 位');
  if (password !== password2) return back('两次输入的密码不一致');

  if (await store.getUserByUsername(username)) return back('该用户名已被占用');
  if (await store.getUserByEmail(email)) return back('该邮箱已被注册');

  const user = await store.createUser({
    uid: randomId('u', 12),
    username, email,
    password_hash: await hashPassword(password),
    nickname: username
  });
  await store.addLog({ type: 'user.register', text: `新用户注册：${username}`, actor: user.uid });

  return issueSession(request, env, store, user, target);
}

/* =========================================================
 *  会话与登出
 * ========================================================= */

async function issueSession(request, env, store, user, target) {
  const ttl = parseInt(env.SESSION_TTL || '604800', 10);
  const sid = `sess_${randomToken(24)}`;
  await store.put(`sess:${sid}`, {
    sid, uid: user.uid, created_at: Date.now(),
    ua: request.headers.get('User-Agent'),
    ip: request.headers.get('CF-Connecting-IP')
  }, ttl);

  await store.updateUser(user.uid, { last_login_at: Date.now() });
  await store.bumpStat('logins', 1);
  await store.addLog({ type: 'auth.login', text: `${user.nickname || user.username} 登录成功`, actor: user.uid });

  const res = redirect(safeInternal(target), 303);
  return setSessionCookie(res, sid, ttl);
}

async function doLogout(request, env, store, url, user) {
  const sid = getCookie(request, SESSION_COOKIE);
  if (sid) await store.destroySession(sid);

  const backTo = url.searchParams.get('post_logout_redirect_uri');
  const target = backTo && /^https?:\/\//i.test(backTo) ? backTo : '/';
  const res = redirect(target, 302);
  return clearSessionCookie(res);
}

/* =========================================================
 *  授权同意页提交
 * ========================================================= */

async function handleDecision(request, env, store) {
  const form = await request.formData();
  const decision = form.get('decision');

  const clientId = String(form.get('client_id') || '');
  const redirectUri = String(form.get('redirect_uri') || '');
  const state = form.get('state') ? String(form.get('state')) : null;
  const scopeStr = String(form.get('scope') || DEFAULT_SCOPES.join(' '));
  const codeChallenge = form.get('code_challenge') ? String(form.get('code_challenge')) : null;
  const codeChallengeMethod = String(form.get('code_challenge_method') || 'S256');
  const nonce = form.get('nonce') ? String(form.get('nonce')) : null;

  const app = await store.getApp(clientId);
  if (!app) return errorPage({ siteName: env.SITE_NAME, title: '应用不存在', message: 'client_id 无效', status: 400 });
  if (!app.redirect_uris?.includes(redirectUri)) {
    return errorPage({ siteName: env.SITE_NAME, title: '回调地址不匹配', message: 'redirect_uri 无效', status: 400 });
  }

  // 拒绝授权
  if (decision !== 'allow') {
    const u = new URL(redirectUri);
    u.searchParams.set('error', 'access_denied');
    u.searchParams.set('error_description', '用户拒绝了授权请求');
    if (state) u.searchParams.set('state', state);
    return redirect(u.toString(), 302);
  }

  const user = await getCurrentUser(request, store);
  if (!user) return redirect('/login?redirect_uri=' + encodeURIComponent('/profile'));

  const scopes = normalizeScopes(scopeStr);

  // 记住同意，下次同应用同 scope 直接跳过确认页
  await store.put(`consent:${user.uid}:${clientId}`, {
    scopes, granted_at: Date.now(), client_id: clientId
  });

  const code = randomToken(32);
  await store.saveAuthCode(code, {
    client_id: clientId,
    uid: user.uid,
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallenge ? codeChallengeMethod : null,
    nonce,
    created_at: Date.now()
  });

  const u = new URL(redirectUri);
  u.searchParams.set('code', code);
  if (state) u.searchParams.set('state', state);
  return redirect(u.toString(), 302);
}

/* =========================================================
 *  第三方登录
 * ========================================================= */

async function startProvider(request, env, store, url, providerKey) {
  const provider = PROVIDERS[providerKey];
  if (!provider) return errorPage({ siteName: env.SITE_NAME, title: '登录方式不存在', message: providerKey, status: 404 });

  const enabled = providerKey === 'qq'
    ? !!(env.QQ_APPID && env.QQ_APPKEY)
    : !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  if (!enabled) {
    return errorPage({
      siteName: env.SITE_NAME, title: '未启用',
      message: `${provider.name} 登录尚未配置，请在 Cloudflare 后台设置对应密钥`, status: 503
    });
  }

  const backTo = safeInternal(url.searchParams.get('redirect_uri'), '/profile');
  const bind = url.searchParams.get('bind') === '1';
  const state = newState();

  await store.savePendingState(state, {
    provider: providerKey,
    back_to: backTo,
    bind,
    uid: (await getCurrentUser(request, store))?.uid || null
  });

  const callback = `${env.ISSUER || url.origin}/api/connect/${providerKey}/callback`;
  let target;
  try {
    target = await provider.getLoginUrl(env, callback, state);
  } catch (e) {
    return errorPage({ siteName: env.SITE_NAME, title: `${provider.name} 登录不可用`, message: e.message, status: 502 });
  }

  return redirect(target, 302);
}

async function finishProvider(request, env, store, url, providerKey) {
  const provider = PROVIDERS[providerKey];
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const fail = (title, message) =>
    errorPage({ siteName: env.SITE_NAME, title, message, status: 400 });

  if (errorParam) return fail(`${provider.name} 登录失败`, url.searchParams.get('error_description') || errorParam);
  if (!code) return fail('缺少参数', '未收到授权 code');

  // 校验 state，防 CSRF
  const pending = state ? await store.takePendingState(state) : null;
  if (!pending || pending.provider !== providerKey) {
    return fail('状态校验失败', '登录状态已过期或被篡改，请重新发起登录');
  }

  let info;
  try {
    info = await provider.handleCallback(env, code);
  } catch (e) {
    return fail(`${provider.name} 登录失败`, e.message);
  }

  const current = await getCurrentUser(request, store);

  /* ---- 场景 A：已登录 → 绑定第三方账号 ---- */
  if (pending.bind || current) {
    if (!current) return redirect('/login?redirect_uri=/profile');

    const exist = await store.getUserByProvider(providerKey, info.id);
    if (exist && exist.uid !== current.uid) {
      return fail('绑定失败', `该 ${provider.name} 账号已绑定到其他用户`);
    }
    await store.bindProvider(current.uid, providerKey, providerKey === 'qq'
      ? { social_uid: info.id, nickname: info.nickname, faceimg: info.avatar, access_token: info.access_token }
      : { id: info.id, login: info.login, avatar_url: info.avatar, access_token: info.access_token });

    if (!current.avatar) await store.updateUser(current.uid, { avatar: info.avatar });
    return redirect('/profile?msg=' + encodeURIComponent(`${provider.name} 绑定成功`));
  }

  /* ---- 场景 B：未登录 → 登录或自动注册 ---- */
  let user = await store.getUserByProvider(providerKey, info.id);

  if (!user) {
    if (String(env.ALLOW_REGISTER) !== 'true') {
      return fail('注册已关闭', '该第三方账号尚未注册，且当前未开放注册');
    }
    // 邮箱冲突时关联到同一账号（GitHub 可能返回已注册邮箱）
    if (info.email && providerKey === 'github') {
      user = await store.getUserByEmail(info.email);
      if (user) {
        await store.bindProvider(user.uid, 'github', {
          id: info.id, login: info.login, avatar_url: info.avatar, access_token: info.access_token
        });
      }
    }

    if (!user) {
      let base = `${providerKey}${info.id}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 14).toLowerCase();
      if (await store.getUserByUsername(base)) base = `${base}${Math.random().toString(36).slice(2, 6)}`;

      user = await store.createUser({
        uid: randomId('u', 12),
        username: base,
        email: info.email || null,
        nickname: info.nickname,
        avatar: info.avatar,
        gender: info.gender || null,
        location: info.location || null,
        providers: {
          [providerKey]: providerKey === 'qq'
            ? { social_uid: info.id, nickname: info.nickname, faceimg: info.avatar, access_token: info.access_token, bound_at: Date.now() }
            : { id: info.id, login: info.login, avatar_url: info.avatar, access_token: info.access_token, bound_at: Date.now() }
        }
      });
    }
  } else {
    // 已存在：同步最新资料
    await store.updateUser(user.uid, {
      avatar: user.avatar || info.avatar,
      nickname: user.nickname || info.nickname
    });
  }

  return issueSession(request, env, store, user, pending.back_to || '/profile');
}

/* =========================================================
 *  动态客户端注册（RFC 7591）
 * ========================================================= */

async function dynamicRegister(request, env, store) {
  let body = {};
  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) body = await request.json().catch(() => ({}));
  else body = Object.fromEntries(new URLSearchParams(await request.text()));

  const name = String(body.client_name || '').trim();
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris
    : String(body.redirect_uris || '').split(/[\s,]+/).filter(Boolean);

  if (!name) return json({ error: 'invalid_client_metadata', error_description: '缺少 client_name' }, 400);
  if (!uris.length) return json({ error: 'invalid_client_metadata', error_description: '缺少 redirect_uris' }, 400);

  const client_id = randomId('mzy', 12);
  const client_secret = `cs_${randomToken(24)}`;

  await store.createApp({
    client_id, client_secret, name,
    homepage: body.client_uri || null,
    redirect_uris: uris,
    scopes: body.scope ? normalizeScopes(body.scope) : [...DEFAULT_SCOPES],
    allow_client_credentials: false,
    token_endpoint_auth_method: 'client_secret_post',
    created_at: Date.now(),
    updated_at: Date.now(),
    owner: null
  });

  return json({
    client_id, client_secret,
    client_name: name,
    redirect_uris: uris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0
  }, 201);
}

/* =========================================================
 *  初始化：创建首个管理员
 * ========================================================= */

async function handleSetup(request, env, store, url) {
  const count = await store.countUsers();
  if (count > 0) {
    return errorPage({
      siteName: env.SITE_NAME, title: '已初始化',
      message: '管理员账号已存在，请直接登录', status: 403
    });
  }

  if (request.method === 'GET') {
    const { setupPage } = await import('./ui.js');
    return html(setupPage({
      siteName: env.SITE_NAME,
      error: url.searchParams.get('error'),
      version: VERSION
    }));
  }

  // POST
  const form = await request.formData();
  const username = String(form.get('username') || '').trim();
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  const password2 = String(form.get('password2') || '');

  const back = (err) => redirect(`/setup?error=${encodeURIComponent(err)}`, 303);

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return back('用户名需为 3-20 位字母、数字或下划线');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back('邮箱格式不正确');
  if (password.length < 6) return back('密码至少 6 位');
  if (password !== password2) return back('两次输入的密码不一致');

  // 记录实例首次启动时间，用于系统状态页展示运行时长
  const stats = await store.getStats();
  if (!stats.first_boot_at) await store.put('stats', { ...stats, first_boot_at: Date.now() });

  const user = await store.createUser({
    uid: randomId('u', 12),
    username, email,
    password_hash: await hashPassword(password),
    nickname: username,
    is_admin: true
  });
  await store.addLog({
    type: 'system.init',
    text: `实例初始化完成，管理员账号 ${username} 已创建`,
    actor: user.uid
  });

  return issueSession(request, env, store, user, '/admin');
}
