/**
 * 设计系统 v2 —— MZY SSO
 *
 * 视觉方向：中性色底 + 蓝紫强调，克制的高级感。
 * 全部内联，无外部字体/图标库依赖（Worker 单文件，秒开）。
 * 深浅色跟随系统，可用页脚切换按钮手动覆盖（写入 localStorage）。
 */

/* ============================ 图标 ============================ */

const ICONS = {
  shield: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5.5L12 2 4 5.5V12c0 6 8 10 8 10z"/><path d="M9.2 12.2l2 2 3.6-3.9"/></svg>`,
  qq: `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12.003 2c-2.265 0-4.29 1.302-5.28 3.232-1.54.392-2.91 1.31-3.86 2.62-1.14 1.572-1.76 3.615-1.76 5.756 0 .66.09 1.31.26 1.94-.53.88-.83 1.87-.83 2.9 0 .48.06.95.18 1.4-.14.46-.22.94-.22 1.44 0 1.32.53 2.55 1.44 3.46.61.61 1.4 1.03 2.28 1.22-.06 1.86.3 3.53 1.03 4.75.5-1.28 1-2.99 1.16-4.9.55.08 1.12.12 1.7.12.58 0 1.15-.04 1.7-.12.16 1.91.66 3.62 1.16 4.9.73-1.22 1.09-2.89 1.03-4.75.88-.19 1.67-.61 2.28-1.22.91-.91 1.44-2.14 1.44-3.46 0-.5-.08-.98-.22-1.44.12-.45.18-.92.18-1.4 0-1.03-.3-2.02-.83-2.9.17-.63.26-1.28.26-1.94 0-2.14-.62-4.18-1.76-5.76-.95-1.31-2.32-2.23-3.86-2.61C16.293 3.302 14.268 2 12.003 2zm-.53 15.29c-.53 0-1.02-.05-1.49-.14.12-.9.36-1.74.7-2.5.36.06.73.1 1.12.1.39 0 .76-.04 1.12-.1.34.76.58 1.6.7 2.5-.47.09-.96.14-1.49.14z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.61-.02 2.9-.02 3.3 0 .32.21.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M12 5l7 7-7 7"/></svg>`,
  user: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  key: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  apps: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
  token: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  server: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
};

/* ============================ 设计系统 ============================ */

