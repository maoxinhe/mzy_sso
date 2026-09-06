/**
 * 管理后台：应用（Client）管理 / 用户管理 / 概览
 * 仅 is_admin = true 的用户可访问
 */

import { page, esc, ICONS } from './ui.js';
import { randomId, randomToken } from './crypto.js';

const EXTRA_CSS = `
.admin{max-width:920px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding-bottom:16px;margin-bottom:20px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.topbar h1{font-size:20px}
.tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}
.tabs a{padding:7px 14px;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--muted);
  border:1px solid var(--line);background:var(--bg)}
.tabs a:hover{text-decoration:none;color:var(--text)}
.tabs a.on{background:var(--brand);border-color:var(--brand);color:#fff}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:22px}
.stat{padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
.stat b{display:block;font-size:22px;font-weight:800;letter-spacing:-.5px}
.stat span{font-size:12px;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.4px}
td code{font-size:11.5px;word-break:break-all;background:var(--bg);padding:2px 5px;border-radius:4px;border:1px solid var(--line)}
.tbl-wrap{overflow-x:auto;margin-bottom:18px}
.mini{padding:5px 11px;font-size:12px;font-weight:600;border-radius:7px;cursor:pointer;
  border:1px solid var(--line);background:var(--bg);color:var(--text);font-family:inherit;white-space:nowrap}
.mini:hover{border-color:var(--brand);color:var(--brand)}
.mini.danger:hover{border-color:var(--danger);color:var(--danger)}
.panel{border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:18px;background:var(--bg)}
.panel h3{font-size:15px;margin-bottom:14px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:560px){.grid2{grid-template-columns:1fr}}
textarea{width:100%;padding:10px 12px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  color:var(--text);background:var(--panel);border:1.5px solid var(--line);border-radius:10px;outline:none;resize:vertical;min-height:70px}
textarea:focus{border-color:var(--brand)}
.hint{font-size:12px;color:var(--muted);margin-top:5px}
.empty{padding:30px;text-align:center;color:var(--muted);font-size:13.5px;border:1px dashed var(--line);border-radius:12px}
.copy{margin-left:6px}
`;

/* ---------------- 入口 ---------------- */

