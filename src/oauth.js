/**
 * OAuth 2.0 授权服务器 + OpenID Connect（OIDC）核心实现
 *
 * 支持的端点（由 index.js 挂载路由）：
 *   GET  /oauth/authorize           授权端点（授权码模式 + PKCE）
 *   POST /oauth/token               令牌端点（authorization_code / refresh_token / client_credentials）
 *   GET|POST /oauth/userinfo        用户信息端点
 *   POST /oauth/introspect          令牌内省（RFC 7662）
 *   POST /oauth/revoke              令牌撤销（RFC 7009）
 *   GET  /.well-known/openid-configuration   OIDC 发现
 *   GET  /.well-known/jwks.json              签名公钥（HS256 场景不暴露密钥）
 */

import { randomToken, randomId, signJWT, verifyCodeChallenge } from './crypto.js';
import { consentPage } from './ui.js';

/** 系统支持的 scope 及其含义 */
export const SCOPE_DEFINITIONS = {
  openid: '启用 OpenID Connect，返回 id_token',
  profile: '用户昵称、头像、性别、地区等基本资料',
  email: '用户邮箱地址',
  uid: '用户在 SSO 中的唯一 ID',
  username: '用户名',
  groups: '用户所属分组'
};

export const DEFAULT_SCOPES = ['openid', 'profile', 'email'];

export function normalizeScopes(scopeStr) {
  if (!scopeStr) return [...DEFAULT_SCOPES];
  const parts = String(scopeStr).split(/[\s,]+/).filter(Boolean);
  return [...new Set(parts)].filter(s => s in SCOPE_DEFINITIONS);
}

/* ---------------- 通用响应工具 ---------------- */

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      ...headers
    }
  });
}

function oauthError(code, description, status = 400) {
  return json({ error: code, error_description: description }, status);
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' }
  });
}

/** 从请求中解析 client_id / client_secret（支持 Basic 与表单两种方式，遵循 RFC 6749） */
function parseClientCredentials(request, body) {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const i = decoded.indexOf(':');
      if (i > -1) {
        return {
          client_id: decodeURIComponent(decoded.slice(0, i)),
          client_secret: decodeURIComponent(decoded.slice(i + 1))
        };
      }
    } catch { /* 继续走表单解析 */ }
  }
  return {
    client_id: body?.client_id,
    client_secret: body?.client_secret
  };
}

/* =========================================================
 *  1. 授权端点  GET /oauth/authorize
 * ========================================================= */

export async function handleAuthorize(request, env, store, ctx) {
  const url = new URL(request.url);
  const p = url.searchParams;

  const clientId    = p.get('client_id');
  const redirectUri = p.get('redirect_uri');
  const responseType = p.get('response_type') || 'code';
  const scopeStr    = p.get('scope') || DEFAULT_SCOPES.join(' ');
  const state       = p.get('state');
  const codeChallenge = p.get('code_challenge');
  const codeChallengeMethod = p.get('code_challenge_method') || 'S256';
  const prompt      = p.get('prompt');
  const nonce       = p.get('nonce');

  const fail = (err, desc) => {
    // 参数错误且 redirect_uri 未校验通过时，不能回跳，直接渲染错误页
    return json({ error: err, error_description: desc }, 400);
  };

  if (!clientId) return fail('invalid_request', '缺少 client_id');
  if (!redirectUri) return fail('invalid_request', '缺少 redirect_uri');

  const app = await store.getApp(clientId);
  if (!app) return fail('invalid_client', 'client_id 不存在');

  // 校验 redirect_uri：必须在应用白名单内且完全一致
  if (!app.redirect_uris?.includes(redirectUri)) {
    return fail('invalid_request', 'redirect_uri 与该应用注册的地址不匹配');
  }

  if (responseType !== 'code') {
    return redirectWithError(redirectUri, 'unsupported_response_type', '仅支持 response_type=code', state);
  }

  const scopes = normalizeScopes(scopeStr);
  if (scopes.length === 0) {
    return redirectWithError(redirectUri, 'invalid_scope', '请求的 scope 无效', state);
  }

  // PKCE 校验：只支持 S256 与 plain
  if (codeChallenge && !['S256', 'plain'].includes(codeChallengeMethod)) {
    return redirectWithError(redirectUri, 'invalid_request', 'code_challenge_method 仅支持 S256 或 plain', state);
  }

  // 取当前登录用户
  const user = await getCurrentUser(request, store);
  if (!user) {
    // 未登录 → 跳登录页，登录后自动回到这里继续授权
    const loginUrl = new URL('/login', url.origin);
    const back = new URL(url.origin + url.pathname);
    p.forEach((v, k) => back.searchParams.set(k, v));
    loginUrl.searchParams.set('redirect_uri', back.toString());
    return Response.redirect(loginUrl.toString(), 302);
  }

  // prompt=none 且未登录 → 返回 login_required（OIDC 规范）
  if (prompt === 'none' && !user) {
    return redirectWithError(redirectUri, 'login_required', '用户未登录', state);
  }

  // 该用户此前是否已授权过此应用：已授权且 scope 未扩大则跳过同意页
  const granted = await store.get(`consent:${user.uid}:${clientId}`);
  const grantedScopes = granted?.scopes || [];
  const needConsent = prompt === 'consent' || !granted ||
    !scopes.every(s => grantedScopes.includes(s));

  if (needConsent && prompt !== 'none') {
    return htmlResponse(consentPage({
      siteName: env.SITE_NAME,
      app, user, scopes,
      params: {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        state: state || '',
        code_challenge: codeChallenge || '',
        code_challenge_method: codeChallenge ? codeChallengeMethod : '',
        nonce: nonce || ''
      }
    }));
  }

  return issueCodeAndRedirect({
    store, app, user, scopes, redirectUri, state, codeChallenge, codeChallengeMethod, nonce, env
  });
}

