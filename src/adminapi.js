/**
 * 管理 API（REST / JSON）
 *
 * 面向 AI 助手与自动化脚本：用令牌代替后台点击，完成建应用、改配置、
 * 重置密钥、撤销令牌等操作，便于「AI 帮我对接」这类场景自动化执行。
 *
 * 鉴权：Authorization: Bearer <ADMIN_API_TOKEN>（或 X-Admin-Token 头）
 * 未设置 ADMIN_API_TOKEN 时整套接口返回 404（默认关闭，fail-closed）。
 */

import { randomId, randomToken, timingSafeEqual } from './crypto.js';
import { normalizeScopes, DEFAULT_SCOPES } from './oauth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Admin-Token',
  'Access-Control-Allow-Credentials': 'false'
};

function ok(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=UTF-8', ...CORS_HEADERS }
  });
}

function fail(code, description, status = 400) {
  return ok({ error: code, error_description: description }, status);
}

/** 返回 'ok' | 'disabled' | 'missing' | 'bad' */
function checkAuth(request, env) {
  const expected = env.ADMIN_API_TOKEN;
  if (!expected) return 'disabled';

  let given = '';
  const auth = request.headers.get('Authorization') || '';
  if (/^bearer\s+/i.test(auth)) given = auth.replace(/^bearer\s+/i, '').trim();
  if (!given) given = (request.headers.get('X-Admin-Token') || '').trim();
  if (!given) return 'missing';

  return timingSafeEqual(given, expected) ? 'ok' : 'bad';
}

/** 解析请求体，同时支持 JSON 与表单 */
async function readBody(request) {
  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) {
    return await request.json().catch(() => ({}));
  }
  const text = await request.text();
  if (!text) return {};
  return Object.fromEntries(new URLSearchParams(text));
}

/** 把 redirect_uris 统一成数组：支持数组、JSON 字符串、换行/空格分隔 */
function parseUris(v) {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[')) {
      try { return JSON.parse(s).map(String).map(x => x.trim()).filter(Boolean); } catch { /* fallthrough */ }
    }
    return s.split(/[\s,]+/).filter(Boolean);
  }
  return [];
}

function parseScopes(v) {
  if (Array.isArray(v)) return normalizeScopes(v.join(' '));
  if (typeof v === 'string') return normalizeScopes(v);
  return [...DEFAULT_SCOPES];
}

/** 掩码展示密钥，避免列表接口泄露全文 */
function maskSecret(secret) {
  if (!secret) return null;
  return secret.slice(0, 3) + '...' + secret.slice(-4);
}

/** 对外输出应用，默认不带 client_secret */
function publicApp(app, { withSecret = false } = {}) {
  const { client_secret, ...rest } = app;
  const out = { ...rest, client_secret_hint: maskSecret(client_secret) };
  if (withSecret) out.client_secret = client_secret;
  return out;
}

function publicUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

/* =========================================================
 *  路由入口
 * ========================================================= */