const CSS = `
/* ---------- 设计令牌 ---------- */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#fbfbfd; --bg-2:#f4f4f7; --surface:#fff; --surface-2:#fafafc;
  --text:#101014; --text-2:#52525b; --muted:#8b8b96;
  --border:#e9e9ef; --border-2:#dcdce4;
  --brand:#5b5bd6; --brand-2:#8b5cf6; --brand-3:#a78bfa;
  --brand-soft:#f0effe; --brand-ring:rgba(91,91,214,.16);
  --ok:#0d9488; --ok-soft:#ecfdf7; --warn:#d97706; --warn-soft:#fffbeb;
  --danger:#dc2626; --danger-soft:#fef2f2;
  --qq:#12b7f5; --gh:#1c2024;
  --r-sm:8px; --r:11px; --r-lg:15px; --r-xl:20px;
  --sh-1:0 1px 2px rgba(16,16,20,.05);
  --sh-2:0 1px 3px rgba(16,16,20,.06),0 4px 12px -2px rgba(16,16,20,.05);
  --sh-3:0 2px 6px rgba(16,16,20,.05),0 12px 32px -8px rgba(16,16,20,.1);
  --sh-brand:0 6px 20px -6px rgba(91,91,214,.5);
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
}
html[data-theme="dark"]{
  --bg:#08080b; --bg-2:#0e0e13; --surface:#131318; --surface-2:#18181e;
  --text:#fafafb; --text-2:#c4c4ce; --muted:#7d7d8a;
  --border:#232329; --border-2:#2e2e37;
  --brand:#7c7ce8; --brand-2:#a78bfa; --brand-3:#c4b5fd;
  --brand-soft:#1a1a2e; --brand-ring:rgba(124,124,232,.22);
  --ok:#2dd4bf; --ok-soft:#0c211c; --warn:#fbbf24; --warn-soft:#211a0c;
  --danger:#f87171; --danger-soft:#20100f;
  --gh:#fafafb;
  --sh-1:0 1px 2px rgba(0,0,0,.4);
  --sh-2:0 1px 3px rgba(0,0,0,.5),0 4px 12px -2px rgba(0,0,0,.4);
  --sh-3:0 2px 6px rgba(0,0,0,.4),0 12px 32px -8px rgba(0,0,0,.6);
  --sh-brand:0 6px 20px -6px rgba(124,124,232,.45);
}

html{-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-behavior:smooth}
body{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI Variable","Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",Roboto,sans-serif;
  background:var(--bg);color:var(--text);line-height:1.62;min-height:100vh;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  font-feature-settings:"cv02","cv03","cv04","cv11";
  overflow-x:hidden;overscroll-behavior-y:none;
}
a{color:var(--brand);text-decoration:none;transition:.15s}
a:hover{color:var(--brand-2)}
button{font-family:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
input,textarea,select{font-family:inherit;-webkit-tap-highlight-color:transparent}
img,svg{max-width:100%}
::selection{background:var(--brand-ring);color:var(--text)}

/* 移动端：安全区（刘海屏 / 底部横条）适配 */
@supports(padding:max(0px)){
  .auth-panel{padding-left:max(32px,env(safe-area-inset-left));padding-right:max(32px,env(safe-area-inset-right))}
  .content{padding-bottom:max(56px,env(safe-area-inset-bottom))}
  .land-foot{padding-bottom:max(26px,env(safe-area-inset-bottom))}
  .toast{bottom:max(26px,calc(env(safe-area-inset-bottom) + 14px))}
}

/* 移动端：输入框字号不低于 16px，否则 iOS Safari 聚焦时会强制放大页面 */
@media(max-width:700px){
  .input,.textarea,select,input[type="text"],input[type="email"],
  input[type="password"],input[type="search"],input[type="url"]{font-size:16px !important}
}

/* 滚动条 */
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:6px;border:3px solid var(--bg)}
::-webkit-scrollbar-thumb:hover{background:var(--muted)}

/* ---------- 通用组件 ---------- */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:0 15px;height:38px;border-radius:var(--r);border:1px solid transparent;
  font-size:13.5px;font-weight:600;cursor:pointer;transition:.16s cubic-bezier(.4,0,.2,1);
  background:var(--surface);color:var(--text);white-space:nowrap;
}
.btn:hover{transform:translateY(-1px)}
.btn:active{transform:translateY(0)}
.btn[disabled]{opacity:.5;cursor:not-allowed;transform:none}
.btn-primary{
  background:linear-gradient(135deg,var(--brand),var(--brand-2));color:#fff;box-shadow:var(--sh-brand);
}
.btn-primary:hover{filter:brightness(1.07);box-shadow:0 8px 24px -6px rgba(91,91,214,.6)}
.btn-secondary{background:var(--surface);border-color:var(--border-2);color:var(--text);box-shadow:var(--sh-1)}
.btn-secondary:hover{border-color:var(--brand);color:var(--brand);background:var(--surface)}
.btn-ghost{background:transparent;color:var(--text-2)}
.btn-ghost:hover{background:var(--surface-2);color:var(--text)}
.btn-danger{background:var(--danger-soft);color:var(--danger);border-color:transparent}
.btn-danger:hover{background:var(--danger);color:#fff}
.btn-sm{height:30px;padding:0 11px;font-size:12.5px;border-radius:var(--r-sm);gap:5px}
.btn-block{width:100%}

.card{
  background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);
  box-shadow:var(--sh-1);
}
.badge{
  display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;
  font-size:11.5px;font-weight:600;line-height:1.6;background:var(--surface-2);
  color:var(--text-2);border:1px solid var(--border);
}
.badge-brand{background:var(--brand-soft);color:var(--brand);border-color:transparent}
.badge-ok{background:var(--ok-soft);color:var(--ok);border-color:transparent}
.badge-warn{background:var(--warn-soft);color:var(--warn);border-color:transparent}
.badge-danger{background:var(--danger-soft);color:var(--danger);border-color:transparent}
.badge-mono{font-family:var(--mono);font-size:11px}

.field{margin-bottom:15px}
.field>label{display:block;font-size:12.5px;font-weight:600;margin-bottom:6px;color:var(--text-2);letter-spacing:.01em}
.input,.textarea{
  width:100%;padding:9px 12px;font-size:13.5px;font-family:inherit;color:var(--text);
  background:var(--surface);border:1.5px solid var(--border-2);border-radius:var(--r);
  outline:none;transition:.16s;
}
.input::placeholder,.textarea::placeholder{color:var(--muted)}
.input:hover,.textarea:hover{border-color:var(--muted)}
.input:focus,.textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3.5px var(--brand-ring)}
.textarea{resize:vertical;min-height:76px;font-family:var(--mono);font-size:12.5px;line-height:1.7}
.hint{font-size:11.5px;color:var(--muted);margin-top:5px;line-height:1.5}
.auth-note{display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--muted);
  line-height:1.6;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)}
.auth-note svg{flex-shrink:0;margin-top:2px;opacity:.75}
.check{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--text-2);cursor:pointer;margin-bottom:9px}
.check input{margin-top:3px;accent-color:var(--brand);width:15px;height:15px;cursor:pointer}

/* ---------- 认证页（登录/注册） ---------- */
.auth{min-height:100vh;display:grid;grid-template-columns:1fr 1fr}
@media(max-width:900px){.auth{grid-template-columns:1fr}}
.auth-brand{
  position:relative;overflow:hidden;padding:48px;display:flex;flex-direction:column;
  background:
    radial-gradient(circle at 20% 15%, rgba(139,92,246,.18), transparent 45%),
    radial-gradient(circle at 85% 75%, rgba(91,91,214,.20), transparent 50%),
    linear-gradient(160deg,#171633,#0e0e1a 60%);
  color:#fff;
}
.auth-brand::after{
  content:'';position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);
  background-size:42px 42px;
  mask-image:radial-gradient(ellipse 80% 70% at 50% 40%,#000,transparent);
}
@media(max-width:900px){.auth-brand{display:none}}
.auth-brand>*{position:relative;z-index:1}
.auth-logo{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;letter-spacing:-.02em}
.auth-logo svg{width:26px;height:26px}
.auth-hero{margin-top:auto;margin-bottom:auto;max-width:400px}
.auth-hero h2{font-size:31px;font-weight:750;line-height:1.25;letter-spacing:-.03em;margin-bottom:14px}
.auth-hero p{color:rgba(255,255,255,.62);font-size:14.5px;line-height:1.75}
.auth-feats{list-style:none;margin-top:30px;space-y:0}
.auth-feats li{
  display:flex;align-items:center;gap:10px;padding:9px 0;font-size:13.5px;
  color:rgba(255,255,255,.82);border-top:1px solid rgba(255,255,255,.08);
}
.auth-feats li:first-child{border-top:none}
.auth-feats svg{flex:0 0 auto;opacity:.85}
.auth-foot{font-size:12px;color:rgba(255,255,255,.4);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.auth-foot .dot{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.3)}

.auth-panel{display:flex;align-items:center;justify-content:center;padding:40px 32px;background:var(--bg)}
.auth-box{width:100%;max-width:368px;animation:up .45s cubic-bezier(.16,1,.3,1) both}
@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
/* 单栏（手机）时：取消垂直居中，内容从顶部自然开始，避免整块被推到屏幕中段 */
@media(max-width:900px){
  .auth{min-height:0}
  .auth-panel{display:block;padding:34px 22px 46px;min-height:100vh}
  .auth-box{max-width:420px;margin:0 auto}
}
.auth-mobile-logo{display:none;align-items:center;gap:9px;font-size:15px;font-weight:700;margin-bottom:26px}
@media(max-width:900px){.auth-mobile-logo{display:flex}}
.auth-mobile-logo svg{width:24px;height:24px;color:var(--brand)}
.auth-title{font-size:22px;font-weight:700;letter-spacing:-.025em;margin-bottom:6px}
.auth-sub{color:var(--muted);font-size:13.5px;margin-bottom:26px}

.app-bar{
  display:flex;align-items:center;gap:11px;padding:11px 13px;margin-bottom:22px;
  background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);
}
.app-icon{
  width:34px;height:34px;border-radius:9px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--brand),var(--brand-2));color:#fff;font-weight:700;font-size:14px;
}
.app-bar .n{font-weight:650;font-size:13.5px;line-height:1.35}
.app-bar .d{font-size:11.5px;color:var(--muted)}

.section-label{
  display:flex;align-items:center;gap:11px;margin:22px 0 14px;
  font-size:11.5px;color:var(--muted);font-weight:600;letter-spacing:.03em;
}
.section-label::before,.section-label::after{content:'';flex:1;height:1px;background:var(--border)}

.oauth-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.oauth-btn{
  display:flex;align-items:center;justify-content:center;gap:7px;height:38px;border-radius:var(--r);
  font-size:13px;font-weight:600;color:#fff;border:none;transition:.16s;
}
.oauth-btn:hover{color:#fff;transform:translateY(-1px);filter:brightness(1.06)}
.oauth-btn.qq{background:var(--qq);box-shadow:0 4px 14px -5px rgba(18,183,245,.6)}
.oauth-btn.gh{background:var(--gh);box-shadow:0 4px 14px -5px rgba(0,0,0,.4)}

.alert{
  display:flex;align-items:flex-start;gap:9px;padding:10px 13px;border-radius:var(--r);
  font-size:12.5px;margin-bottom:16px;line-height:1.55;border:1px solid transparent;
}
.alert-err{background:var(--danger-soft);color:var(--danger);border-color:color-mix(in srgb,var(--danger) 22%,transparent)}
.alert-ok{background:var(--ok-soft);color:var(--ok);border-color:color-mix(in srgb,var(--ok) 22%,transparent)}
.alert svg{flex:0 0 auto;margin-top:2px}

.auth-switch{text-align:center;margin-top:22px;font-size:13px;color:var(--muted)}
.auth-switch a{font-weight:650}

/* ---------- 落地页 ---------- */
.land{background:var(--bg)}
.land-nav{
  position:sticky;top:0;z-index:20;backdrop-filter:saturate(180%) blur(14px);
  background:color-mix(in srgb,var(--bg) 82%,transparent);
  border-bottom:1px solid var(--border);
}
.land-nav-in{max-width:1080px;margin:0 auto;padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between}
.land-logo{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:700;letter-spacing:-.02em;color:var(--text)}
.land-logo svg{color:var(--brand);width:23px;height:23px}
.land-nav-right{display:flex;align-items:center;gap:8px}

.land-hero{max-width:1080px;margin:0 auto;padding:76px 24px 56px;text-align:center;position:relative}
.land-hero::before{
  content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:radial-gradient(ellipse 55% 45% at 50% 0%,var(--brand-ring),transparent 70%);
}
.eyebrow{
  display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:20px;
  font-size:12px;font-weight:600;background:var(--surface);border:1px solid var(--border);
  color:var(--text-2);box-shadow:var(--sh-1);margin-bottom:22px;
}
.eyebrow .pulse{width:6px;height:6px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px var(--ok-soft);animation:pulse 2.4s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.land-hero h1{
  font-size:clamp(34px,5.5vw,52px);font-weight:780;letter-spacing:-.038em;line-height:1.1;margin-bottom:18px;
  background:linear-gradient(180deg,var(--text),color-mix(in srgb,var(--text) 72%,transparent));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.land-hero p{font-size:16.5px;color:var(--text-2);max-width:540px;margin:0 auto 30px;line-height:1.72}
.land-cta{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}

.land-sec{max-width:1080px;margin:0 auto;padding:0 24px 68px}
.land-sec-h{text-align:center;margin-bottom:32px}
.land-sec-h h2{font-size:26px;font-weight:720;letter-spacing:-.028em;margin-bottom:8px}
.land-sec-h p{color:var(--muted);font-size:14.5px}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(272px,1fr));gap:14px}
.tile{
  padding:22px;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--surface);
  transition:.18s;box-shadow:var(--sh-1);
}
.tile:hover{border-color:var(--brand-3);transform:translateY(-2px);box-shadow:var(--sh-3)}
.tile-ico{
  width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  background:var(--brand-soft);color:var(--brand);margin-bottom:13px;
}
.tile h3{font-size:14.5px;font-weight:680;margin-bottom:6px;letter-spacing:-.01em}
.tile p{font-size:13px;color:var(--muted);line-height:1.65}

.land-cta-bar{
  max-width:1080px;margin:0 auto 72px;padding:0 24px;
}
.cta-inner{
  padding:40px 36px;border-radius:var(--r-xl);text-align:center;position:relative;overflow:hidden;
  background:linear-gradient(135deg,#1c1c3a,#2a1f4d);color:#fff;
}
.cta-inner::after{
  content:'';position:absolute;inset:0;
  background:radial-gradient(circle at 25% 20%,rgba(139,92,246,.28),transparent 55%),
             radial-gradient(circle at 78% 85%,rgba(91,91,214,.26),transparent 50%);
}
.cta-inner>*{position:relative;z-index:1}
.cta-inner h2{font-size:24px;font-weight:730;letter-spacing:-.025em;margin-bottom:9px}
.cta-inner p{color:rgba(255,255,255,.66);font-size:14px;margin-bottom:22px}

.land-foot{border-top:1px solid var(--border);padding:26px 24px;text-align:center;font-size:12.5px;color:var(--muted)}
.land-foot-in{max-width:1080px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}

/* ---------- 控制台 ---------- */
.console{display:grid;grid-template-columns:224px 1fr;min-height:100vh;background:var(--bg-2)}
@media(max-width:860px){.console{grid-template-columns:1fr}}
.sidebar{
  background:var(--surface);border-right:1px solid var(--border);padding:16px 12px;
  display:flex;flex-direction:column;gap:3px;position:sticky;top:0;height:100vh;overflow-y:auto;
}
@media(max-width:860px){
  .sidebar{
    position:sticky;top:0;height:auto;flex-direction:row;align-items:center;
    overflow-x:auto;overflow-y:hidden;border-right:none;border-bottom:1px solid var(--border);
    padding:8px 10px;gap:4px;z-index:16;scrollbar-width:none;
    -webkit-overflow-scrolling:touch;
  }
  .sidebar::-webkit-scrollbar{display:none}
  /* 手机端导航换行后高度不定，两个 sticky 元素会互相遮挡：
     让导航独占吸顶，顶栏改为普通流式布局，滚动时自然收起 */
  .topbar{position:static}
}
/* 窄屏（手机）：标签栏换行铺满，保证「令牌管理 / 系统状态」等入口不被截断 */
@media(max-width:640px){
  .sidebar{
    flex-wrap:wrap;overflow:visible;padding:8px 10px;gap:5px;
  }
  .side-link{
    flex:1 1 calc(50% - 5px);justify-content:center;min-width:0;
    padding:9px 6px;font-size:12.5px;gap:6px;
  }
  .side-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
}
.side-brand{display:flex;align-items:center;gap:9px;padding:8px 10px 16px;font-weight:700;font-size:14px;letter-spacing:-.02em}
.side-brand svg{color:var(--brand);width:22px;height:22px;flex:0 0 auto}
.side-label{font-size:10.5px;font-weight:700;color:var(--muted);letter-spacing:.06em;padding:12px 10px 6px;text-transform:uppercase}
.side-link{
  display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:var(--r-sm);
  font-size:13px;font-weight:550;color:var(--text-2);transition:.14s;white-space:nowrap;
}
.side-link:hover{background:var(--surface-2);color:var(--text);text-decoration:none}
.side-link.on{background:var(--brand-soft);color:var(--brand);font-weight:650}
.side-link svg{flex:0 0 auto;opacity:.85}
.side-link.on svg{opacity:1}
.side-foot{margin-top:auto;padding:10px;font-size:11px;color:var(--muted);border-top:1px solid var(--border);line-height:1.6}
@media(max-width:860px){
  .side-foot{display:none}
  .side-label{display:none}
  .side-brand{display:none}
  .side-link{padding:8px 12px;font-size:13.5px;flex:0 0 auto}
  .side-link.on{background:var(--brand);color:#fff}
  .side-link.on svg{opacity:1}
}

.main{min-width:0;display:flex;flex-direction:column}
.topbar{
  height:56px;padding:0 26px;display:flex;align-items:center;justify-content:space-between;gap:14px;
  background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(10px);
  border-bottom:1px solid var(--border);position:sticky;top:0;z-index:15;
}
.topbar h1{font-size:16px;font-weight:700;letter-spacing:-.02em}
.topbar .crumb{font-size:12px;color:var(--muted);font-weight:500}
.top-right{display:flex;align-items:center;gap:9px}
.content{padding:24px 26px 56px;flex:1;min-width:0}
@media(max-width:640px){
  .content{padding:16px 14px 40px}
  .topbar{display:grid;grid-template-columns:1fr auto;
    padding:11px 14px;height:auto;min-height:0;gap:10px;align-items:center}
  .topbar h1{font-size:15px}
  .topbar .crumb{display:none}
  .top-right{gap:6px}
}

.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.page-head h2{font-size:17px;font-weight:700;letter-spacing:-.02em;margin-bottom:3px}
.page-head p{font-size:13px;color:var(--muted)}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(146px,1fr));gap:12px;margin-bottom:22px}
.stat{padding:15px 16px;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--surface);box-shadow:var(--sh-1)}
.stat-v{font-size:23px;font-weight:750;letter-spacing:-.03em;line-height:1.2}
.stat-l{font-size:11.5px;color:var(--muted);margin-top:2px;font-weight:550}
.stat-ico{float:right;color:var(--brand);opacity:.5}

.sec{margin-bottom:22px}
.sec-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.sec-h h3{font-size:14.5px;font-weight:680;letter-spacing:-.015em}
.sec-h p{font-size:12.5px;color:var(--muted);margin-top:2px}

/* 表格 */
.tbl-card{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--surface);overflow:hidden;box-shadow:var(--sh-1)}
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{
  text-align:left;padding:9px 14px;font-size:11px;font-weight:700;color:var(--muted);
  letter-spacing:.045em;text-transform:uppercase;background:var(--surface-2);
  border-bottom:1px solid var(--border);white-space:nowrap;
}
tbody td{padding:12px 14px;border-bottom:1px solid var(--border);vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
tbody tr{transition:.12s}
tbody tr:hover{background:var(--surface-2)}
td .t-main{font-weight:600;font-size:13px}
td .t-sub{font-size:11.5px;color:var(--muted);margin-top:1px}
.row-acts{display:flex;gap:6px;justify-content:flex-end}
code,.mono{font-family:var(--mono);font-size:11.5px;background:var(--surface-2);
  padding:2px 6px;border-radius:5px;border:1px solid var(--border);word-break:break-all}
.empty{padding:44px 20px;text-align:center;color:var(--muted);font-size:13px}
.empty svg{opacity:.35;margin-bottom:10px}

/* 移动端：表格转卡片列表，避免横向滚动 */
@media(max-width:700px){
  .tbl-wrap{overflow-x:visible}
  .tbl-card{border:none;background:none;box-shadow:none;border-radius:0}
  table{font-size:14px}

  /* 仅对「带 data-label 的表格」做卡片化；纯 label/value 表（如账号信息）保持原样 */
  thead{display:none}
  tbody tr:has(td[data-label]){
    display:block;background:var(--surface);border:1px solid var(--border);
    border-radius:var(--r-lg);margin-bottom:10px;padding:4px 2px;box-shadow:var(--sh-1);
  }
  tbody tr:has(td[data-label]):hover{background:var(--surface)}
  tbody tr:has(td[data-label]) td{
    display:flex;align-items:flex-start;justify-content:space-between;gap:14px;
    padding:9px 14px;border-bottom:1px solid var(--border);text-align:right;
  }
  tbody tr:has(td[data-label]) td:last-child{border-bottom:none}
  td[data-label]::before{
    content:attr(data-label);flex:0 0 auto;font-size:11px;font-weight:700;color:var(--muted);
    letter-spacing:.04em;text-transform:uppercase;text-align:left;padding-top:3px;
  }
  td[data-label=""]::before{display:none}

  /* 徽标 / 操作按钮等短内容：成对时并排，避免被拆成上下两行 */
  tbody tr:has(td[data-label]) td:has(.badge),
  tbody tr:has(td[data-label]) td:has(.row-acts){
    align-items:center;flex-direction:row;flex-wrap:wrap;justify-content:space-between;gap:8px;
  }
  tbody tr:has(td[data-label]) td:has(.badge) .badge{flex:0 0 auto}

  /* 含长内容的单元格：标签在上、内容在下，右对齐，长字符串自动换行 */
  tbody tr:has(td[data-label]) td:has(code),
  tbody tr:has(td[data-label]) td:has(.secret-bar){
    flex-direction:column;align-items:stretch;gap:6px;text-align:left;
  }
  tbody tr:has(td[data-label]) td:has(code)::before,
  tbody tr:has(td[data-label]) td:has(.secret-bar)::before{text-align:left;padding-top:0}
  tbody tr:has(td[data-label]) td:has(code) code,
  tbody tr:has(td[data-label]) td:has(code) .mono{
    display:block;width:100%;white-space:normal;word-break:break-all;text-align:left;
  }

  td .t-main,td .t-sub{text-align:right}
  .row-acts{justify-content:flex-end;width:auto}
  tbody td:has(.row-acts)::before{text-align:left}
  .secret-bar{flex-wrap:wrap;gap:7px}
  .secret-bar .val{flex:1 1 100%;white-space:normal;word-break:break-all}

  /* 纯 label/value 表：两列紧凑展示，值可换行 */
  tbody tr:not(:has(td[data-label])):not(:has(td[colspan])){
    display:flex;flex-wrap:wrap;border-bottom:1px solid var(--border);
  }
  tbody tr:not(:has(td[data-label])):not(:has(td[colspan])) td{
    padding:9px 14px;border-bottom:none;
  }
  tbody tr:not(:has(td[data-label])):not(:has(td[colspan])) td:first-child{
    flex:0 0 40%;color:var(--muted);font-size:12.5px;
  }
  tbody tr:not(:has(td[data-label])):not(:has(td[colspan])) td:last-child{
    flex:1;text-align:right;word-break:break-all;
  }

  /* 编辑面板行（colspan 折叠行）在卡片模式下不单独成块，面板本身照常展开 */
  tbody tr:has(> td[colspan]){background:none;border:none;box-shadow:none;margin:0;padding:0}
  tbody tr:has(> td[colspan]) > td{
    display:block;padding:0;border:none;background:none;
  }
  tbody tr:has(> td[colspan]) > td::before{display:none}

  /* 三列配置行（标签 / 说明 / 状态徽标）：说明在上，状态徽标靠右，避免徽标被挤压成竖排 */
  tbody tr:has(.cfg-badge){
    display:block;border-bottom:1px solid var(--border);
  }
  tbody tr:has(.cfg-badge) td{display:block;padding:0 14px;border-bottom:none;text-align:left}
  tbody tr:has(.cfg-badge) td:first-child{padding-top:12px;font-size:12.5px}
  tbody tr:has(.cfg-badge) td.cfg-desc{padding-top:2px;padding-bottom:10px}
  tbody tr:has(.cfg-badge) td.cfg-badge{
    width:auto !important;text-align:left !important;padding:0 14px 12px;
  }
  tbody tr:has(.cfg-badge) td.cfg-badge .badge{white-space:nowrap}
}

/* 折叠面板（编辑表单） */
.panel{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--surface);margin-bottom:16px;overflow:hidden;box-shadow:var(--sh-1)}
.panel-h{
  display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;
  cursor:pointer;user-select:none;transition:.14s;
}
.panel-h:hover{background:var(--surface-2)}
.panel-h:active{background:var(--brand-soft)}
.panel-h h3{font-size:14px;font-weight:680;display:flex;align-items:center;gap:8px;min-width:0}
.panel-h .chev{
  flex:0 0 auto;display:flex;align-items:center;justify-content:center;
  width:26px;height:26px;border-radius:50%;background:var(--surface-2);
  border:1px solid var(--border);transition:.22s;color:var(--muted);
}
.panel-h:hover .chev{color:var(--brand);border-color:color-mix(in srgb,var(--brand) 30%,transparent)}
.panel.open .panel-h .chev{transform:rotate(180deg)}
.panel.open .panel-h{border-bottom:none}
.panel-b{padding:0 18px 18px;border-top:1px solid var(--border);padding-top:16px}
.panel:not(.open) .panel-b{display:none}

.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:640px){.form-grid{grid-template-columns:1fr}}
.form-acts{display:flex;gap:9px;margin-top:16px;flex-wrap:wrap}

/* 密钥显示条 */
.secret-bar{
  display:flex;align-items:center;gap:9px;padding:9px 12px;background:var(--surface-2);
  border:1px solid var(--border);border-radius:var(--r);font-family:var(--mono);font-size:12px;
}
.secret-bar .val{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.secret-bar .val.reveal{white-space:normal;word-break:break-all}

/* 提示条 */
.notice{
  display:flex;gap:10px;padding:12px 14px;border-radius:var(--r);font-size:12.5px;line-height:1.6;
  background:var(--brand-soft);border:1px solid var(--border);color:var(--text-2);margin-bottom:16px;
}
.notice svg{flex:0 0 auto;color:var(--brand);margin-top:2px}
.notice.warn{background:var(--warn-soft)}
.notice.warn svg{color:var(--warn)}

/* toast */
.toast{
  position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(90px);
  background:var(--text);color:var(--bg);padding:10px 18px;border-radius:var(--r);
  font-size:13px;font-weight:550;z-index:200;transition:.28s cubic-bezier(.16,1,.3,1);
  opacity:0;pointer-events:none;box-shadow:var(--sh-3);display:flex;align-items:center;gap:8px;
}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}

/* 主题切换 */
.theme-btn{
  display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;
  border-radius:var(--r-sm);border:1px solid var(--border);background:var(--surface);
  color:var(--text-2);cursor:pointer;transition:.15s;
}
.theme-btn:hover{color:var(--brand);border-color:var(--brand)}

/* 文档页 */
.doc{max-width:860px;margin:0 auto;padding:0 24px 72px}
.doc-h{padding:44px 0 26px;text-align:center}
.doc-h h1{font-size:29px;font-weight:760;letter-spacing:-.03em;margin-bottom:9px}
.doc-h p{color:var(--muted);font-size:14.5px}
.doc h2{font-size:19px;font-weight:700;letter-spacing:-.025em;margin:38px 0 12px;padding-top:22px;border-top:1px solid var(--border)}
.doc h3{font-size:14.5px;font-weight:670;margin:22px 0 8px}
.doc p,.doc li{font-size:13.5px;color:var(--text-2);line-height:1.75}
.doc p{margin-bottom:11px}
.doc ul{margin:0 0 14px 19px}
.doc li{margin-bottom:5px}
.doc pre{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);
  padding:14px 16px;overflow-x:auto;margin:0 0 15px;font-size:12.5px;line-height:1.7}
.doc pre code{background:none;border:none;padding:0;font-size:12.5px;color:var(--text)}
.doc table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:15px}
.doc th,.doc td{border:1px solid var(--border);padding:8px 11px;text-align:left;vertical-align:top}
.doc th{background:var(--surface-2);font-size:11.5px}
.doc-toc{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 88%,transparent);
  backdrop-filter:blur(10px);padding:10px 0;margin-bottom:10px;display:flex;gap:6px;overflow-x:auto;
  border-bottom:1px solid var(--border)}
.doc-toc a{padding:5px 11px;border-radius:20px;font-size:12.5px;font-weight:600;color:var(--muted);
  border:1px solid var(--border);background:var(--surface);white-space:nowrap}
.doc-toc a:hover{color:var(--brand);border-color:var(--brand);text-decoration:none}
.step{display:flex;gap:11px;margin-bottom:9px;font-size:13.5px;color:var(--text-2)}
.step i{flex:0 0 auto;width:21px;height:21px;border-radius:50%;background:var(--brand);color:#fff;
  display:flex;align-items:center;justify-content:center;font-style:normal;font-size:11.5px;font-weight:700;margin-top:3px}

/* ---------- 移动端细节 ---------- */
@media(max-width:640px){
  /* 文档页：收紧留白，代码块可横滑 */
  .doc{padding:0 15px 56px}
  .doc-h{padding:28px 0 18px}
  .doc-h h1{font-size:23px}
  .doc h2{font-size:17.5px;margin:30px 0 10px;padding-top:18px}
  .doc p,.doc li{font-size:14px}
  .doc pre{padding:12px 13px;font-size:12px;border-radius:var(--r);-webkit-overflow-scrolling:touch}
  .doc-toc{padding:8px 0;gap:5px}
  .doc-toc a{padding:5px 10px;font-size:12px}

  /* 文档内表格转卡片 */
  .doc table,.doc thead,.doc tbody,.doc tr,.doc td,.doc th{display:block}
  .doc thead{display:none}
  .doc table{margin-bottom:12px}
  .doc tbody tr{
    border:1px solid var(--border);border-radius:var(--r);margin-bottom:10px;
    background:var(--surface);overflow:hidden;
  }
  .doc td{border:none;border-bottom:1px solid var(--border);padding:9px 12px;font-size:13px}
  .doc tbody tr td:last-child{border-bottom:none}
  .doc td:first-child{background:var(--surface-2);font-weight:650;color:var(--text)}

  /* 落地页 */
  .land-nav-in{padding:0 16px;height:54px}
  .land-hero{padding:48px 18px 40px}
  .land-hero p{font-size:15px;padding:0 4px}
  .land-sec{padding:0 18px 52px}
  .land-cta{flex-direction:column;align-items:stretch;padding:0 18px}
  .land-cta .btn{width:100%}
  .cta-inner{padding:30px 20px}
  .cta-inner h2{font-size:20px}
  .grid-3{grid-template-columns:1fr}
  .land-foot-in{flex-direction:column;gap:6px}

  /* 认证页 */
  .auth-panel{padding:30px 20px 44px}
  .auth-title{font-size:20px}
  .auth-brand{padding:32px 24px}
  .auth-hero h2{font-size:26px}
  .auth-mobile-logo{margin-bottom:20px}
  .oauth-grid{grid-template-columns:1fr}
  .btn{height:42px}
  .btn-sm{height:32px}

  /* 卡片与表单 */
  .stats{grid-template-columns:repeat(2,1fr);gap:10px}
  .stat-v{font-size:20px}
  .panel-h{padding:13px 14px}
  .panel-b{padding:0 14px 15px;padding-top:14px}
  .page-head{flex-direction:column;align-items:stretch;gap:12px}
  .page-head .btn,.page-head form{width:100%}
  .sec-h{flex-direction:column;align-items:stretch;gap:10px}
}
`;