async function issueCodeAndRedirect({ store, app, user, scopes, redirectUri, state, codeChallenge, codeChallengeMethod, nonce, env }) {
  const code = randomToken(32);
  await store.saveAuthCode(code, {
    client_id: app.client_id,
    uid: user.uid,
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge: codeChallenge || null,
    code_challenge_method: codeChallenge ? codeChallengeMethod : null,
    nonce: nonce || null,
    created_at: Date.now()
  });

  const target = new URL(redirectUri);
  target.searchParams.set('code', code);
  if (state) target.searchParams.set('state', state);
  return Response.redirect(target.toString(), 302);
}

function redirectWithError(redirectUri, error, description, state) {
  try {
    const u = new URL(redirectUri);
    u.searchParams.set('error', error);
    u.searchParams.set('error_description', description);
    if (state) u.searchParams.set('state', state);
    return Response.redirect(u.toString(), 302);
  } catch {
    return oauthError(error, description);
  }
}

/* =========================================================
 *  2. 令牌端点  POST /oauth/token
 * ========================================================= */

export async function handleToken(request, env, store) {
  let body = {};
  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else {
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  }

  const grantType = body.grant_type;
  const { client_id, client_secret } = parseClientCredentials(request, body);

  if (!grantType) return oauthError('invalid_request', '缺少 grant_type');

  /* ---- 授权码模式 ---- */
  if (grantType === 'authorization_code') {
    const code = body.code;
    const redirectUri = body.redirect_uri;
    const codeVerifier = body.code_verifier;

    if (!code) return oauthError('invalid_request', '缺少 code');
    if (!client_id) return oauthError('invalid_client', '缺少 client_id');

    const app = await store.getApp(client_id);
    if (!app) return oauthError('invalid_client', 'client_id 不存在');

    // 公开客户端（无 secret，靠 PKCE）；机密客户端必须校验 secret
    const isPublic = app.token_endpoint_auth_method === 'none';
    if (!isPublic) {
      if (!client_secret || client_secret !== app.client_secret) {
        return oauthError('invalid_client', 'client_secret 不正确');
      }
    }

    const rec = await store.takeAuthCode(code);
    if (!rec) return oauthError('invalid_grant', 'code 无效、已使用或已过期');
    if (rec.client_id !== client_id) return oauthError('invalid_grant', 'code 与 client_id 不匹配');
    if (redirectUri && redirectUri !== rec.redirect_uri) {
      return oauthError('invalid_grant', 'redirect_uri 与授权请求不一致');
    }

    // PKCE 校验
    if (rec.code_challenge) {
      if (!codeVerifier) return oauthError('invalid_grant', '缺少 code_verifier');
      const ok = await verifyCodeChallenge(codeVerifier, rec.code_challenge, rec.code_challenge_method);
      if (!ok) return oauthError('invalid_grant', 'PKCE 校验失败');
    } else if (isPublic) {
      return oauthError('invalid_grant', '公开客户端必须使用 PKCE');
    }

    return issueTokens({ store, env, app, uid: rec.uid, scopes: rec.scope, nonce: rec.nonce });
  }

  /* ---- 刷新令牌 ---- */
  if (grantType === 'refresh_token') {
    const rt = body.refresh_token;
    if (!rt) return oauthError('invalid_request', '缺少 refresh_token');
    if (!client_id) return oauthError('invalid_client', '缺少 client_id');

    const app = await store.getApp(client_id);
    if (!app) return oauthError('invalid_client', 'client_id 不存在');

    const isPublic = app.token_endpoint_auth_method === 'none';
    if (!isPublic && (!client_secret || client_secret !== app.client_secret)) {
      return oauthError('invalid_client', 'client_secret 不正确');
    }

    const rec = await store.getRefreshToken(rt);
    if (!rec) return oauthError('invalid_grant', 'refresh_token 无效或已过期');
    if (rec.client_id !== client_id) return oauthError('invalid_grant', 'refresh_token 与 client_id 不匹配');

    // 轮换 refresh_token（RFC 6819 推荐做法）
    await store.del(`refresh:${rt}`);
    return issueTokens({ store, env, app, uid: rec.uid, scopes: rec.scope });
  }

  /* ---- 客户端凭证模式（服务端对服务端） ---- */
  if (grantType === 'client_credentials') {
    if (!client_id || !client_secret) return oauthError('invalid_client', '缺少客户端凭证');
    const app = await store.getApp(client_id);
    if (!app) return oauthError('invalid_client', 'client_id 不存在');
    if (client_secret !== app.client_secret) return oauthError('invalid_client', 'client_secret 不正确');
    if (!app.allow_client_credentials) {
      return oauthError('unauthorized_client', '该应用未开启 client_credentials 模式');
    }
    return issueTokens({ store, env, app, uid: null, scopes: body.scope ? normalizeScopes(body.scope) : ['openid'] });
  }

  return oauthError('unsupported_grant_type', `不支持的 grant_type: ${grantType}`);
}

