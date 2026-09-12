/**
 * 管理后台
 *
 * 路由（由 index.js 分发）
 *   GET  /admin                      总览
 *   GET  /admin/apps                 应用管理（列表 + 编辑 + 重置密钥）
 *   POST /admin/apps/create
 *   POST /admin/apps/update
 *   POST /admin/apps/reset-secret
 *   POST /admin/apps/delete
 *   GET  /admin/users                用户管理
 *   POST /admin/users/toggle-admin
 *   GET  /admin/tokens               令牌管理
 *   POST /admin/tokens/revoke
 *   GET  /admin/system               系统状态（自建信息）
 */

import { page, esc, ICONS, sideNav, defaultAvatar } from './ui.js';
import { randomId, randomToken } from './crypto.js';

const VERSION = 'v1.2.0';

/* ============================ 入口 ============================ */

export async function handleAdmin(request, env, store, user, pathname) {
  if (!user?.is_admin) {
    return new Response(page({
      title: '无权限', siteName: env.SITE_NAME,
      body: `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
        <div class="card" style="max-width:380px;width:100%;padding:32px;text-align:center">
          <div style="color:var(--muted);margin-bottom:14px">${ICONS.lock}</div>
          <h1 style="font-size:18px;font-weight:700;margin-bottom:7px">无访问权限</h1>
          <p style="color:var(--muted);font-size:13.5px;margin-bottom:20px">管理后台仅对管理员开放</p>
          <a class="btn btn-primary" href="/profile">返回个人中心</a>
        </div></div>`
    }), { status: 403, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  }

  if (request.method === 'POST') return adminAction(request, env, store, user, pathname);

  const route = {
    '/admin': overviewTab,
    '/admin/apps': appsTab,
    '/admin/users': usersTab,
    '/admin/tokens': tokensTab,
    '/admin/system': systemTab
  }[pathname] || overviewTab;

  const active = {
    '/admin': 'overview', '/admin/apps': 'apps', '/admin/users': 'users',
    '/admin/tokens': 'tokens', '/admin/system': 'system'
  }[pathname] || 'overview';

  const msg = new URL(request.url).searchParams.get('msg');
  const err = new URL(request.url).searchParams.get('err');
  const inner = await route(env, store, user);

  const body = `<div class="console">
    ${sideNav(active, user, env.SITE_NAME, true)}
    <div class="main">
      ${topbar(active, user)}
      <div class="content">
        ${msg ? `<div class="alert alert-ok">${ICONS.check}${esc(msg)}</div>` : ''}
        ${err ? `<div class="alert alert-err">${ICONS.shield}${esc(err)}</div>` : ''}
        ${inner}
      </div>
    </div>
  </div>`;

  return new Response(page({ title: '管理后台', siteName: env.SITE_NAME, body }), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' }
  });
}

const TITLES = {
  overview: ['总览', '服务运行情况一览'],
  apps: ['应用管理', '管理接入的 OAuth 应用、回调地址与密钥'],
  users: ['用户管理', '查看注册用户、分配管理员权限'],
  tokens: ['令牌管理', '查看并撤销当前有效的访问令牌'],
  system: ['系统状态', '实例信息与运行配置']
};

function topbar(active, user) {
  const [title, sub] = TITLES[active] || TITLES.overview;
  return `<div class="topbar">
    <div>
      <h1>${title}</h1>
      <div class="crumb">${esc(sub)}</div>
    </div>
    <div class="top-right">
      <button class="theme-btn" onclick="toggleTheme()" title="切换主题">${ICONS.moon}</button>
      <a class="btn btn-secondary btn-sm" href="/profile">${ICONS.user} ${esc(user.nickname || user.username)}</a>
      <a class="btn btn-ghost btn-sm" href="/logout">${ICONS.logout}</a>
    </div>
  </div>`;
}

/* ============================ 总览 ============================ */

async function overviewTab(env, store, user) {
  const [users, apps, tokens, stats] = await Promise.all([
    store.listUsers(500), store.listApps(), store.listTokens(500), store.getStats()
  ]);

  const logs = await store.listLogs(8);
  const now = Math.floor(Date.now() / 1000);
  const activeTokens = tokens.filter(t => !t.expires_at || t.expires_at > now);

  return `
  <div class="stats">
    <div class="stat"><span class="stat-ico">${ICONS.user}</span>
      <div class="stat-v">${users.length}</div><div class="stat-l">注册用户</div></div>
    <div class="stat"><span class="stat-ico">${ICONS.apps}</span>
      <div class="stat-v">${apps.length}</div><div class="stat-l">接入应用</div></div>
    <div class="stat"><span class="stat-ico">${ICONS.token}</span>
      <div class="stat-v">${activeTokens.length}</div><div class="stat-l">有效令牌</div></div>
    <div class="stat"><span class="stat-ico">${ICONS.activity}</span>
      <div class="stat-v">${stats.logins || 0}</div><div class="stat-l">累计登录</div></div>
  </div>

  <div class="form-grid">
    <div class="sec" style="margin:0">
      <div class="sec-h"><h3>快速开始</h3></div>
      <div class="card" style="padding:18px">
        <div class="step"><i>1</i><span>在 <a href="/admin/apps">应用管理</a> 创建应用，拿到 <code>client_id</code> 与 <code>client_secret</code></span></div>
        <div class="step"><i>2</i><span>把登录按钮指向 <code>/oauth/authorize</code></span></div>
        <div class="step"><i>3</i><span>在回调里用 <code>code</code> 换取 <code>access_token</code></span></div>
        <div class="step"><i>4</i><span>调用 <code>/oauth/userinfo</code> 获取用户资料</span></div>
        <div style="margin-top:14px"><a class="btn btn-primary btn-sm" href="/docs">查看完整文档 ${ICONS.arrow}</a></div>
      </div>
    </div>

    <div class="sec" style="margin:0">
      <div class="sec-h"><h3>最近动态</h3></div>
      <div class="card">
        ${logs.length ? logs.map(l => `
          <div style="display:flex;gap:10px;padding:10px 15px;border-bottom:1px solid var(--border);font-size:12.5px">
            <span style="color:var(--muted);flex:0 0 auto;font-family:var(--mono);font-size:11px;padding-top:2px">
              ${new Date(l.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
            <span style="color:var(--text-2)">${esc(l.text)}</span>
          </div>`).join('')
        : `<div class="empty" style="padding:30px">暂无记录</div>`}
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><div><h3>服务端点</h3><p>标准 OAuth 2.0 / OIDC 端点，可直接用于客户端配置</p></div></div>
    <div class="tbl-card"><div class="tbl-wrap"><table>
      <tbody>
        <tr><td style="width:130px;color:var(--muted);font-size:12.5px">Issuer</td><td><code>${esc(env.ISSUER)}</code></td></tr>
        <tr><td style="color:var(--muted);font-size:12.5px">授权端点</td><td><code>${esc(env.ISSUER)}/oauth/authorize</code></td></tr>
        <tr><td style="color:var(--muted);font-size:12.5px">令牌端点</td><td><code>${esc(env.ISSUER)}/oauth/token</code></td></tr>
        <tr><td style="color:var(--muted);font-size:12.5px">用户信息</td><td><code>${esc(env.ISSUER)}/oauth/userinfo</code></td></tr>
        <tr><td style="color:var(--muted);font-size:12.5px">发现文档</td><td><a href="/.well-known/openid-configuration"><code>/.well-known/openid-configuration</code></a></td></tr>
      </tbody>
    </table></div></div>
  </div>`;
}

/* ============================ 应用管理 ============================ */

async function appsTab(env, store, user) {
  const apps = await store.listApps();

  const rows = apps.map(a => `
    <tr>
      <td data-label="应用">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="app-icon" style="width:30px;height:30px;font-size:12px;border-radius:8px">
            ${esc((a.name || '?').slice(0, 1).toUpperCase())}</div>
          <div style="min-width:0">
            <div class="t-main">${esc(a.name)}</div>
            <div class="t-sub">${esc(a.homepage || '未设置主页')}</div>
          </div>
        </div>
      </td>
      <td data-label="Client ID"><code>${esc(a.client_id)}</code></td>
      <td data-label="Client Secret">
        <div class="secret-bar">
          <span class="val" id="sec-${esc(a.client_id)}">${esc(mask(a.client_secret))}</span>
          <button class="btn btn-ghost btn-sm" style="padding:0 8px;height:24px"
                  onclick="revealSecret('sec-${esc(a.client_id)}',this)"
                  data-full="${esc(a.client_secret)}">${ICONS.eye}</button>
          <button class="btn btn-ghost btn-sm" style="padding:0 8px;height:24px"
                  onclick="copyText('${esc(a.client_secret)}','Client Secret')">${ICONS.copy}</button>
        </div>
      </td>
      <td data-label="回调地址">${(a.redirect_uris || []).map(u => `<code>${esc(u)}</code>`).join('<br>')}</td>
      <td data-label="Scopes">${(a.scopes || []).map(s => `<span class="badge">${esc(s)}</span> `).join('')}</td>
      <td data-label="操作">
        <div class="row-acts">
          <button class="btn btn-secondary btn-sm" onclick="togglePanel('edit-${esc(a.client_id)}')">${ICONS.edit} 编辑</button>
          <form method="POST" action="/admin/apps/reset-secret" style="display:inline"
                onsubmit="return confirmDo('重置后当前 secret 立即失效，已接入的站点需要更新配置。确定继续？')">
            <input type="hidden" name="client_id" value="${esc(a.client_id)}">
            <button class="btn btn-secondary btn-sm" type="submit">${ICONS.refresh} 重置密钥</button>
          </form>
          <form method="POST" action="/admin/apps/delete" style="display:inline"
                onsubmit="return confirmDo('删除后使用该应用的所有站点将立即无法登录，且无法恢复。确定删除「${esc(a.name)}」？')">
            <input type="hidden" name="client_id" value="${esc(a.client_id)}">
            <button class="btn btn-danger btn-sm" type="submit">${ICONS.trash}</button>
          </form>
        </div>
      </td>
    </tr>
    <tr><td colspan="6" style="padding:0;border-bottom:1px solid var(--border)">
      <div class="panel" id="edit-${esc(a.client_id)}" style="border:none;border-radius:0;margin:0;box-shadow:none">
        <div class="panel-b" style="padding:16px;background:var(--surface-2)">
          <form method="POST" action="/admin/apps/update">
            <input type="hidden" name="client_id" value="${esc(a.client_id)}">
            <div class="form-grid">
              <div class="field" style="margin:0"><label>应用名称</label>
                <input class="input" name="name" value="${esc(a.name)}" required></div>
              <div class="field" style="margin:0"><label>主页 URL</label>
                <input class="input" name="homepage" value="${esc(a.homepage || '')}" placeholder="https://..."></div>
            </div>
            <div class="field" style="margin-top:14px">
              <label>回调地址（每行一个，需与接入方完全一致）</label>
              <textarea class="textarea" name="redirect_uris" required>${esc((a.redirect_uris || []).join('\n'))}</textarea>
            </div>
            <div class="field">
              <label>授权范围（空格分隔）</label>
              <input class="input" name="scopes" value="${esc((a.scopes || []).join(' '))}">
              <div class="hint">可选：openid profile email username uid groups</div>
            </div>
            <div class="field">
              <label class="check" style="margin:0">
                <input type="checkbox" name="allow_client_credentials" value="1"
                  ${a.allow_client_credentials ? 'checked' : ''}>
                <span>允许 client_credentials 模式（服务端对服务端调用，无用户上下文）</span>
              </label>
            </div>
            <div class="form-acts">
              <button class="btn btn-primary btn-sm" type="submit">保存修改</button>
              <button class="btn btn-ghost btn-sm" type="button" onclick="togglePanel('edit-${esc(a.client_id)}')">收起</button>
              <span class="hint" style="margin:0;align-self:center">
                创建于 ${new Date(a.created_at || Date.now()).toLocaleDateString('zh-CN')}</span>
            </div>
          </form>
        </div>
      </div>
    </td></tr>`).join('');

  const table = apps.length ? `
    <div class="sec">
      <div class="sec-h"><div><h3>已接入应用</h3><p>点击「编辑」可修改配置，「重置密钥」会立即让旧 secret 失效</p></div>
        <span class="badge badge-brand">${apps.length} 个</span></div>
      <div class="tbl-card"><div class="tbl-wrap"><table>
        <thead><tr><th>应用</th><th>Client ID</th><th>Client Secret</th><th>回调地址</th><th>Scopes</th><th style="text-align:right">操作</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div></div>
    </div>` : `
    <div class="sec"><div class="card"><div class="empty">
      ${ICONS.apps}<div>还没有应用，在下方创建第一个接入应用。</div>
    </div></div></div>`;

  const create = `
    <div class="sec">
      <div class="panel open">
        <div class="panel-h" onclick="togglePanel('p-new')">
          <h3>${ICONS.plus} 创建接入应用</h3><span class="chev">${ICONS.arrow}</span>
        </div>
        <div class="panel-b" id="p-new">
          <form method="POST" action="/admin/apps/create">
            <div class="form-grid">
              <div class="field"><label>应用名称</label>
                <input class="input" name="name" placeholder="我的论坛" required></div>
              <div class="field"><label>主页 URL（选填）</label>
                <input class="input" name="homepage" placeholder="https://bbs.example.com"></div>
            </div>
            <div class="field">
              <label>回调地址（每行一个）</label>
              <textarea class="textarea" name="redirect_uris" placeholder="https://bbs.example.com/oauth/callback&#10;http://localhost:3000/callback" required></textarea>
              <div class="hint">必须与接入方请求的 redirect_uri 逐字符一致，本地调试可用 http://localhost:端口/callback</div>
            </div>
            <div class="field">
              <label>授权范围（空格分隔）</label>
              <input class="input" name="scopes" value="openid profile email">
            </div>
            <div class="form-acts"><button class="btn btn-primary btn-sm" type="submit">创建应用</button></div>
          </form>
        </div>
      </div>
    </div>`;

  return table + create;
}

function mask(secret) {
  if (!secret) return '';
  if (secret.length <= 12) return secret.slice(0, 4) + '••••';
  return secret.slice(0, 8) + '••••••••' + secret.slice(-4);
}

/* ============================ 用户管理 ============================ */

async function usersTab(env, store, user) {
  const users = await store.listUsers(500);
  users.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  const rows = users.map(u => `
    <tr>
      <td data-label="用户">
        <div style="display:flex;align-items:center;gap:9px">
          <img src="${esc(u.avatar || defaultAvatar(u.uid))}" width="28" height="28"
               loading="lazy" referrerpolicy="no-referrer"
               style="border-radius:50%;background:var(--surface-2);object-fit:cover;flex:0 0 auto" alt=""
               onerror="this.style.visibility='hidden'">
          <div style="min-width:0">
            <div class="t-main">${esc(u.nickname || u.username || '-')}</div>
            <div class="t-sub">${esc(u.email || '无邮箱')}</div>
          </div>
        </div>
      </td>
      <td data-label="UID"><code>${esc(u.uid)}</code></td>
      <td data-label="登录方式">${Object.keys(u.providers || {}).map(p =>
        `<span class="badge ${p === 'qq' ? 'badge-brand' : ''}">${esc(p)}</span> `).join('') || '<span class="t-sub">仅密码</span>'}</td>
      <td data-label="角色">${u.is_admin ? '<span class="badge badge-ok">管理员</span>' : '<span class="badge">用户</span>'}</td>
      <td data-label="注册时间" class="t-sub">${new Date(u.created_at || Date.now()).toLocaleDateString('zh-CN')}</td>
      <td data-label="操作"><div class="row-acts">
        ${u.uid === user.uid
          ? '<span class="t-sub">当前登录</span>'
          : `<form method="POST" action="/admin/users/toggle-admin">
               <input type="hidden" name="uid" value="${esc(u.uid)}">
               <button class="btn btn-secondary btn-sm" type="submit">${u.is_admin ? '撤销管理员' : '设为管理员'}</button>
             </form>`}
      </div></td>
    </tr>`).join('');

  return `
  <div class="stats">
    <div class="stat"><div class="stat-v">${users.length}</div><div class="stat-l">总用户</div></div>
    <div class="stat"><div class="stat-v">${users.filter(u => u.providers?.qq).length}</div><div class="stat-l">QQ 登录</div></div>
    <div class="stat"><div class="stat-v">${users.filter(u => u.providers?.github).length}</div><div class="stat-l">GitHub 登录</div></div>
    <div class="stat"><div class="stat-v">${users.filter(u => u.password_hash).length}</div><div class="stat-l">已设密码</div></div>
  </div>

  <div class="sec">
    <div class="sec-h"><div><h3>全部用户</h3><p>共 ${users.length} 位注册用户</p></div></div>
    <div class="tbl-card"><div class="tbl-wrap"><table>
      <thead><tr><th>用户</th><th>UID</th><th>登录方式</th><th>角色</th><th>注册时间</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${rows.length ? rows : ''}</tbody>
    </table></div></div>
    ${rows ? '' : '<div class="empty">还没有用户</div>'}
  </div>`;
}

/* ============================ 令牌管理 ============================ */

async function tokensTab(env, store, user) {
  const [tokens, apps, users] = await Promise.all([
    store.listTokens(500), store.listApps(), store.listUsers(500)
  ]);

  const appMap = Object.fromEntries(apps.map(a => [a.client_id, a]));
  const userMap = Object.fromEntries(users.map(u => [u.uid, u]));
  const now = Math.floor(Date.now() / 1000);

  const rows = tokens.map(t => {
    const app = appMap[t.client_id];
    const u = t.uid ? userMap[t.uid] : null;
    const left = t.expires_at ? t.expires_at - now : 0;
    const pct = t.expires_at && t.issued_at
      ? Math.max(0, Math.min(100, (left / (t.expires_at - t.issued_at)) * 100)) : 0;
    const color = left > 1800 ? 'var(--ok)' : left > 300 ? 'var(--warn)' : 'var(--danger)';

    return `<tr>
      <td data-label="令牌"><code>${esc(mask(t.access_token))}</code></td>
      <td data-label="所属应用">
        <div class="t-main">${esc(app?.name || t.client_id)}</div>
        <div class="t-sub"><code style="font-size:10.5px">${esc(t.client_id)}</code></div>
      </td>
      <td data-label="用户">${u ? `<div class="t-main">${esc(u.nickname || u.username)}</div>
                 <div class="t-sub">${esc(u.uid)}</div>`
             : '<span class="badge">客户端凭证</span>'}</td>
      <td data-label="剩余有效期" style="min-width:120px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:4px;border-radius:3px;background:var(--surface-2);overflow:hidden">
            <div style="width:${pct.toFixed(0)}%;height:100%;border-radius:3px;background:${color}"></div>
          </div>
          <span style="font-size:11.5px;color:var(--muted);white-space:nowrap">${fmtLeft(left)}</span>
        </div>
        <div class="t-sub" style="margin-top:3px">${(t.scope || []).join(' ')}</div>
      </td>
      <td data-label="签发时间" class="t-sub">${new Date((t.issued_at || 0) * 1000).toLocaleString('zh-CN')}</td>
      <td data-label="操作"><div class="row-acts">
        <form method="POST" action="/admin/tokens/revoke" onsubmit="return confirmDo('撤销后该令牌立即失效，对应站点需重新登录。确定撤销？')">
          <input type="hidden" name="token" value="${esc(t.access_token)}">
          <button class="btn btn-danger btn-sm" type="submit">${ICONS.trash} 撤销</button>
        </form>
      </div></td>
    </tr>`;
  }).join('');

  return `
  <div class="stats">
    <div class="stat"><div class="stat-v">${tokens.length}</div><div class="stat-l">有效令牌</div></div>
    <div class="stat"><div class="stat-v">${apps.length}</div><div class="stat-l">签发应用</div></div>
    <div class="stat"><div class="stat-v">${new Set(tokens.map(t => t.uid).filter(Boolean)).size}</div><div class="stat-l">活跃用户</div></div>
    <div class="stat"><div class="stat-v">${parseInt(env.ACCESS_TOKEN_TTL || '7200', 10) / 3600}h</div><div class="stat-l">令牌有效期</div></div>
  </div>

  <div class="notice">${ICONS.token}<div>令牌存储在 KV 中，到期自动清除。撤销操作会同时失效对应的 refresh_token，接入方需要重新走一次授权流程。</div></div>

  <div class="sec">
    <div class="sec-h"><div><h3>当前有效令牌</h3><p>共 ${tokens.length} 个</p></div></div>
    <div class="tbl-card"><div class="tbl-wrap"><table>
      <thead><tr><th>令牌</th><th>所属应用</th><th>用户</th><th>剩余有效期 / Scope</th><th>签发时间</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>
    ${tokens.length ? '' : '<div class="card"><div class="empty">' + ICONS.token + '<div>当前没有有效令牌</div></div></div>'}
  </div>`;
}

function fmtLeft(sec) {
  if (sec <= 0) return '已过期';
  if (sec >= 3600) return `${Math.floor(sec / 3600)} 小时`;
  if (sec >= 60) return `${Math.floor(sec / 60)} 分钟`;
  return `${sec} 秒`;
}

/* ============================ 系统状态 ============================ */

async function systemTab(env, store, user) {
  const [users, apps, tokens, stats, logs] = await Promise.all([
    store.listUsers(1000), store.listApps(), store.listTokens(1000), store.getStats(), store.listLogs(20)
  ]);

  const kvKeys = users.length + apps.length + tokens.length + logs.length;
  const uptime = formatUptime(stats.first_boot_at);

  const configRow = (label, value, ok) => `
    <tr>
      <td style="color:var(--muted);font-size:12.5px;width:190px">${esc(label)}</td>
      <td class="cfg-desc">${value}</td>
      <td class="cfg-badge" style="width:80px;text-align:right">${
        ok === true ? '<span class="badge badge-ok">已启用</span>'
        : ok === false ? '<span class="badge badge-warn">未配置</span>'
        : ok === null ? '<span class="badge">已启用</span>' : ''}</td>
    </tr>`;

  return `
  <div class="notice">${ICONS.server}<div>
    这是一个<b>自建实例</b>：代码与数据都部署在您自己的 Cloudflare 账户下，不经过任何第三方身份服务商，
    可随时导出数据、更换域名或迁移部署。
  </div></div>

  <div class="stats">
    <div class="stat"><div class="stat-v">${users.length}</div><div class="stat-l">用户</div></div>
    <div class="stat"><div class="stat-v">${apps.length}</div><div class="stat-l">应用</div></div>
    <div class="stat"><div class="stat-v">${tokens.length}</div><div class="stat-l">有效令牌</div></div>
    <div class="stat"><div class="stat-v">${kvKeys}</div><div class="stat-l">KV 记录数</div></div>
  </div>

  <div class="sec">
    <div class="sec-h"><h3>实例信息</h3></div>
    <div class="tbl-card"><div class="tbl-wrap"><table><tbody>
      <tr><td style="color:var(--muted);font-size:12.5px;width:190px">服务名称</td>
          <td colspan="2"><b>${esc(env.SITE_NAME)}</b></td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">版本</td>
          <td colspan="2"><code>${esc(VERSION)}</code> <span class="badge badge-brand">Self-hosted</span></td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">Issuer</td>
          <td colspan="2"><code>${esc(env.ISSUER)}</code></td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">运行时</td>
          <td colspan="2">Cloudflare Workers · 边缘运行时（V8 isolates）</td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">存储</td>
          <td colspan="2">Cloudflare KV · namespace <code>mzy-sso-kv</code></td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">运行时间</td>
          <td colspan="2">${esc(uptime)}</td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">源码</td>
          <td colspan="2"><a href="https://github.com/maoxinhe/mzy_sso" target="_blank">github.com/maoxinhe/mzy_sso</a></td></tr>
    </tbody></table></div></div>
  </div>

  <div class="sec">
    <div class="sec-h"><div><h3>登录方式</h3><p>未配置的项目请在 Cloudflare 后台补充密钥</p></div></div>
    <div class="tbl-card"><div class="tbl-wrap"><table><tbody>
      ${configRow('账号密码登录', 'PBKDF2-SHA256 加盐哈希，每个用户独立盐', null)}
      ${configRow('QQ 登录', env.QQ_APPID && env.QQ_APPKEY
        ? `小白菜聚合登录 · APPID <code>${esc(env.QQ_APPID)}</code>` : '未配置 QQ_APPID / QQ_APPKEY',
        !!(env.QQ_APPID && env.QQ_APPKEY))}
      ${configRow('GitHub 登录', env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? `OAuth App · Client ID <code>${esc(env.GITHUB_CLIENT_ID)}</code>` : '未配置 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET',
        !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET))}
      ${configRow('公开注册', String(env.ALLOW_REGISTER) === 'true' ? '允许任何人注册账号' : '已关闭',
        String(env.ALLOW_REGISTER) === 'true')}
      ${configRow('应用自助注册', String(env.ALLOW_APP_REGISTER) === 'true' ? '开放 RFC 7591 动态注册' : '仅管理员可创建',
        String(env.ALLOW_APP_REGISTER) === 'true')}
    </tbody></table></div></div>
  </div>

  <div class="sec">
    <div class="sec-h"><h3>令牌策略</h3></div>
    <div class="tbl-card"><div class="tbl-wrap"><table><tbody>
      <tr><td style="color:var(--muted);font-size:12.5px;width:190px">访问令牌有效期</td>
          <td>${parseInt(env.ACCESS_TOKEN_TTL || '7200', 10)} 秒（${(parseInt(env.ACCESS_TOKEN_TTL || '7200', 10) / 3600).toFixed(1)} 小时）</td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">刷新令牌有效期</td>
          <td>${parseInt(env.REFRESH_TOKEN_TTL || '2592000', 10)} 秒（${Math.round(parseInt(env.REFRESH_TOKEN_TTL || '2592000', 10) / 86400)} 天）</td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">授权码有效期</td>
          <td>${parseInt(env.AUTH_CODE_TTL || '300', 10)} 秒（一次性使用）</td></tr>
      <tr><td style="color:var(--muted);font-size:12.5px">会话有效期</td>
          <td>${parseInt(env.SESSION_TTL || '604800', 10)} 秒（${Math.round(parseInt(env.SESSION_TTL || '604800', 10) / 86400)} 天）</td></tr>
    </tbody></table></div></div>
  </div>

  <div class="sec">
    <div class="sec-h"><div><h3>操作日志</h3><p>保留最近 90 天</p></div></div>
    <div class="tbl-card">
      ${logs.length ? logs.map(l => `
        <div style="display:flex;gap:12px;padding:10px 15px;border-bottom:1px solid var(--border);font-size:12.5px;align-items:baseline">
          <span style="color:var(--muted);font-family:var(--mono);font-size:11px;flex:0 0 auto">
            ${new Date(l.ts).toLocaleString('zh-CN')}</span>
          <span style="color:var(--text-2)">${esc(l.text)}</span>
        </div>`).join('')
      : '<div class="empty">暂无日志记录</div>'}
    </div>
  </div>`;
}

function formatUptime(since) {
  if (!since) return '自首次部署起';
  const d = Date.now() - since;
  const days = Math.floor(d / 86400000);
  const hours = Math.floor((d % 86400000) / 3600000);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  return `${hours} 小时`;
}

/* ============================ 写操作 ============================ */

async function adminAction(request, env, store, user, pathname) {
  const form = await request.formData().catch(() => null);
  const ref = request.headers.get('Referer') || '';
  const base = ref ? ref.split('?')[0] : '/admin';

  const back = (msg, to = base, isErr = false) => {
    const target = new URL(to, request.url);
    target.searchParams.set(isErr ? 'err' : 'msg', msg);
    // 用 new Response + Location 而非 Response.redirect：后者在 Worker 中要求绝对
    // URL，传入相对地址会抛 TypeError 变成 500；副作用已先提交，故需正确跳转。
    return new Response(null, { status: 303, headers: { Location: target.toString() } });
  };

  if (!form) return back('请求格式错误', base, true);

  const name = (v) => String(form.get(v) || '').trim();

  /* ---- 创建应用 ---- */
  if (pathname === '/admin/apps/create') {
    const n = name('name');
    const uris = String(form.get('redirect_uris') || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!n) return back('应用名称不能为空', '/admin/apps', true);
    if (!uris.length) return back('至少填写一个回调地址', '/admin/apps', true);

    const client_id = randomId('mzy', 12);
    const client_secret = `cs_${randomToken(24)}`;
    await store.createApp({
      client_id, client_secret, name: n, homepage: name('homepage') || null,
      redirect_uris: uris,
      scopes: (name('scopes') || 'openid profile email').split(/\s+/).filter(Boolean),
      allow_client_credentials: false,
      token_endpoint_auth_method: 'client_secret_basic',
      created_at: Date.now(), updated_at: Date.now(), owner: user.uid
    });
    await store.addLog({ type: 'app.create', text: `创建应用「${n}」`, actor: user.uid });
    return back(`应用「${n}」创建成功`, '/admin/apps');
  }

  /* ---- 编辑应用 ---- */
  if (pathname === '/admin/apps/update') {
    const clientId = name('client_id');
    const app = await store.getApp(clientId);
    if (!app) return back('应用不存在', '/admin/apps', true);

    const n = name('name');
    const uris = String(form.get('redirect_uris') || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!n) return back('应用名称不能为空', '/admin/apps', true);
    if (!uris.length) return back('至少填写一个回调地址', '/admin/apps', true);

    await store.updateApp(clientId, {
      name: n,
      homepage: name('homepage') || null,
      redirect_uris: uris,
      scopes: (name('scopes') || '').split(/\s+/).filter(Boolean),
      allow_client_credentials: form.get('allow_client_credentials') === '1'
    });
    await store.addLog({ type: 'app.update', text: `更新应用「${n}」配置`, actor: user.uid });
    return back(`应用「${n}」已更新`, '/admin/apps');
  }

  /* ---- 重置 client_secret ---- */
  if (pathname === '/admin/apps/reset-secret') {
    const clientId = name('client_id');
    const app = await store.getApp(clientId);
    if (!app) return back('应用不存在', '/admin/apps', true);

    const newSecret = `cs_${randomToken(24)}`;
    await store.updateApp(clientId, { client_secret: newSecret });

    // 重置密钥后，该应用已签发的令牌全部作废，避免旧令牌继续流通
    const revoked = await store.revokeTokensByClient(clientId);

    await store.addLog({
      type: 'app.reset_secret',
      text: `重置应用「${app.name}」的 Client Secret${revoked ? `，同时撤销 ${revoked} 个令牌` : ''}`,
      actor: user.uid
    });
    return back(`密钥已重置，新密钥 ${newSecret.slice(0, 12)}…（${revoked} 个令牌已撤销）`, '/admin/apps');
  }

  /* ---- 删除应用 ---- */
  if (pathname === '/admin/apps/delete') {
    const clientId = name('client_id');
    const app = await store.getApp(clientId);
    await store.deleteApp(clientId);
    if (app) await store.revokeTokensByClient(clientId);
    await store.addLog({ type: 'app.delete', text: `删除应用「${app?.name || clientId}」`, actor: user.uid });
    return back('应用已删除', '/admin/apps');
  }

  /* ---- 切换管理员 ---- */
  if (pathname === '/admin/users/toggle-admin') {
    const uid = name('uid');
    if (uid === user.uid) return back('不能修改自己的管理员身份', '/admin/users', true);
    const target = await store.getUser(uid);
    if (!target) return back('用户不存在', '/admin/users', true);
    await store.updateUser(uid, { is_admin: !target.is_admin });
    await store.addLog({
      type: 'user.role',
      text: `${target.is_admin ? '撤销' : '授予'} ${target.nickname || target.username} 管理员权限`,
      actor: user.uid
    });
    return back(target.is_admin ? '已撤销管理员' : '已设为管理员', '/admin/users');
  }

  /* ---- 撤销令牌 ---- */
  if (pathname === '/admin/tokens/revoke') {
    const token = name('token');
    const rec = await store.getToken(token);
    if (rec) await store.deleteToken(token);
    await store.addLog({ type: 'token.revoke', text: '管理员撤销了一个访问令牌', actor: user.uid });
    return back('令牌已撤销', '/admin/tokens');
  }

  return back('未知操作', base, true);
}

function redirectErr(request, to, msg) {
  const u = new URL(to, request.url);
  u.searchParams.set('err', msg);
  return new Response(null, { status: 303, headers: { Location: u.toString() } });
}
