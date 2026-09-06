/**
 * 数据层：基于 Cloudflare KV 的轻量仓储封装
 *
 * 键空间设计（全部在同一个 namespace 下，用前缀区分）：
 *   user:{uid}                 用户主记录
 *   idx:username:{lower}       → uid
 *   idx:email:{lower}          → uid
 *   idx:qq:{social_uid}        → uid
 *   idx:gh:{github_id}         → uid
 *   app:{client_id}            OAuth 应用
 *   applist                    应用 id 列表
 *   sess:{sid}                 浏览器会话
 *   code:{code}                授权码
 *   token:{access_token}      访问令牌
 *   refresh:{refresh_token}   刷新令牌
 *   pstate:{state}             第三方登录中转状态
 *   stats                      计数统计
 */

const SESSION_TTL_DEFAULT = 604800;

class Store {
  constructor(kv, env) {
    this.kv = kv;
    this.env = env;
  }

  /* -------- 基础读写 -------- */

  async get(key) {
    return this.kv.get(key, { type: 'json' });
  }

  async put(key, value, expirationTtl) {
    return this.kv.put(key, JSON.stringify(value), expirationTtl ? { expirationTtl } : undefined);
  }

  async del(key) {
    return this.kv.delete(key);
  }

  async list(prefix, limit = 1000) {
    const res = await this.kv.list({ prefix, limit });
    const items = [];
    for (const k of res.keys) {
      const v = await this.get(k.name);
      if (v) items.push(v);
    }
    return items;
  }

  /*********************************************************
   *  用户
   *********************************************************/

  async getUser(uid) {
    if (!uid) return null;
    return this.get(`user:${uid}`);
  }

  async getUserByUsername(username) {
    const uid = await this.kv.get(`idx:username:${String(username).toLowerCase()}`);
    return uid ? this.getUser(uid) : null;
  }

  async getUserByEmail(email) {
    const uid = await this.kv.get(`idx:email:${String(email).toLowerCase()}`);
    return uid ? this.getUser(uid) : null;
  }

  async getUserByProvider(provider, pid) {
    const uid = await this.kv.get(`idx:${provider}:${pid}`);
    return uid ? this.getUser(uid) : null;
  }

  /**
   * 创建用户并写入索引
   * @returns {Promise<object>} 新建的用户对象
   */
  async createUser(data) {
    const now = Date.now();
    const user = {
      uid: data.uid,
      username: data.username || null,
      email: data.email || null,
      password_hash: data.password_hash || null,
      nickname: data.nickname || data.username || '用户',
      avatar: data.avatar || null,
      bio: '',
      gender: data.gender || null,
      location: data.location || null,
      is_admin: !!data.is_admin,
      status: 'active',
      email_verified: false,
      providers: data.providers || {},
      created_at: now,
      updated_at: now,
      last_login_at: null
    };

    await this.put(`user:${user.uid}`, user);
    if (user.username) await this.kv.put(`idx:username:${user.username.toLowerCase()}`, user.uid);
    if (user.email) await this.kv.put(`idx:email:${user.email.toLowerCase()}`, user.uid);
    for (const [p, info] of Object.entries(user.providers || {})) {
      if (info && (info.social_uid || info.id)) {
        await this.kv.put(`idx:${p}:${info.social_uid || info.id}`, user.uid);
      }
    }
    await this.bumpStat('users', 1);
    return user;
  }

  async updateUser(uid, patch) {
    const user = await this.getUser(uid);
    if (!user) return null;
    const next = { ...user, ...patch, uid: user.uid, updated_at: Date.now() };
    await this.put(`user:${uid}`, next);
    return next;
  }

  /** 绑定第三方身份到已有用户 */
  async bindProvider(uid, provider, info) {
    const user = await this.getUser(uid);
    if (!user) return null;
    user.providers = user.providers || {};
    user.providers[provider] = { ...info, bound_at: Date.now() };
    const pid = info.social_uid || info.id;
    await this.kv.put(`idx:${provider}:${pid}`, uid);
    return this.updateUser(uid, { providers: user.providers });
  }

  async unbindProvider(uid, provider) {
    const user = await this.getUser(uid);
    if (!user || !user.providers?.[provider]) return null;
    const pid = user.providers[provider].social_uid || user.providers[provider].id;
    await this.kv.delete(`idx:${provider}:${pid}`);
    delete user.providers[provider];
    return this.updateUser(uid, { providers: user.providers });
  }

  async listUsers(limit = 200) {
    return this.list('user:', limit);
  }

  async countUsers() {
    const list = await this.kv.list({ prefix: 'user:' });
    return list.keys.length;
  }

  /*********************************************************
   *  会话
   *********************************************************/

  async createSession(uid, meta = {}) {
    const sid = `sess_${b64(24)}`;
    const ttl = parseInt(this.env.SESSION_TTL || SESSION_TTL_DEFAULT, 10);
    const sess = {
      sid, uid,
      created_at: Date.now(),
      ip: meta.ip || null,
      ua: meta.ua || null
    };
    await this.put(`sess:${sid}`, sess, ttl);
    return sess;
  }

  async getSession(sid) {
    if (!sid) return null;
    return this.get(`sess:${sid}`);
  }

  async destroySession(sid) {
    if (sid) await this.del(`sess:${sid}`);
  }

  /*********************************************************
   *  OAuth 应用
   *********************************************************/

  async getApp(clientId) {
    return this.get(`app:${clientId}`);
  }