async function issueTokens({ store, env, app, uid, scopes, nonce }) {
  const accessToken = `mzy_at_${randomToken(32)}`;
  const refreshToken = `mzy_rt_${randomToken(32)}`;
  const now = Math.floor(Date.now() / 1000);
  const atTtl = parseInt(env.ACCESS_TOKEN_TTL || '7200', 10);
  const rtTtl = parseInt(env.REFRESH_TOKEN_TTL || '2592000', 10);

  const record = {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    client_id: app.client_id,
    uid,
    scope: scopes,
    issued_at: now,
    expires_at: now + atTtl,
    refresh_expires_at: now + rtTtl
  };
  await store.saveToken(record);

  const out = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: atTtl,
    refresh_token: refreshToken,
    scope: scopes.join(' ')
  };

  // OIDC：请求了 openid 则附加 id_token
  if (scopes.includes('openid')) {
    const user = uid ? await store.getUser(uid) : null;
    const claims = {
      iss: env.ISSUER,
      sub: uid || `client:${app.client_id}`,
      aud: app.client_id,
      exp: now + atTtl,
      iat: now,
      nonce: nonce || undefined
    };
    if (user) {
      if (scopes.includes('profile')) {
        claims.name = user.nickname;
        claims.nickname = user.nickname;
        claims.picture = user.avatar;
        claims.gender = user.gender;
        claims.locale = user.location;
        claims.profile = `${env.ISSUER}/u/${user.uid}`;
      }
      if (scopes.includes('email')) {
        claims.email = user.email;
        claims.email_verified = !!user.email_verified;
      }
      if (scopes.includes('username')) claims.preferred_username = user.username || user.nickname;
    }
    out.id_token = await signJWT(claims, env.JWT_SECRET, atTtl);
  }

  await store.bumpStat('tokens', 1);
  return json(out);
}

/* =========================================================
 *  3. 用户信息  GET /oauth/userinfo
 * ========================================================= */