/* ============================ 骨架 ============================ */

export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 主题初始化脚本：跟随系统，允许 localStorage 覆盖 */
const THEME_JS = `<script>(function(){try{
var t=localStorage.getItem('mzy-theme');
if(!t){t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-theme',t);
}catch(e){}})();</script>`;

function page({ title, body, siteName = 'MZY SSO', extra = '', desc = '' }) {
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="format-detection" content="telephone=no">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<title>${esc(title)} · ${esc(siteName)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235b5bd6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5.5L12 2 4 5.5V12c0 6 8 10 8 10z'/%3E%3Cpath d='M9.2 12.2l2 2 3.6-3.9'/%3E%3C/svg%3E">
${THEME_JS}
<style>${CSS}${extra}</style>
</head>
<body>${body}${TOAST_JS}</body>
</html>`;
}

const TOAST_JS = `
<div class="toast" id="toast"></div>
<script>
function toast(msg){var t=document.getElementById('toast');if(!t)return;
  t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('show')},2200);}
function copyText(s,label){
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(s).then(function(){toast((label||'内容')+'已复制')});}
  else{var a=document.createElement('textarea');a.value=s;document.body.appendChild(a);a.select();
    try{document.execCommand('copy');toast((label||'内容')+'已复制')}catch(e){toast('复制失败')}
    document.body.removeChild(a);}
}
function toggleTheme(){
  var cur=document.documentElement.getAttribute('data-theme');
  var next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('mzy-theme',next)}catch(e){}
}
function togglePanel(id){
  var el=document.getElementById(id);if(!el)return;
  // 目标可能是 .panel 本身（如编辑面板），也可能是内层的 .panel-b。
  // .open 必须加在 .panel 上，因为展开规则是 .panel:not(.open) .panel-b{display:none}。
  var p = el.classList.contains('panel') ? el : el.closest('.panel');
  if(!p) p = el;
  p.classList.toggle('open');
}
function revealSecret(id,btn){
  var el=document.getElementById(id);if(!el)return;
  el.classList.toggle('reveal');
  btn.textContent=el.classList.contains('reveal')?'隐藏':'显示';
}
function confirmDo(msg){return confirm(msg);}
</script>`;

/* ============================ 认证类页面 ============================ */

function authBrand(siteName, version = 'v1.1') {
  return `<div class="auth-brand">
    <div class="auth-logo">${ICONS.shield}<span>${esc(siteName)}</span></div>

    <div class="auth-hero">
      <h2>一个账号<br>通行你所有的应用</h2>
      <p>自建的单点登录服务。标准 OAuth 2.0 与 OpenID Connect，代码与数据完全由你掌控。</p>
      <ul class="auth-feats">
        <li>${ICONS.check} 账号密码 · QQ · GitHub 三种登录方式</li>
        <li>${ICONS.check} 标准 OAuth 2.0 + PKCE，任何框架零改造接入</li>
        <li>${ICONS.check} 边缘节点运行，全球低延迟</li>
        <li>${ICONS.check} 数据存在你自己的账户里，不做任何外传</li>
      </ul>
    </div>

    <div class="auth-foot">
      <span>${esc(siteName)} ${esc(version)}</span><span class="dot"></span>
      <span>Self-hosted instance</span><span class="dot"></span>
      <span>Standard OAuth 2.0 / OIDC</span>
    </div>
  </div>`;
}

const SCOPE_TEXT = {
  openid: '用于标识你的唯一身份',
  profile: '读取你的昵称、头像等公开资料',
  email: '读取你的邮箱地址',
  uid: '读取你在 SSO 中的唯一 ID',
  username: '读取你的用户名',
  groups: '读取你所属的用户组'
};

export function loginPage({ siteName, error, redirectUri, app, allowRegister, qqEnabled, githubEnabled, version }) {
  const appBar = app ? `
    <div class="app-bar">
      <div class="app-icon">${esc((app.name || '?').slice(0, 1).toUpperCase())}</div>
      <div>
        <div class="n">${esc(app.name)}</div>
        <div class="d">正在请求授权登录</div>
      </div>
    </div>` : '';

  const social = (qqEnabled || githubEnabled) ? `
    <div class="section-label">或使用第三方账号</div>
    <div class="oauth-grid">
      ${qqEnabled ? `<a class="oauth-btn qq" href="/api/connect/qq?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">${ICONS.qq} QQ 登录</a>` : ''}
      ${githubEnabled ? `<a class="oauth-btn gh" href="/api/connect/github?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">${ICONS.github} GitHub</a>` : ''}
    </div>` : '';

  const body = `<div class="auth">
    ${authBrand(siteName, version)}
    <div class="auth-panel">
      <div class="auth-box">
        <div class="auth-mobile-logo">${ICONS.shield}<span>${esc(siteName)}</span></div>
        <h1 class="auth-title">欢迎回来</h1>
        <p class="auth-sub">${app ? '登录后即可授权第三方应用' : '登录以继续使用你的账号'}</p>
        ${appBar}
        ${error ? `<div class="alert alert-err">${ICONS.shield}${esc(error)}</div>` : ''}
        <form method="POST" action="/login" autocomplete="on">
          <input type="hidden" name="redirect_uri" value="${esc(redirectUri || '/profile')}">
          <div class="field">
            <label for="account">用户名或邮箱</label>
            <input class="input" id="account" name="account" type="text" placeholder="username 或 you@example.com" required autofocus autocomplete="username">
          </div>
          <div class="field">
            <label for="password">密码</label>
            <input class="input" id="password" name="password" type="password" placeholder="请输入密码" required autocomplete="current-password">
          </div>
          <button class="btn btn-primary btn-block" type="submit" style="height:40px;margin-top:4px">登 录</button>
        </form>
        ${social}
        ${allowRegister ? `<p class="auth-switch">还没有账号？<a href="/register?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">创建账号</a></p>` : ''}
      </div>
    </div>
  </div>`;

  return page({ title: '登录', siteName, body });
}

export function registerPage({ siteName, error, redirectUri, qqEnabled, githubEnabled, version }) {
  const social = (qqEnabled || githubEnabled) ? `
    <div class="section-label">或使用第三方账号</div>
    <div class="oauth-grid">
      ${qqEnabled ? `<a class="oauth-btn qq" href="/api/connect/qq?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">${ICONS.qq} QQ 注册</a>` : ''}
      ${githubEnabled ? `<a class="oauth-btn gh" href="/api/connect/github?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">${ICONS.github} GitHub</a>` : ''}
    </div>` : '';

  const body = `<div class="auth">
    ${authBrand(siteName, version)}
    <div class="auth-panel">
      <div class="auth-box">
        <div class="auth-mobile-logo">${ICONS.shield}<span>${esc(siteName)}</span></div>
        <h1 class="auth-title">创建账号</h1>
        <p class="auth-sub">一个账号，通行所有接入的应用</p>
        ${error ? `<div class="alert alert-err">${ICONS.shield}${esc(error)}</div>` : ''}
        <form method="POST" action="/register">
          <input type="hidden" name="redirect_uri" value="${esc(redirectUri || '/profile')}">
          <div class="field">
            <label for="username">用户名</label>
            <input class="input" id="username" name="username" type="text" placeholder="3-20 位字母、数字或下划线" required autofocus>
          </div>
          <div class="field">
            <label for="email">邮箱</label>
            <input class="input" id="email" name="email" type="email" placeholder="you@example.com" required>
          </div>
          <div class="field">
            <label for="password">密码</label>
            <input class="input" id="password" name="password" type="password" placeholder="至少 6 位" required minlength="6">
          </div>
          <div class="field">
            <label for="password2">确认密码</label>
            <input class="input" id="password2" name="password2" type="password" placeholder="再输入一次" required minlength="6">
          </div>
          <button class="btn btn-primary btn-block" type="submit" style="height:40px;margin-top:4px">创建账号</button>
        </form>
        ${social}
        <p class="auth-switch">已有账号？<a href="/login?redirect_uri=${encodeURIComponent(redirectUri || '/profile')}">去登录</a></p>
      </div>
    </div>
  </div>`;

  return page({ title: '注册', siteName, body });
}

export function consentPage({ siteName, app, user, scopes, params }) {
  const items = scopes.map(s => `
    <li>${ICONS.check}<span><b>${esc(s)}</b><i>${esc(SCOPE_TEXT[s] || '访问你的账号信息')}</i></span></li>`).join('');

  const hidden = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');

  const body = `<div class="auth" style="grid-template-columns:1fr">
    <div class="auth-panel" style="background:var(--bg)">
      <div class="auth-box">
        <div class="auth-mobile-logo">${ICONS.shield}<span>${esc(siteName)}</span></div>
        <div class="app-bar">
          <div class="app-icon">${esc((app.name || '?').slice(0, 1).toUpperCase())}</div>
          <div>
            <div class="n">${esc(app.name)}</div>
            <div class="d">${esc(app.homepage || '请求访问你的账号')}</div>
          </div>
        </div>
        <h1 class="auth-title">授权确认</h1>
        <p class="auth-sub">以 <b>${esc(user.nickname || user.username)}</b> 的身份授权，该应用将获得以下权限：</p>
        <div class="card" style="margin-bottom:20px">
          <ul class="auth-feats" style="margin:0;padding:14px 16px;--x:0">
            ${scopes.map(s => `<li style="color:var(--text-2);border-color:var(--border)">${ICONS.check} <span><b style="font-family:var(--mono);font-size:12.5px">${esc(s)}</b> — ${esc(SCOPE_TEXT[s] || '访问账号信息')}</span></li>`).join('')}
          </ul>
        </div>
        <form method="POST" action="/oauth/authorize/decision">
          ${hidden}
          <div class="oauth-grid">
            <button class="btn btn-secondary" type="submit" name="decision" value="deny">取消</button>
            <button class="btn btn-primary" type="submit" name="decision" value="allow">同意授权</button>
          </div>
        </form>
        <p class="auth-switch">授权后你可随时在 <a href="/profile">个人中心</a> 撤销</p>
      </div>
    </div>
  </div>`;

  return page({ title: '授权确认', siteName, body });
}

/* ============================ 落地页 ============================ */

export function homePage({ siteName, issuer, user, qqEnabled, githubEnabled, version }) {
  const nav = `<div class="land-nav"><div class="land-nav-in">
    <a class="land-logo" href="/">${ICONS.shield}<span>${esc(siteName)}</span></a>
    <div class="land-nav-right">
      <button class="theme-btn" onclick="toggleTheme()" title="切换主题">${ICONS.moon}</button>
      ${user
        ? `<a class="btn btn-primary btn-sm" href="/profile">${ICONS.user} 控制台</a>`
        : `<a class="btn btn-secondary btn-sm" href="/docs">文档</a>
           <a class="btn btn-primary btn-sm" href="/login">登录 ${ICONS.arrow}</a>`}
    </div>
  </div></div>`;

  const hero = `<div class="land-hero">
    <div class="eyebrow"><span class="pulse"></span>自建实例运行中 · ${esc(version)}</div>
    <h1>一个账号<br>通行你所有的应用</h1>
    <p>${esc(siteName)} 是部署在你自己账户下的单点登录服务。标准 OAuth 2.0 与 OpenID Connect，
       数据与代码完全由你掌控，不依赖任何第三方身份服务商。</p>
    <div class="land-cta">
      ${user
        ? `<a class="btn btn-primary" href="/profile" style="height:42px;padding:0 22px">进入控制台 ${ICONS.arrow}</a>
           <a class="btn btn-secondary" href="/docs" style="height:42px;padding:0 22px">接入文档</a>`
        : `<a class="btn btn-primary" href="/login" style="height:42px;padding:0 22px">立即登录 ${ICONS.arrow}</a>
           <a class="btn btn-secondary" href="/docs" style="height:42px;padding:0 22px">查看接入文档</a>`}
    </div>
  </div>`;

  const feats = `<div class="land-sec">
    <div class="grid-3">
      <div class="tile">
        <div class="tile-ico">${ICONS.lock}</div>
        <h3>三种登录方式</h3>
        <p>账号密码（PBKDF2 加盐哈希）、QQ 快捷登录、GitHub 授权登录，可在个人中心自由绑定与解绑。</p>
      </div>
      <div class="tile">
        <div class="tile-ico">${ICONS.key}</div>
        <h3>标准 OAuth 2.0</h3>
        <p>授权码模式 + PKCE、Refresh Token 轮换、OIDC id_token。任何标准库填入发现文档即可接入。</p>
      </div>
      <div class="tile">
        <div class="tile-ico">${ICONS.server}</div>
        <h3>完全自主可控</h3>
        <p>代码开源可审计，数据存在你自己的存储空间里。可随时更换域名、迁移数据、二次开发。</p>
      </div>
      <div class="tile">
        <div class="tile-ico">${ICONS.apps}</div>
        <h3>多应用管理</h3>
        <p>为每一个接入的站点分配独立 Client，随时修改回调地址、调整授权范围、重置密钥。</p>
      </div>
      <div class="tile">
        <div class="tile-ico">${ICONS.token}</div>
        <h3>令牌全生命周期</h3>
        <p>查看活跃令牌、内省、撤销、刷新轮换。所有令牌都有明确的有效期与归属应用。</p>
      </div>
      <div class="tile">
        <div class="tile-ico">${ICONS.globe}</div>
        <h3>边缘节点运行</h3>
        <p>部署在全球边缘网络上，就近响应，无需维护任何服务器。冷启动几乎无感。</p>
      </div>
    </div>
  </div>`;

  const cta = `<div class="land-cta-bar"><div class="cta-inner">
    <h2>准备好接入了吗</h2>
    <p>从创建应用到跑通登录，平均只需要 5 分钟。</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <a class="btn" href="/docs" style="height:40px;padding:0 20px;background:#fff;color:#111;border:none">阅读接入文档</a>
      <a class="btn" href="/.well-known/openid-configuration" style="height:40px;padding:0 20px;background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.24)">查看 OIDC 配置</a>
    </div>
  </div></div>`;

  const foot = `<div class="land-foot"><div class="land-foot-in">
    <span>${esc(siteName)} ${esc(version)}</span><span>·</span>
    <span>Self-hosted</span><span>·</span>
    <span>Issuer: <code>${esc(issuer)}</code></span><span>·</span>
    <a href="/docs">文档</a><span>·</span>
    <a href="https://github.com/maoxinhe/mzy_sso">GitHub</a>
  </div></div>`;

  return page({
    title: '单点登录', siteName, body: nav + hero + feats + cta + foot,
    desc: '自建的单点登录服务，标准 OAuth 2.0 与 OpenID Connect'
  });
}

/* ============================ 个人中心 ============================ */

export function profilePage({ siteName, user, message, apps = [] }) {
  const providers = user.providers || {};

  const bindRow = (key, name, info, color) => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:${color};color:#fff;flex:0 0 auto">
          ${key === 'qq' ? ICONS.qq : ICONS.github}
        </div>
        <div style="min-width:0">
          <div style="font-size:13.5px;font-weight:600">${esc(name)}</div>
          <div style="font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis">${info ? esc(info.label) : '未绑定'}</div>
        </div>
      </div>
      ${info
        ? `<form method="POST" action="/profile/unbind" onsubmit="return confirmDo('确定解绑 ${esc(name)}？')">
             <input type="hidden" name="provider" value="${key}">
             <button class="btn btn-secondary btn-sm" type="submit">解绑</button></form>`
        : `<a class="btn btn-secondary btn-sm" href="/api/connect/${key}?redirect_uri=/profile&bind=1">绑定</a>`}
    </div>`;

  const body = `<div class="console">
    ${sideNav('profile', user, siteName, !!user.is_admin)}
    <div class="main">
      <div class="topbar">
        <div><h1>个人中心</h1></div>
        <div class="top-right">
          <button class="theme-btn" onclick="toggleTheme()">${ICONS.moon}</button>
          <a class="btn btn-secondary btn-sm" href="/logout">${ICONS.logout} 退出</a>
        </div>
      </div>
      <div class="content">
        ${message ? `<div class="alert alert-ok">${ICONS.check}${esc(message)}</div>` : ''}

        <div class="stats">
          <div class="stat"><div class="stat-v">${Object.keys(providers).length}</div><div class="stat-l">已绑定登录方式</div></div>
          <div class="stat"><div class="stat-v">${apps.length}</div><div class="stat-l">已授权应用</div></div>
          <div class="stat"><div class="stat-v">${user.is_admin ? '管理员' : '用户'}</div><div class="stat-l">当前角色</div></div>
        </div>

        <div class="form-grid">
          <div class="sec" style="margin:0">
            <div class="panel open">
              <div class="panel-h" onclick="togglePanel('p-edit')">
                <h3>${ICONS.user} 基本资料</h3>
                <span class="chev">${ICONS.arrow}</span>
              </div>
              <div class="panel-b" id="p-edit">
                <div style="display:flex;align-items:center;gap:13px;margin-bottom:16px">
                  <img src="${esc(user.avatar || defaultAvatar(user.uid))}" width="54" height="54"
                       style="border-radius:50%;border:1px solid var(--border);object-fit:cover" alt="">
                  <div>
                    <div style="font-size:15px;font-weight:680">${esc(user.nickname || user.username)}</div>
                    <div style="font-size:12px;color:var(--muted)">${esc(user.email || '未设置邮箱')}</div>
                  </div>
                </div>
                <form method="POST" action="/profile/update">
                  <div class="field">
                    <label for="nickname">昵称</label>
                    <input class="input" id="nickname" name="nickname" value="${esc(user.nickname || '')}">
                  </div>
                  <div class="field">
                    <label for="avatar">头像 URL</label>
                    <input class="input" id="avatar" name="avatar" value="${esc(user.avatar || '')}" placeholder="https://...">
                  </div>
                  <button class="btn btn-primary btn-sm" type="submit">保存资料</button>
                </form>
              </div>
            </div>
          </div>

          <div class="sec" style="margin:0">
            <div class="panel open">
              <div class="panel-h" onclick="togglePanel('p-bind')">
                <h3>${ICONS.key} 登录方式</h3>
                <span class="chev">${ICONS.arrow}</span>
              </div>
              <div class="panel-b" id="p-bind">
                ${bindRow('qq', 'QQ', providers.qq ? { label: providers.qq.nickname || `ID ${providers.qq.social_uid}` } : null, 'var(--qq)')}
                ${bindRow('github', 'GitHub', providers.github ? { label: providers.github.login || `ID ${providers.github.id}` } : null, 'var(--gh)')}
                <div style="padding-top:13px">
                  <div style="font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:8px">
                    ${user.password_hash ? ICONS.check : ''} ${user.password_hash ? '已设置密码' : '未设置密码（仅第三方登录）'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sec" style="margin-top:22px">
          <div class="sec-h"><div><h3>账号信息</h3><p>接入方请使用 sub 字段做账号关联，它永久不变</p></div></div>
          <div class="tbl-card"><div class="tbl-wrap"><table>
            <tbody>
              <tr><td style="width:150px;color:var(--muted);font-size:12.5px">UID (sub)</td><td><code>${esc(user.uid)}</code></td></tr>
              <tr><td style="color:var(--muted);font-size:12.5px">用户名</td><td>${esc(user.username || '-')}</td></tr>
              <tr><td style="color:var(--muted);font-size:12.5px">邮箱</td><td>${esc(user.email || '-')}</td></tr>
              <tr><td style="color:var(--muted);font-size:12.5px">注册时间</td><td>${new Date(user.created_at).toLocaleString('zh-CN')}</td></tr>
            </tbody>
          </table></div></div>
        </div>

        <div class="sec" style="margin-top:22px">
          <div class="sec-h"><div><h3>已授权应用</h3><p>撤销授权后，该应用下次需要重新获得你的同意</p></div></div>
          <div class="tbl-card">
            ${apps.length ? apps.map(a => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px;border-bottom:1px solid var(--border)">
                <div style="display:flex;align-items:center;gap:10px;min-width:0">
                  <div class="app-icon" style="width:30px;height:30px;font-size:12px;border-radius:8px">
                    ${esc((a.name || '?').slice(0, 1).toUpperCase())}</div>
                  <div style="min-width:0">
                    <div style="font-size:13.5px;font-weight:600">${esc(a.name)}</div>
                    <div style="font-size:11.5px;color:var(--muted)">
                      ${esc((a.granted_scopes || []).join(' · ') || '无')}
                      ${a.granted_at ? ` · 授权于 ${new Date(a.granted_at).toLocaleDateString('zh-CN')}` : ''}
                    </div>
                  </div>
                </div>
                <form method="POST" action="/profile/revoke-consent"
                      onsubmit="return confirmDo('确定撤销对「${esc(a.name)}」的授权？')">
                  <input type="hidden" name="client_id" value="${esc(a.client_id)}">
                  <button class="btn btn-secondary btn-sm" type="submit">撤销授权</button>
                </form>
              </div>`).join('')
            : '<div class="empty">' + ICONS.apps + '<div>你还没有授权任何应用</div></div>'}
          </div>
        </div>
      </div>
    </div>
  </div>`;

  return page({ title: '个人中心', siteName, body });
}

function defaultAvatar(uid) {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(uid || 'mzy')}&backgroundColor=f0effe`;
}
/** 侧边导航（个人中心与后台共用） */
function sideNav(active, user, siteName, isAdmin = false) {
  const link = (key, href, label, icon, show = true) => show ? `
    <a class="side-link ${active === key ? 'on' : ''}" href="${href}">${icon}<span>${label}</span></a>` : '';

  return `<aside class="sidebar">
    <div class="side-brand">${ICONS.shield}<span>${esc(siteName)}</span></div>
    <div class="side-label">账号</div>
    ${link('profile', '/profile', '个人中心', ICONS.user)}
    ${isAdmin ? `
      <div class="side-label">管理</div>
      ${link('overview', '/admin', '总览', ICONS.activity)}
      ${link('apps', '/admin/apps', '应用管理', ICONS.apps)}
      ${link('users', '/admin/users', '用户管理', ICONS.user)}
      ${link('tokens', '/admin/tokens', '令牌管理', ICONS.token)}
      ${link('system', '/admin/system', '系统状态', ICONS.server)}
    ` : ''}
    <div class="side-label">其他</div>
    <a class="side-link" href="/docs">${ICONS.globe}<span>接入文档</span></a>
    <a class="side-link" href="/">${ICONS.globe}<span>返回首页</span></a>
    <div class="side-foot">
      登录身份<br><b style="color:var(--text)">${esc(user.nickname || user.username)}</b>
    </div>
  </aside>`;
}