export async function handleAdmin(request, env, store, user, pathname) {
  if (!user?.is_admin) {
    return new Response(adminShell(env, user, '无权限', `<div class="empty">你没有访问管理后台的权限。</div>`), {
      status: 403, headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }

  const tab = pathname === '/admin' ? 'apps' : pathname.replace('/admin/', '');

  if (request.method === 'POST') {
    return adminAction(request, env, store, user, pathname);
  }

  return renderTab(request, env, store, user, tab);
}

function adminShell(env, user, title, inner, activeTab = 'apps') {
  const tabs = [
    ['apps', '应用管理', '/admin'],
    ['users', '用户管理', '/admin/users'],
    ['settings', '系统信息', '/admin/settings']
  ];
  const bar = tabs.map(([k, label, href]) =>
    `<a class="${activeTab === k ? 'on' : ''}" href="${href}">${label}</a>`).join('');

  const body = `<div class="wrap" style="align-items:flex-start;padding-top:40px">
    <div class="card admin">
      <div class="topbar">
        <div class="brand" style="margin:0">${ICONS.shield}<b>${esc(env.SITE_NAME)} 管理后台</b></div>
        <div style="font-size:13px;color:var(--muted)">
          ${esc(user.nickname || user.username)} · <a href="/profile">个人中心</a> · <a href="/logout">退出</a>
        </div>
      </div>
      <div class="tabs">${bar}</div>
      ${inner}
    </div>
  </div>`;

  return page({ title, siteName: env.SITE_NAME, body, extra: EXTRA_CSS });
}

function ok(env, user, html, tab) {
  return new Response(adminShell(env, user, '管理后台', html, tab), {
    status: 200, headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

/* ---------------- 渲染各标签页 ---------------- */

async function renderTab(request, env, store, user, tab) {
  const msg = new URL(request.url).searchParams.get('msg');

  if (tab === 'users') return ok(env, user, await usersTab(env, store, msg, user.uid), 'users');
  if (tab === 'settings') return ok(env, user, await settingsTab(env, store, msg), 'settings');
  return ok(env, user, await appsTab(env, store, msg), 'apps');
}

async function appsTab(env, store, msg) {
  const apps = await store.listApps();
  const rows = apps.map(a => `
    <tr>
      <td>
        <b>${esc(a.name)}</b><br>
        <code>${esc(a.client_id)}</code>
        <button class="mini copy" onclick="navigator.clipboard.writeText('${esc(a.client_id)}')">复制ID</button>
      </td>
      <td><code style="color:var(--muted)">${esc(a.client_secret.slice(0, 12))}…</code>
        <button class="mini copy" onclick="navigator.clipboard.writeText('${esc(a.client_secret)}')">复制密钥</button></td>
      <td>${(a.redirect_uris || []).map(u => `<code>${esc(u)}</code>`).join('<br>')}</td>
      <td>${(a.scopes || []).map(s => `<span class="badge">${esc(s)}</span> `).join('')}</td>
      <td style="white-space:nowrap">
        <form method="POST" action="/admin/apps/delete" style="display:inline"
              onsubmit="return confirm('确定删除应用「${esc(a.name)}」？此操作不可恢复')">
          <input type="hidden" name="client_id" value="${esc(a.client_id)}">
          <button class="mini danger" type="submit">删除</button>
        </form>
      </td>
    </tr>`).join('');

  const table = apps.length
    ? `<div class="tbl-wrap"><table>
         <thead><tr><th>应用 / Client ID</th><th>Client Secret</th><th>回调地址</th><th>Scopes</th><th>操作</th></tr></thead>
         <tbody>${rows}</tbody></table></div>`
    : `<div class="empty">还没有应用。在下方创建第一个接入应用吧。</div>`;

  const form = `
    <div class="panel">
      <h3>创建接入应用</h3>
      <form method="POST" action="/admin/apps/create">
        <div class="grid2">
          <div class="field"><label>应用名称</label>
            <input name="name" placeholder="我的论坛" required></div>
          <div class="field"><label>主页 URL（选填）</label>
            <input name="homepage" placeholder="https://bbs.example.com"></div>
        </div>
        <div class="field">
          <label>回调地址（每行一个，必须与接入方完全一致）</label>
          <textarea name="redirect_uris" placeholder="https://bbs.example.com/oauth/callback" required></textarea>
          <div class="hint">支持 http://localhost:3000/callback 用于本地调试</div>
        </div>
        <div class="field">
          <label>授权范围（空格分隔）</label>
          <input name="scopes" value="openid profile email" placeholder="openid profile email">
        </div>
        <button class="btn" style="width:auto;padding:10px 22px" type="submit">创建应用</button>
      </form>
    </div>`;

  return (msg ? `<div class="alert ok" style="display:block">${esc(msg)}</div>` : '') + table + form;
}

async function usersTab(env, store, msg, selfUid) {
  const users = await store.listUsers(300);
  users.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  const rows = users.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <img src="${esc(u.avatar || '')}" width="26" height="26" style="border-radius:50%;background:var(--brand-soft)" alt="">
          <div><b>${esc(u.nickname || u.username || '-')}</b><br>
          <span style="font-size:12px;color:var(--muted)">${esc(u.email || '无邮箱')}</span></div>
        </div>
      </td>
      <td><code>${esc(u.uid)}</code></td>
      <td>${Object.keys(u.providers || {}).map(p => `<span class="badge">${esc(p)}</span> `).join('') || '-'}</td>
      <td>${u.is_admin ? '<span class="badge">管理员</span>' : '<span class="badge off">用户</span>'}</td>
      <td style="font-size:12px;color:var(--muted)">${new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
      <td style="white-space:nowrap">
        ${u.uid === selfUid ? '<span style="font-size:12px;color:var(--muted)">当前登录</span>' : `
        <form method="POST" action="/admin/users/toggle-admin" style="display:inline">
          <input type="hidden" name="uid" value="${esc(u.uid)}">
          <button class="mini" type="submit">${u.is_admin ? '取消管理员' : '设为管理员'}</button>
        </form>`}
      </td>
    </tr>`).join('');

  const table = users.length
    ? `<div class="tbl-wrap"><table>
         <thead><tr><th>用户</th><th>UID</th><th>绑定的第三方</th><th>角色</th><th>注册时间</th><th>操作</th></tr></thead>
         <tbody>${rows}</tbody></table></div>`
    : `<div class="empty">还没有用户。</div>`;

  const head = `
    <div class="stats">
      <div class="stat"><b>${users.length}</b><span>总用户数</span></div>
      <div class="stat"><b>${users.filter(u => u.providers?.qq).length}</b><span>QQ 登录</span></div>
      <div class="stat"><b>${users.filter(u => u.providers?.github).length}</b><span>GitHub 登录</span></div>
      <div class="stat"><b>${users.filter(u => u.password_hash).length}</b><span>密码登录</span></div>
    </div>`;

  return (msg ? `<div class="alert ok" style="display:block">${esc(msg)}</div>` : '') + head + table;
}

async function settingsTab(env, store, msg) {
  const stats = await store.getStats();
  const issuer = env.ISSUER;

  return `
    <div class="panel">
      <h3>服务信息</h3>
      <dl class="kv">
        <dt>Issuer</dt><dd><code>${esc(issuer)}</code></dd>
        <dt>授权端点</dt><dd><code>${esc(issuer)}/oauth/authorize</code></dd>
        <dt>令牌端点</dt><dd><code>${esc(issuer)}/oauth/token</code></dd>
        <dt>用户端点</dt><dd><code>${esc(issuer)}/oauth/userinfo</code></dd>
        <dt>发现文档</dt><dd><a href="/.well-known/openid-configuration" target="_blank"><code>/.well-known/openid-configuration</code></a></dd>
      </dl>
    </div>

    <div class="panel">
      <h3>登录方式</h3>
      <dl class="kv">
        <dt>账号密码</dt><dd><span class="badge">已启用</span></dd>
        <dt>QQ 登录</dt><dd>${env.QQ_APPID && env.QQ_APPKEY
          ? `<span class="badge">已启用</span> 小白菜聚合登录 · APPID ${esc(env.QQ_APPID)}`
          : '<span class="badge off">未配置</span>'}</dd>
        <dt>GitHub</dt><dd>${env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
          ? `<span class="badge">已启用</span> Client ID ${esc(env.GITHUB_CLIENT_ID)}`
          : '<span class="badge off">未配置</span>'}</dd>
      </dl>
    </div>

    <div class="panel">
      <h3>运行统计</h3>
      <div class="stats">
        <div class="stat"><b>${esc(String(stats.users || 0))}</b><span>累计注册</span></div>
        <div class="stat"><b>${esc(String(stats.tokens || 0))}</b><span>累计签发令牌</span></div>
        <div class="stat"><b>${esc(String(stats.logins || 0))}</b><span>累计登录</span></div>
      </div>
    </div>

    <div class="panel">
      <h3>存储与限制</h3>
      <p style="font-size:13px;color:var(--muted);line-height:1.8">
        数据存放在 Cloudflare KV（namespace <code>mzy-sso-kv</code>）。免费版额度为
        每日 10 万次读 / 1000 次写，个人与小团队足够；如需更高配额，可在
        <code>wrangler.toml</code> 中改用 D1 数据库。
      </p>
    </div>`;
}

/* ---------------- 写操作 ---------------- */

async function adminAction(request, env, store, user, pathname) {
  const form = await request.formData().catch(() => null);
  if (!form) return redirect('/admin?msg=请求格式错误');

  const back = (msg, to = '/admin') =>
    Response.redirect(new URL(`${to}?msg=${encodeURIComponent(msg)}`, request.url).toString(), 303);

  /* 创建应用 */
  if (pathname === '/admin/apps/create') {
    const name = String(form.get('name') || '').trim();
    const homepage = String(form.get('homepage') || '').trim();
    const uris = String(form.get('redirect_uris') || '')
      .split('\n').map(s => s.trim()).filter(Boolean);
    const scopes = String(form.get('scopes') || 'openid profile email').split(/\s+/).filter(Boolean);

    if (!name) return back('应用名称不能为空');
    if (!uris.length) return back('至少填写一个回调地址');

    const client_id = randomId('mzy', 12);
    const client_secret = `cs_${randomToken(24)}`;
    await store.createApp({
      client_id, client_secret, name, homepage,
      redirect_uris: uris,
      scopes,
      allow_client_credentials: false,
      token_endpoint_auth_method: 'client_secret_basic',
      created_at: Date.now(),
      updated_at: Date.now(),
      owner: user.uid
    });
    return back(`应用「${name}」创建成功`);
  }

  /* 删除应用 */
  if (pathname === '/admin/apps/delete') {
    const client_id = String(form.get('client_id') || '');
    await store.deleteApp(client_id);
    return back('应用已删除');
  }

  /* 切换管理员 */
  if (pathname === '/admin/users/toggle-admin') {
    const uid = String(form.get('uid') || '');
    const target = await store.getUser(uid);
    if (!target) return back('用户不存在', '/admin/users');
    if (target.uid === user.uid) return back('不能修改自己的管理员身份', '/admin/users');
    await store.updateUser(uid, { is_admin: !target.is_admin });
    return back(target.is_admin ? '已取消管理员' : '已设为管理员', '/admin/users');
  }

  return back('未知操作');
}

/* 占位：usersTab 中为避免与自己比较而保留的小技巧 */
const user_uid_placeholder = '__self__';
