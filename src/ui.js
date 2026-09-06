/**
 * 前端页面：登录 / 注册 / 授权同意 / 个人中心 / 首页
 * 纯内联 HTML + CSS，无外部依赖（Worker 单文件部署，秒开）
 */

const ICONS = {
  qq: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.003 2c-2.265 0-4.29 1.302-5.28 3.232-1.54.392-2.91 1.31-3.86 2.62-1.14 1.572-1.76 3.615-1.76 5.756 0 .66.09 1.31.26 1.94-.53.88-.83 1.87-.83 2.9 0 .48.06.95.18 1.4-.14.46-.22.94-.22 1.44 0 1.32.53 2.55 1.44 3.46.61.61 1.4 1.03 2.28 1.22-.06 1.86.3 3.53 1.03 4.75.5-1.28 1-2.99 1.16-4.9.55.08 1.12.12 1.7.12.58 0 1.15-.04 1.7-.12.16 1.91.66 3.62 1.16 4.9.73-1.22 1.09-2.89 1.03-4.75.88-.19 1.67-.61 2.28-1.22.91-.91 1.44-2.14 1.44-3.46 0-.5-.08-.98-.22-1.44.12-.45.18-.92.18-1.4 0-1.03-.3-2.02-.83-2.9.17-.63.26-1.28.26-1.94 0-2.14-.62-4.18-1.76-5.76-.95-1.31-2.32-2.23-3.86-2.61C16.293 3.302 14.268 2 12.003 2zm-.53 15.29c-.53 0-1.02-.05-1.49-.14.12-.9.36-1.74.7-2.5.36.06.73.1 1.12.1.39 0 .76-.04 1.12-.1.34.76.58 1.6.7 2.5-.47.09-.96.14-1.49.14z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.61-.02 2.9-.02 3.3 0 .32.21.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`
};

/* ============================ 公共样式 ============================ */

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f6f7fb; --panel:#fff; --text:#111827; --muted:#6b7280; --line:#e5e7eb;
  --brand:#4f46e5; --brand-2:#7c3aed; --brand-soft:#eef2ff;
  --qq:#12b7f5; --gh:#24292f; --danger:#ef4444; --ok:#10b981;
  --radius:16px; --shadow:0 10px 40px -10px rgba(17,24,39,.14),0 2px 8px -2px rgba(17,24,39,.06);
}
@media (prefers-color-scheme:dark){
  :root{
    --bg:#0b0d13; --panel:#141822; --text:#e8eaf0; --muted:#98a2b3; --line:#232838;
    --brand:#6366f1; --brand-2:#a855f7; --brand-soft:#1c2033;
    --gh:#e8eaf0; --shadow:0 10px 40px -10px rgba(0,0,0,.5);
  }
}
html{-webkit-text-size-adjust:100%}
body{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",Roboto,sans-serif;
  background:var(--bg); color:var(--text); line-height:1.6; min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
a{color:var(--brand);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
.wrap::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(1000px 500px at 12% -8%, rgba(99,102,241,.16), transparent 60%),
    radial-gradient(800px 420px at 92% 8%, rgba(168,85,247,.14), transparent 60%),
    radial-gradient(700px 400px at 50% 108%, rgba(18,183,245,.10), transparent 60%);
}
.card{
  width:100%;max-width:420px;background:var(--panel);border:1px solid var(--line);
  border-radius:var(--radius);box-shadow:var(--shadow);padding:34px 30px;position:relative;z-index:1;
  animation:rise .4s cubic-bezier(.2,.8,.3,1) both;
}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:22px;color:var(--brand)}
.brand b{font-size:17px;font-weight:700;letter-spacing:-.2px;color:var(--text)}
h1{font-size:23px;font-weight:700;letter-spacing:-.4px;margin-bottom:6px}
.sub{color:var(--muted);font-size:14px;margin-bottom:24px}

/* 授权应用提示条 */
.appbar{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--brand-soft);
  border:1px solid var(--line);border-radius:12px;margin-bottom:22px}
.appbar .ico{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--brand),var(--brand-2));
  color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex:0 0 auto}
.appbar .n{font-weight:600;font-size:14px;line-height:1.3}
.appbar .d{font-size:12px;color:var(--muted);word-break:break-all}

.field{margin-bottom:14px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text)}
input{
  width:100%;padding:11px 13px;font-size:14px;font-family:inherit;color:var(--text);
  background:var(--bg);border:1.5px solid var(--line);border-radius:10px;outline:none;transition:.18s;
}
input:focus{border-color:var(--brand);background:var(--panel);box-shadow:0 0 0 3px rgba(99,102,241,.14)}
input::placeholder{color:#9ca3af}
.btn{
  width:100%;padding:11px 16px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;
  border:none;border-radius:10px;background:linear-gradient(135deg,var(--brand),var(--brand-2));
  color:#fff;transition:.18s;display:flex;align-items:center;justify-content:center;gap:8px;
}
.btn:hover{filter:brightness(1.08);transform:translateY(-1px);box-shadow:0 6px 18px -6px rgba(99,102,241,.6)}
.btn:active{transform:none}
.btn[disabled]{opacity:.6;cursor:not-allowed;transform:none}
.btn.ghost{background:transparent;border:1.5px solid var(--line);color:var(--text)}
.btn.ghost:hover{border-color:var(--brand);color:var(--brand);box-shadow:none;filter:none}

.divider{display:flex;align-items:center;gap:12px;margin:20px 0 16px;color:var(--muted);font-size:12px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--line)}

.oauth{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.oauth a{
  display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;border-radius:10px;
  font-size:13.5px;font-weight:600;transition:.18s;border:1.5px solid var(--line);color:var(--text);
}
.oauth a:hover{text-decoration:none;transform:translateY(-1px)}
.oauth .qq{color:#fff;background:var(--qq);border-color:var(--qq)}
.oauth .qq:hover{box-shadow:0 6px 18px -6px rgba(18,183,245,.7)}
.oauth .gh{color:#fff;background:var(--gh);border-color:var(--gh)}
@media (prefers-color-scheme:dark){.oauth .gh{color:#0b0d13}}
.oauth .gh:hover{box-shadow:0 6px 18px -6px rgba(36,41,47,.6)}

.alert{padding:10px 13px;border-radius:10px;font-size:13px;margin-bottom:16px;display:none}
.alert.err{display:block;background:rgba(239,68,68,.1);color:var(--danger);border:1px solid rgba(239,68,68,.25)}
.alert.ok{display:block;background:rgba(16,185,129,.1);color:var(--ok);border:1px solid rgba(16,185,129,.25)}

.foot{text-align:center;margin-top:20px;font-size:13px;color:var(--muted)}
.foot a{font-weight:600}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}

/* 授权同意页 scope 列表 */
.scopes{list-style:none;margin:0 0 20px;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.scopes li{display:flex;gap:10px;padding:11px 14px;font-size:13.5px;border-bottom:1px solid var(--line)}
.scopes li:last-child{border-bottom:none}
.scopes li svg{color:var(--ok);flex:0 0 auto;margin-top:3px}
.scopes li span b{display:block;font-weight:600}
.scopes li span i{font-style:normal;color:var(--muted);font-size:12.5px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* 首页 */
.landing{max-width:820px}
.hero{text-align:center;margin-bottom:32px}
.hero h2{font-size:32px;font-weight:800;letter-spacing:-.8px;margin-bottom:10px;
  background:linear-gradient(135deg,var(--brand),var(--brand-2));-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p{color:var(--muted);font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px}
.tile{padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--bg);transition:.18s}
.tile:hover{border-color:var(--brand);transform:translateY(-2px)}
.tile b{display:block;font-size:14px;margin-bottom:4px}
.tile span{font-size:12.5px;color:var(--muted)}
.endpoints{font-size:12.5px}
.endpoints code{background:var(--bg);padding:2px 6px;border-radius:5px;font-size:12px;border:1px solid var(--line)}

/* 个人中心 */
.profile{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.avatar{width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid var(--line);background:var(--bg)}
.kv{display:grid;grid-template-columns:88px 1fr;gap:8px 12px;font-size:13.5px;padding:14px 0;border-top:1px solid var(--line)}
.kv dt{color:var(--muted)}
.kv dd{word-break:break-all}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11.5px;font-weight:600;
  background:var(--brand-soft);color:var(--brand);border:1px solid var(--line)}
.badge.off{opacity:.45}

.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(80px);
  background:var(--text);color:var(--panel);padding:10px 18px;border-radius:10px;font-size:13.5px;
  z-index:99;transition:.3s;opacity:0;pointer-events:none}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}
`;

/* ============================ 页面骨架 ============================ */

function page({ title, body, siteName = 'MZY SSO', extra = '' }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#4f46e5">
<title>${esc(title)} · ${esc(siteName)}</title>
<style>${CSS}${extra}</style>
</head>
<body>${body}</body>
</html>`;
}

export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function brandRow(siteName) {
  return `<div class="brand">${ICONS.shield}<b>${esc(siteName)}</b></div>`;
}

function errorBox(msg) {
  return msg ? `<div class="alert err">${esc(msg)}</div>` : '';
}

/* ============================ 登录页 ============================ */

export function loginPage({ siteName, error, redirectUri, app, allowRegister, qqEnabled, githubEnabled }) {
  const appBar = app ? `
    <div class="appbar">
      <div class="ico">${esc((app.name || '?').slice(0, 1).toUpperCase())}</div>
      <div>
        <div class="n">${esc(app.name)}</div>
        <div class="d">正在请求授权登录</div>
      </div>
    </div>` : '';

  const socialBtns = (qqEnabled || githubEnabled) ? `
    <div class="divider">或使用第三方账号</div>
    <div class="oauth">
      ${qqEnabled ? `<a class="qq" href="/api/connect/qq?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">${ICONS.qq} QQ 登录</a>` : ''}
      ${githubEnabled ? `<a class="gh" href="/api/connect/github?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">${ICONS.github} GitHub</a>` : ''}
    </div>` : '';

  const body = `<div class="wrap"><div class="card">
    ${brandRow(siteName)}
    ${appBar}
    <h1>欢迎回来</h1>
    <p class="sub">${app ? '登录后即可授权第三方应用' : '登录以继续'}</p>
    ${errorBox(error)}
    <form method="POST" action="/login" autocomplete="on">
      <input type="hidden" name="redirect_uri" value="${esc(redirectUri || '/profile')}">
      <div class="field">
        <label for="account">用户名或邮箱</label>
        <input id="account" name="account" type="text" placeholder="username 或 you@example.com" required autofocus autocomplete="username">
      </div>
      <div class="field">
        <label for="password">密码</label>
        <input id="password" name="password" type="password" placeholder="请输入密码" required autocomplete="current-password">
      </div>
      <button class="btn" type="submit">登 录</button>
    </form>
    ${socialBtns}
    ${allowRegister ? `<p class="foot">还没有账号？<a href="/register?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">立即注册</a></p>` : ''}
  </div></div>`;

  return page({ title: '登录', siteName, body });
}

/* ============================ 注册页 ============================ */

export function registerPage({ siteName, error, redirectUri, qqEnabled, githubEnabled }) {
  const socialBtns = (qqEnabled || githubEnabled) ? `
    <div class="divider">或使用第三方账号</div>
    <div class="oauth">
      ${qqEnabled ? `<a class="qq" href="/api/connect/qq?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">${ICONS.qq} QQ 注册</a>` : ''}
      ${githubEnabled ? `<a class="gh" href="/api/connect/github?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">${ICONS.github} GitHub</a>` : ''}
    </div>` : '';

  const body = `<div class="wrap"><div class="card">
    ${brandRow(siteName)}
    <h1>创建账号</h1>
    <p class="sub">一个账号，通行所有接入的应用</p>
    ${errorBox(error)}
    <form method="POST" action="/register">
      <input type="hidden" name="redirect_uri" value="${esc(redirectUri || '/profile')}">
      <div class="field">
        <label for="username">用户名</label>
        <input id="username" name="username" type="text" placeholder="3-20 位字母、数字或下划线" required autofocus>
      </div>
      <div class="field">
        <label for="email">邮箱</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required>
      </div>
      <div class="field">
        <label for="password">密码</label>
        <input id="password" name="password" type="password" placeholder="至少 6 位" required minlength="6">
      </div>
      <div class="field">
        <label for="password2">确认密码</label>
        <input id="password2" name="password2" type="password" placeholder="再输入一次" required minlength="6">
      </div>
      <button class="btn" type="submit">注 册</button>
    </form>
    ${socialBtns}
    <p class="foot">已有账号？<a href="/login?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">去登录</a></p>
  </div></div>`;

  return page({ title: '注册', siteName, body });
}

/* ============================ 授权同意页 ============================ */

export function consentPage({ siteName, app, user, scopes, params }) {
  const scopeItems = scopes.map(s => `
    <li>${ICONS.check}<span><b>${esc(s)}</b><i>${esc(SCOPE_TEXT[s] || '访问你的账号信息')}</i></span></li>
  `).join('');

  const hidden = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('');

  const body = `<div class="wrap"><div class="card">
    ${brandRow(siteName)}
    <div class="appbar">
      <div class="ico">${esc((app.name || '?').slice(0, 1).toUpperCase())}</div>
      <div>
        <div class="n">${esc(app.name)}</div>
        <div class="d">请求访问你的账号</div>
      </div>
    </div>
    <h1>授权确认</h1>
    <p class="sub">以 <b>${esc(user.nickname || user.username)}</b> 的身份授权，该应用将获得以下权限：</p>
    <ul class="scopes">${scopeItems}</ul>
    <form method="POST" action="/oauth/authorize/decision">
      ${hidden}
      <div class="actions">
        <button class="btn ghost" type="submit" name="decision" value="deny">取消</button>
        <button class="btn" type="submit" name="decision" value="allow">同意授权 ${ICONS.arrow}</button>
      </div>
    </form>
  </div></div>`;

  return page({ title: '授权确认', siteName, body });
}

const SCOPE_TEXT = {
  openid: '用于标识你的唯一身份',
  profile: '读取你的昵称、头像等公开资料',
  email: '读取你的邮箱地址',
  uid: '读取你在 SSO 中的唯一 ID',
  username: '读取你的用户名',
  groups: '读取你所属的用户组'
};

/* ============================ 首页 ============================ */

export function homePage({ siteName, issuer, user, qqEnabled, githubEnabled, stats }) {
  const tiles = `
    <div class="grid">
      <div class="tile"><b>账号密码登录</b><span>内置用户体系，PBKDF2 加密存储</span></div>
      <div class="tile"><b>QQ 快捷登录</b><span>${qqEnabled ? '小白菜聚合登录已接入' : '未配置'}</span></div>
      <div class="tile"><b>GitHub 登录</b><span>${githubEnabled ? 'OAuth App 已接入' : '未配置'}</span></div>
      <div class="tile"><b>标准 OAuth 2.0</b><span>authorization_code + PKCE + OIDC</span></div>
    </div>`;

  const ep = `
    <div class="endpoints">
      <p style="color:var(--muted);margin-bottom:10px;font-weight:600">标准端点</p>
      <dl class="kv">
        <dt>Issuer</dt><dd>${esc(issuer)}</dd>
        <dt>授权</dt><dd><code>GET /oauth/authorize</code></dd>
        <dt>令牌</dt><dd><code>POST /oauth/token</code></dd>
        <dt>用户信息</dt><dd><code>GET /oauth/userinfo</code></dd>
        <dt>发现文档</dt><dd><a href="/.well-known/openid-configuration"><code>/.well-known/openid-configuration</code></a></dd>
      </dl>
    </div>`;

  const actions = user
    ? `<a class="btn" href="/profile" style="margin-bottom:10px">进入个人中心</a>
       <a class="btn ghost" href="/logout">退出登录</a>`
    : `<a class="btn" href="/login" style="margin-bottom:10px">登 录</a>
       <a class="btn ghost" href="/docs">接入文档</a>`;

  const body = `<div class="wrap"><div class="card landing">
    ${brandRow(siteName)}
    <div class="hero">
      <h2>一个账号，通行全部应用</h2>
      <p>${esc(siteName)} —— 运行在 Cloudflare 全球边缘网络的轻量级单点登录服务</p>
    </div>
    ${tiles}
    ${actions}
    ${ep}
    <p class="foot"><a href="/docs">开发者接入文档</a> · <a href="/admin">管理后台</a></p>
  </div></div>`;

  return page({ title: '单点登录', siteName, body });
}

/* ============================ 个人中心 ============================ */

export function profilePage({ siteName, user, message }) {
  const providers = user.providers || {};
  const bindRow = (key, name, info) => `
    <div class="row" style="padding:12px 0;border-top:1px solid var(--line)">
      <div>
        <b style="font-size:14px">${esc(name)}</b><br>
        <span style="font-size:12.5px;color:var(--muted)">${info ? esc(info.label) : '未绑定'}</span>
      </div>
      ${info
        ? `<form method="POST" action="/profile/unbind"><input type="hidden" name="provider" value="${key}"><button class="btn ghost" style="width:auto;padding:6px 14px;font-size:12.5px" type="submit">解绑</button></form>`
        : `<a class="btn ghost" style="width:auto;padding:6px 14px;font-size:12.5px" href="/api/connect/${key}?redirect_uri=/profile&bind=1">绑定</a>`}
    </div>`;

  const body = `<div class="wrap"><div class="card">
    ${brandRow(siteName)}
    ${message ? `<div class="alert ok">${esc(message)}</div>` : ''}
    <div class="profile">
      <img class="avatar" src="${esc(user.avatar || defaultAvatar(user.uid))}" alt="avatar">
      <div>
        <h1 style="font-size:19px;margin-bottom:2px">${esc(user.nickname || user.username)}</h1>
        <div style="color:var(--muted);font-size:13px">${esc(user.email || '未设置邮箱')}</div>
      </div>
    </div>

    <dl class="kv">
      <dt>UID</dt><dd><code>${esc(user.uid)}</code></dd>
      <dt>用户名</dt><dd>${esc(user.username || '-')}</dd>
      <dt>注册时间</dt><dd>${new Date(user.created_at).toLocaleString('zh-CN')}</dd>
      <dt>身份</dt><dd>${user.is_admin ? '<span class="badge">管理员</span>' : '<span class="badge">普通用户</span>'}</dd>
    </dl>

    <form method="POST" action="/profile/update" style="margin-top:14px">
      <div class="field">
        <label for="nickname">昵称</label>
        <input id="nickname" name="nickname" value="${esc(user.nickname || '')}" placeholder="你的昵称">
      </div>
      <div class="field">
        <label for="avatar">头像 URL</label>
        <input id="avatar" name="avatar" value="${esc(user.avatar || '')}" placeholder="https://...">
      </div>
      <button class="btn" type="submit">保存资料</button>
    </form>

    <div style="margin-top:24px">
      <p style="font-size:13px;font-weight:600;margin-bottom:4px">第三方账号</p>
      ${bindRow('qq', 'QQ', providers.qq ? { label: providers.qq.nickname || `ID ${providers.qq.social_uid}` } : null)}
      ${bindRow('github', 'GitHub', providers.github ? { label: providers.github.login || `ID ${providers.github.id}` } : null)}
    </div>

    <p class="foot">
      ${user.is_admin ? '<a href="/admin">管理后台</a> · ' : ''}
      <a href="/docs">接入文档</a> ·
      <a href="/logout">退出登录</a>
    </p>
  </div></div>`;

  return page({ title: '个人中心', siteName, body });
}

function defaultAvatar(uid) {
  const seed = encodeURIComponent(uid || 'mzy');
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=eef2ff`;
}

/* ============================ 错误页 ============================ */

export function errorPage({ siteName, title, message, status = 400 }) {
  const body = `<div class="wrap"><div class="card" style="text-align:center">
    ${brandRow(siteName)}
    <h1>${esc(title)}</h1>
    <p class="sub">${esc(message)}</p>
    <a class="btn" href="/">返回首页</a>
  </div></div>`;
  return new Response(page({ title, siteName, body }), {
    status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

export { ICONS, page };