/* ============================ 初始化页 ============================ */

export function setupPage({ siteName, error, version }) {
  const body = `<div class="auth">
    ${authBrand(siteName, version)}
    <div class="auth-panel">
      <div class="auth-box">
        <div class="auth-mobile-logo">${ICONS.shield}<span>${esc(siteName)}</span></div>
        <div class="badge badge-brand" style="margin-bottom:14px">${ICONS.server} 首次部署 · 步骤 1 / 1</div>
        <h1 class="auth-title">创建管理员账号</h1>
        <p class="auth-sub">这是本实例的第一个账号，将自动获得管理员权限，之后可在控制台创建接入应用。</p>
        ${error ? `<div class="alert alert-err">${ICONS.shield}${esc(error)}</div>` : ''}
        <form method="POST" action="/setup" autocomplete="on">
          <div class="form-grid">
            <div class="field">
              <label for="username">用户名</label>
              <input class="input" id="username" name="username" type="text" placeholder="admin" required autofocus autocomplete="username">
              <div class="hint">3-20 位字母、数字或下划线</div>
            </div>
            <div class="field">
              <label for="email">邮箱</label>
              <input class="input" id="email" name="email" type="email" placeholder="admin@example.com" required autocomplete="email">
            </div>
          </div>
          <div class="field">
            <label for="password">密码</label>
            <input class="input" id="password" name="password" type="password" placeholder="至少 6 位" required minlength="6" autocomplete="new-password">
          </div>
          <div class="field">
            <label for="password2">确认密码</label>
            <input class="input" id="password2" name="password2" type="password" placeholder="再输入一次" required minlength="6" autocomplete="new-password">
          </div>
          <button class="btn btn-primary btn-block" type="submit" style="height:40px;margin-top:4px">创建并进入控制台</button>
        </form>
        <div class="auth-note">${ICONS.lock} 密码以 PBKDF2-SHA256 加盐哈希存储，明文不会离开你的实例</div>
      </div>
    </div>
  </div>`;

  return page({ title: '初始化', siteName, body });
}

/* ============================ 错误页 ============================ */

export function errorPage({ siteName, title, message, status = 400 }) {
  const body = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
    <div class="card" style="max-width:400px;width:100%;padding:34px;text-align:center">
      <div style="display:flex;justify-content:center;margin-bottom:16px;color:var(--brand)">${ICONS.shield}</div>
      <h1 style="font-size:19px;font-weight:700;margin-bottom:7px">${esc(title)}</h1>
      <p style="color:var(--muted);font-size:13.5px;margin-bottom:22px">${esc(message)}</p>
      <a class="btn btn-primary" href="/">返回首页</a>
    </div></div>`;
  return new Response(page({ title, siteName, body }), {
    status, headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

export { ICONS, page, sideNav, CSS, SCOPE_TEXT, defaultAvatar };