  async createApp(app) {
    await this.put(`app:${app.client_id}`, app);
    const ids = (await this.get('applist')) || [];
    if (!ids.includes(app.client_id)) {
      ids.push(app.client_id);
      await this.put('applist', ids);
    }
    return app;
  }

  async updateApp(clientId, patch) {
    const app = await this.getApp(clientId);
    if (!app) return null;
    const next = { ...app, ...patch, client_id: clientId, updated_at: Date.now() };
    await this.put(`app:${clientId}`, next);
    return next;
  }

  async deleteApp(clientId) {
    await this.del(`app:${clientId}`);
    const ids = (await this.get('applist')) || [];
    await this.put('applist', ids.filter(x => x !== clientId));
  }

  async listApps() {
    const ids = (await this.get('applist')) || [];
    const apps = [];
    for (const id of ids) {
      const a = await this.getApp(id);
      if (a) apps.push(a);
    }
    return apps;
  }

  /** 某用户已授权过的应用（含授权范围与时间） */
  async listUserApps(uid) {
    const apps = await this.listApps();
    const out = [];
    for (const a of apps) {
      const c = await this.get(`consent:${uid}:${a.client_id}`);
      if (c) out.push({ ...a, granted_scopes: c.scopes || [], granted_at: c.granted_at });
    }
    out.sort((x, y) => (y.granted_at || 0) - (x.granted_at || 0));
    return out;
  }

  /** 撤销某用户对某应用的授权（下次访问需重新确认，同时作废其令牌） */
  async revokeConsent(uid, clientId) {
    await this.del(`consent:${uid}:${clientId}`);
    const tokens = await this.listTokens(1000);
    let n = 0;
    for (const t of tokens) {
      if (t.client_id === clientId && t.uid === uid) {
        await this.deleteToken(t.access_token);
        n++;
      }
    }
    return n;
  }

  /*********************************************************
   *  授权码 / 令牌
   *********************************************************/

  async saveAuthCode(code, data) {
    const ttl = parseInt(this.env.AUTH_CODE_TTL || '300', 10);
    await this.put(`code:${code}`, { ...data, code, consumed: false }, ttl);
  }

  async takeAuthCode(code) {
    const data = await this.get(`code:${code}`);
    if (!data) return null;
    // 授权码一次性：立即删除，防止重放
    await this.del(`code:${code}`);
    return data;
  }

  async saveToken(record) {
    const ttl = parseInt(this.env.ACCESS_TOKEN_TTL || '7200', 10);
    await this.put(`token:${record.access_token}`, record, ttl);
    if (record.refresh_token) {
      const rttl = parseInt(this.env.REFRESH_TOKEN_TTL || '2592000', 10);
      await this.put(`refresh:${record.refresh_token}`, record, rttl);
    }
    return record;
  }

  async getToken(accessToken) {
    return this.get(`token:${accessToken}`);
  }

  async getRefreshToken(rt) {
    return this.get(`refresh:${rt}`);
  }

  async deleteToken(accessToken) {
    const rec = await this.getToken(accessToken);
    if (rec?.refresh_token) await this.del(`refresh:${rec.refresh_token}`);
    await this.del(`token:${accessToken}`);
    return rec;
  }

  /** 列出当前全部有效访问令牌（KV 会自动过滤已过期的） */
  async listTokens(limit = 500) {
    const res = await this.kv.list({ prefix: 'token:', limit });
    const now = Math.floor(Date.now() / 1000);
    const items = [];
    for (const k of res.keys) {
      const v = await this.get(k.name);
      if (v && (!v.expires_at || v.expires_at > now)) items.push(v);
    }
    items.sort((a, b) => (b.issued_at || 0) - (a.issued_at || 0));
    return items;
  }

  /** 撤销某个应用下的全部令牌，返回撤销数量 */
  async revokeTokensByClient(clientId) {
    const tokens = await this.listTokens(1000);
    let n = 0;
    for (const t of tokens) {
      if (t.client_id === clientId) {
        await this.deleteToken(t.access_token);
        n++;
      }
    }
    return n;
  }

  /*********************************************************
   *  审计日志
   *********************************************************/

  async addLog(entry) {
    const now = Date.now();
    const key = `log:${now}_${b64(6)}`;
    await this.put(key, { ...entry, ts: now }, 60 * 60 * 24 * 90); // 保留 90 天
  }

  async listLogs(limit = 100) {
    const res = await this.kv.list({ prefix: 'log:', limit });
    const items = [];
    for (const k of res.keys) {
      const v = await this.get(k.name);
      if (v) items.push(v);
    }
    items.sort((a, b) => b.ts - a.ts); // 最新在前
    return items.slice(0, limit);
  }

  /*********************************************************
   *  第三方登录中转状态
   *********************************************************/

  async savePendingState(state, data) {
    await this.put(`pstate:${state}`, data, 600);
  }

  async takePendingState(state) {
    const data = await this.get(`pstate:${state}`);
    if (data) await this.del(`pstate:${state}`);
    return data;
  }

  /*********************************************************
   *  统计
   *********************************************************/

  async bumpStat(key, delta = 1) {
    const stats = (await this.get('stats')) || {};
    stats[key] = (stats[key] || 0) + delta;
    await this.put('stats', stats);
    return stats;
  }

  async getStats() {
    return (await this.get('stats')) || {};
  }
}

function b64(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createStore(kv, env) {
  return new Store(kv, env);
}