export async function handleAdminApi(request, env, store, url, pathname) {
  const method = request.method;

  // 未配置令牌 => 整套管理 API 视为不存在（不泄露接口是否存在）
  if (!env.ADMIN_API_TOKEN) {
    return ok({ error: 'not_found', error_description: 'Not Found' }, 404);
  }

  const auth = checkAuth(request, env);
  if (auth === 'missing') {
    return new Response(JSON.stringify({
      error: 'unauthorized',
      error_description: '缺少管理令牌：请带 Authorization: Bearer <ADMIN_API_TOKEN>'
    }, null, 2), {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'WWW-Authenticate': 'Bearer realm="mzy-sso-admin"',
        ...CORS_HEADERS
      }
    });
  }
  if (auth === 'bad') {
    return fail('invalid_token', '管理令牌不正确', 401);
  }

  /* ---------- 索引 / 能力探测 ---------- */

  if (pathname === '/api/admin' || pathname === '/api/admin/') {
    return ok({
      service: env.SITE_NAME || 'MZY SSO',
      issuer: env.ISSUER || url.origin,
      admin_api: true,
      endpoints: {
        apps: '/api/admin/apps',
        users: '/api/admin/users',
        tokens: '/api/admin/tokens',
        stats: '/api/admin/stats',
        logs: '/api/admin/logs'
      },
      docs: {
        llms: `${url.origin}/llms.txt`,
        llms_full: `${url.origin}/llms-full.txt`,
        openapi: `${url.origin}/openapi.json`,
        human: `${url.origin}/docs`
      }
    });
  }

  /* ---------- 应用（Client）管理 ---------- */

  if (pathname === '/api/admin/apps') {
    if (method === 'GET') {
      const apps = await store.listApps();
      return ok({ total: apps.length, apps: apps.map(a => publicApp(a)) });
    }

    if (method === 'POST') {
      const body = await readBody(request);
      const name = String(body.name || body.client_name || '').trim();
      const uris = parseUris(body.redirect_uris);

      if (!name) return fail('invalid_request', '缺少应用名称 name');
      if (!uris.length) return fail('invalid_request', '缺少回调地址 redirect_uris（数组或换行分隔字符串）');

      for (const u of uris) {
        if (!/^https?:\/\//i.test(u)) {
          return fail('invalid_request', `回调地址必须是 http/https 绝对地址：${u}`);
        }
      }

      const client_id = randomId('mzy', 12);
      const client_secret = `cs_${randomToken(24)}`;
      const app = await store.createApp({
        client_id,
        client_secret,
        name,
        homepage: body.homepage || body.client_uri || null,
        redirect_uris: uris,
        scopes: parseScopes(body.scopes || body.scope),
        allow_client_credentials: false,
        token_endpoint_auth_method: 'client_secret_post',
        created_at: Date.now(),
        updated_at: Date.now(),
        owner: null,
        created_via: 'admin_api'
      });
      await store.addLog({ type: 'app.create', text: `通过管理 API 创建应用「${name}」`, actor: 'admin_api' });

      return ok({ ...publicApp(app, { withSecret: true }), note: 'client_secret 仅此次返回，请立即保存' }, 201);
    }

    return fail('method_not_allowed', '仅支持 GET / POST', 405);
  }

  // /api/admin/apps/{id} 与 /api/admin/apps/{id}/reset-secret
  const appMatch = pathname.match(/^\/api\/admin\/apps\/([^/]+)(\/reset-secret)?$/);
  if (appMatch) {
    const clientId = decodeURIComponent(appMatch[1]);
    const isReset = appMatch[2] === '/reset-secret';
    const app = await store.getApp(clientId);
    if (!app) return fail('not_found', '应用不存在', 404);

    if (isReset) {
      if (method !== 'POST') return fail('method_not_allowed', '重置密钥请用 POST', 405);
      const client_secret = `cs_${randomToken(24)}`;
      await store.updateApp(clientId, { client_secret });
      const revoked = await store.revokeTokensByClient(clientId);
      await store.addLog({
        type: 'app.reset_secret',
        text: `管理 API 重置应用「${app.name}」密钥，撤销令牌 ${revoked} 个`,
        actor: 'admin_api'
      });
      const fresh = await store.getApp(clientId);
      return ok({
        ...publicApp(fresh, { withSecret: true }),
        revoked_tokens: revoked,
        note: '新 client_secret 仅此次返回；旧密钥与该应用下已签发令牌均已失效'
      });
    }

    if (method === 'GET') {
      return ok(publicApp(app));
    }

    if (method === 'PATCH' || method === 'PUT') {
      const body = await readBody(request);
      const patch = { updated_at: Date.now() };

      if (body.name !== undefined) {
        const n = String(body.name).trim();
        if (!n) return fail('invalid_request', '应用名称不能为空');
        patch.name = n;
      }
      if (body.homepage !== undefined) patch.homepage = String(body.homepage).trim() || null;

      if (body.redirect_uris !== undefined) {
        const uris = parseUris(body.redirect_uris);
        if (!uris.length) return fail('invalid_request', 'redirect_uris 不能为空');
        for (const u of uris) {
          if (!/^https?:\/\//i.test(u)) {
            return fail('invalid_request', `回调地址必须是 http/https 绝对地址：${u}`);
          }
        }
        patch.redirect_uris = uris;
      }
      if (body.scopes !== undefined) patch.scopes = parseScopes(body.scopes);

      const next = await store.updateApp(clientId, patch);
      await store.addLog({ type: 'app.update', text: `管理 API 更新应用「${next.name}」配置`, actor: 'admin_api' });
      return ok(publicApp(next));
    }

    if (method === 'DELETE') {
      await store.deleteApp(clientId);
      const revoked = await store.revokeTokensByClient(clientId);

      // 清理所有用户对该应用的授权记录
      let consents = 0;
      const res = await store.kv.list({ prefix: 'consent:', limit: 1000 });
      for (const k of res.keys) {
        if (k.name.endsWith(`:${clientId}`)) {
          await store.del(k.name);
          consents++;
        }
      }
      await store.addLog({
        type: 'app.delete',
        text: `管理 API 删除应用「${app.name}」，撤销令牌 ${revoked} 个、授权 ${consents} 条`,
        actor: 'admin_api'
      });
      return ok({ deleted: true, client_id: clientId, revoked_tokens: revoked, revoked_consents: consents });
    }

    return fail('method_not_allowed', '仅支持 GET / PATCH / PUT / DELETE', 405);
  }

  /* ---------- 用户 ---------- */

  if (pathname === '/api/admin/users') {
    if (method !== 'GET') return fail('method_not_allowed', '仅支持 GET', 405);
    const users = await store.listUsers(500);
    return ok({ total: users.length, users: users.map(publicUser) });
  }

  /* ---------- 令牌 ---------- */

  if (pathname === '/api/admin/tokens') {
    if (method !== 'GET') return fail('method_not_allowed', '仅支持 GET', 405);
    const tokens = await store.listTokens(500);
    return ok({ total: tokens.length, tokens });
  }

  if (pathname === '/api/admin/tokens/revoke') {
    if (method !== 'POST') return fail('method_not_allowed', '仅支持 POST', 405);
    const body = await readBody(request);
    const token = String(body.token || '').trim();
    if (!token) return fail('invalid_request', '缺少要撤销的 token');

    const rec = await store.getToken(token);
    if (rec) await store.deleteToken(token);
    await store.addLog({ type: 'token.revoke', text: '管理 API 撤销了一个访问令牌', actor: 'admin_api' });
    return ok({ revoked: !!rec, note: rec ? '令牌已撤销' : '令牌不存在或已失效' });
  }

  /* ---------- 统计与日志 ---------- */

  if (pathname === '/api/admin/stats') {
    if (method !== 'GET') return fail('method_not_allowed', '仅支持 GET', 405);
    const stats = await store.getStats();
    const users = await store.countUsers();
    const apps = await store.listApps();
    const tokens = await store.listTokens(1000);
    return ok({
      stats,
      counts: { users, apps: apps.length, active_tokens: tokens.length },
      config: {
        site_name: env.SITE_NAME,
        issuer: env.ISSUER || url.origin,
        allow_register: String(env.ALLOW_REGISTER) === 'true',
        allow_app_register: String(env.ALLOW_APP_REGISTER) === 'true',
        login_methods: {
          password: true,
          qq: !!(env.QQ_APPID && env.QQ_APPKEY),
          github: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
        },
        ttl: {
          access_token: Number(env.ACCESS_TOKEN_TTL || 7200),
          refresh_token: Number(env.REFRESH_TOKEN_TTL || 2592000),
          auth_code: Number(env.AUTH_CODE_TTL || 300),
          session: Number(env.SESSION_TTL || 604800)
        }
      }
    });
  }

  if (pathname === '/api/admin/logs') {
    if (method !== 'GET') return fail('method_not_allowed', '仅支持 GET', 405);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500);
    const logs = await store.listLogs(limit);
    return ok({ total: logs.length, logs });
  }

  return fail('not_found', '未知的管理接口', 404);
}