export async function handleUserinfo(request, env, store) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return json({ error: 'invalid_token', error_description: '缺少 Bearer 令牌' }, 401, {
      'WWW-Authenticate': 'Bearer realm="mzy-sso"'
    });
  }

  const rec = await store.getToken(token);
  if (!rec) {
    return json({ error: 'invalid_token', error_description: '令牌无效或已过期' }, 401, {
      'WWW-Authenticate': 'Bearer realm="mzy-sso", error="invalid_token"'
    });
  }
  if (rec.expires_at && rec.expires_at < Math.floor(Date.now() / 1000)) {
    return json({ error: 'invalid_token', error_description: '令牌已过期' }, 401, {
      'WWW-Authenticate': 'Bearer realm="mzy-sso", error="expired_token"'
    });
  }

  const user = rec.uid ? await store.getUser(rec.uid) : null;
  if (!user) {
    return json({ error: 'invalid_token', error_description: '用户不存在' }, 401);
  }

  const scopes = rec.scope || [];
  const info = { sub: user.uid };
  if (scopes.includes('profile') || scopes.includes('openid')) {
    info.name = user.nickname;
    info.nickname = user.nickname;
    info.picture = user.avatar;
    info.gender = user.gender;
    info.locale = user.location;
    info.profile = `${env.ISSUER}/u/${user.uid}`;
    info.providers = Object.keys(user.providers || {});
    info.updated_at = user.updated_at;
  }
  if (scopes.includes('email')) {
    info.email = user.email;
    info.email_verified = !!user.email_verified;
  }
  if (scopes.includes('username')) info.preferred_username = user.username;
  if (scopes.includes('uid')) info.uid = user.uid;
  if (scopes.includes('groups')) info.groups = user.is_admin ? ['admin'] : ['user'];

  return json(info);
}

/* =========================================================
 *  4. 令牌内省  POST /oauth/introspect（RFC 7662）
 * ========================================================= */

export async function handleIntrospect(request, env, store) {
  let body = {};
  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) body = await request.json().catch(() => ({}));
  else body = Object.fromEntries(new URLSearchParams(await request.text()));

  const { client_id, client_secret } = parseClientCredentials(request, body);
  const app = await store.getApp(client_id);
  if (!app || app.client_secret !== client_secret) {
    return oauthError('invalid_client', '客户端认证失败');
  }

  const token = body.token;
  if (!token) return oauthError('invalid_request', '缺少 token');

  const rec = await store.getToken(token);
  const now = Math.floor(Date.now() / 1000);
  if (!rec || (rec.expires_at && rec.expires_at < now)) {
    return json({ active: false });
  }

  const user = rec.uid ? await store.getUser(rec.uid) : null;
  return json({
    active: true,
    scope: (rec.scope || []).join(' '),
    client_id: rec.client_id,
    token_type: 'Bearer',
    exp: rec.expires_at,
    iat: rec.issued_at,
    sub: rec.uid,
    username: user?.username || null,
    username_value: user?.nickname || null
  });
}

/* =========================================================
 *  5. 令牌撤销  POST /oauth/revoke（RFC 7009）
 * ========================================================= */

export async function handleRevoke(request, env, store) {
  let body = {};
  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) body = await request.json().catch(() => ({}));
  else body = Object.fromEntries(new URLSearchParams(await request.text()));

  const { client_id, client_secret } = parseClientCredentials(request, body);
  const app = await store.getApp(client_id);
  if (!app || app.client_secret !== client_secret) {
    return oauthError('invalid_client', '客户端认证失败');
  }

  const token = body.token;
  if (token) await store.deleteToken(token);

  // RFC 7009：无论令牌是否存在都返回 200
  return new Response('', { status: 200 });
}

/* =========================================================
 *  6. OIDC 发现文档 & JWKS
 * ========================================================= */

export function openidConfiguration(env, origin) {
  const issuer = env.ISSUER || origin;
  return json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    introspection_endpoint: `${issuer}/oauth/introspect`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    end_session_endpoint: `${issuer}/logout`,
    registration_endpoint: `${issuer}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    scopes_supported: Object.keys(SCOPE_DEFINITIONS),
    claims_supported: [
      'sub', 'name', 'nickname', 'preferred_username', 'picture', 'email',
      'email_verified', 'gender', 'locale', 'profile', 'groups', 'providers', 'updated_at'
    ],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none']
  });
}

export function jwksDocument() {
  // 使用 HS256（对称签名），不公开密钥。此处返回空密钥集以符合 OIDC 发现格式。
  return json({ keys: [] });
}

/* =========================================================
 *  辅助：从 Cookie 取当前登录用户
 * ========================================================= */

export async function getCurrentUser(request, store) {
  const sid = getCookie(request, 'mzy_sid');
  if (!sid) return null;
  const sess = await store.getSession(sid);
  if (!sess) return null;
  return store.getUser(sess.uid);
}

export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export { json, oauthError };
