/**
 * 开发者接入文档页（/docs）
 * 含：接入流程、时序、各语言示例、完整 API 参考、错误码、JS SDK 用法
 */

import { page, esc, ICONS } from './ui.js';

// 文档页复用 ui.js 设计系统中的 .doc / .doc-toc / .notice / .step 样式
const EXTRA = `
.doc-nav{position:sticky;top:0;z-index:20;backdrop-filter:saturate(180%) blur(14px);
  background:color-mix(in srgb,var(--bg) 85%,transparent);border-bottom:1px solid var(--border)}
.doc-nav-in{max-width:860px;margin:0 auto;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
.doc-logo{display:flex;align-items:center;gap:9px;font-size:14.5px;font-weight:700;color:var(--text);letter-spacing:-.02em}
.doc-logo svg{color:var(--brand);width:21px;height:21px}
@media(max-width:640px){
  .doc-nav-in{padding:0 14px;height:52px;gap:8px}
  .doc-logo{font-size:13.5px;min-width:0}
  .doc-logo span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:88px}
  .doc-nav-in .btn{padding:0 11px;font-size:12.5px;height:34px}
}
`;

export function docsPage({ siteName, issuer }) {
  const I = issuer;

  const nav = `<div class="doc-nav"><div class="doc-nav-in">
    <a class="doc-logo" href="/">${ICONS.shield}<span>${esc(siteName)}</span></a>
    <div style="display:flex;align-items:center;gap:8px">
      <button class="theme-btn" onclick="toggleTheme()" title="切换主题">${ICONS.moon}</button>
      <a class="btn btn-secondary btn-sm" href="/">返回首页</a>
      <a class="btn btn-primary btn-sm" href="/admin">${ICONS.apps} 控制台</a>
    </div>
  </div></div>`;

  const body = nav + `<div class="doc">
    <div class="doc-h">
      <h1>接入文档</h1>
      <p>把 ${esc(siteName)} 接入你的站点，5 分钟完成</p>
    </div>

    <div class="doc-toc">
      <a href="#ai">AI 对接</a>
      <a href="#flow">接入流程</a>
      <a href="#quick">快速开始</a>
      <a href="#sdk">JS SDK</a>
      <a href="#api">API 参考</a>
      <a href="#examples">多语言示例</a>
      <a href="#errors">错误码</a>
      <a href="#faq">常见问题</a>
      <a href="#adminapi">管理 API</a>
    </div>

    <p>
      本服务是完整的 <b>OAuth 2.0 授权服务器</b> + <b>OpenID Connect</b> 身份提供者。
      任何支持 OAuth2 的标准库（Laravel Socialite、Passport、Authlib、Spring Security、oidc-client-ts 等）
      都可以零改造接入。
    </p>

    <div class="notice">
      ${ICONS.globe}<div>
      <b>基础地址（Issuer）：</b><code>${esc(I)}</code><br>
      标准发现文档：<a href="/.well-known/openid-configuration" target="_blank"><code>${esc(I)}/.well-known/openid-configuration</code></a>
      —— 多数框架填这一个地址即可自动完成全部配置。
      </div>
    </div>

    <h2 id="ai">零、让 AI 助手帮你对接（推荐）</h2>
    <p>
      如果你用 AI 编程助手（Cursor、Claude、CodeBuddy、Copilot 等）来写接入代码，
      不用把本文档粘给它 —— 把下面任意一个地址发过去，它就能自己读完完整契约并写出代码。
    </p>

    <div class="notice">
      ${ICONS.activity}<div>
      <b>精简版（约 6 KB，首选）：</b><a href="/llms.txt" target="_blank"><code>${esc(I)}/llms.txt</code></a><br>
      <b>完整版（含多语言示例与错误码）：</b><a href="/llms-full.txt" target="_blank"><code>${esc(I)}/llms-full.txt</code></a><br>
      <b>OpenAPI 3.1 规范（可导入 Postman / 生成 SDK）：</b><a href="/openapi.json" target="_blank"><code>${esc(I)}/openapi.json</code></a>
      </div>
    </div>

    <p>也可以直接把下面这段提示词复制给 AI：</p>

    <pre><code>我要接入一个 OAuth2/OIDC 单点登录服务，请先阅读这里的完整接入契约：
${esc(I)}/llms.txt

然后帮我完成接入：
1. 在 ${esc(I)}/admin 创建一个应用，回调地址填 http://localhost:3000/callback
2. 用 Node.js(Express) 写一份接入代码，使用授权码 + PKCE 流程
3. 拿到用户信息后用 sub 字段关联本地账号</code></pre>

    <h2 id="adminapi">管理 API（让 AI / 脚本自动建应用）</h2>
    <p>
      管理后台能做的事，都能用 REST 接口做 —— AI 不用点页面就能帮你把应用建好。
      需先在 Worker 里配置密钥 <code>ADMIN_API_TOKEN</code>（详见 README），
      然后所有请求带上：<code>Authorization: Bearer &lt;ADMIN_API_TOKEN&gt;</code>
    </p>

    <pre><code># 创建一个应用（返回 client_secret，仅此一次，务必保存）
curl -X POST ${esc(I)}/api/admin/apps \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"我的站点","redirect_uris":["http://localhost:3000/callback"]}'

# 其他接口
GET    /api/admin/apps                     列出应用（密钥只显示掩码）
GET    /api/admin/apps/{id}                应用详情
PATCH  /api/admin/apps/{id}                改名称 / 回调 / scope
POST   /api/admin/apps/{id}/reset-secret   重置密钥（旧令牌立即失效）
DELETE /api/admin/apps/{id}                删除应用
GET    /api/admin/users                    用户列表
GET    /api/admin/tokens                   有效令牌
POST   /api/admin/tokens/revoke            撤销令牌
GET    /api/admin/stats                    统计与实例配置
GET    /api/admin/logs                     操作审计日志</code></pre>

    <div class="notice">
      ${ICONS.key}<div>
      <b>安全提示：</b><code>client_secret</code> 只在「创建」和「重置密钥」时返回一次，请立即保存。
      忘记就只能重置一个新的（旧密钥与该应用下已签发令牌会一起失效）。
      </div>
    </div>

    <h2 id="flow">一、接入流程</h2>
    <p>标准授权码模式（Authorization Code + PKCE），共 4 步：</p>

    <div class="step"><i>1</i><span>把用户浏览器跳转到 <code>${esc(I)}/oauth/authorize</code>，带上 <code>client_id</code>、<code>redirect_uri</code>、<code>scope</code>、<code>state</code>。</span></div>
    <div class="step"><i>2</i><span>用户在 SSO 页面完成登录（密码 / QQ / GitHub），并确认授权。</span></div>
    <div class="step"><i>3</i><span>浏览器跳回你的 <code>redirect_uri</code>，URL 上附带一次性 <code>code</code>。</span></div>
    <div class="step"><i>4</i><span>你的<b>服务端</b>用 <code>code</code> + <code>client_secret</code> 请求 <code>/oauth/token</code> 换取 <code>access_token</code>，再调 <code>/oauth/userinfo</code> 拿用户信息。</span></div>

    <pre><code>浏览器                 你的站点                    ${esc(siteName)}
  │                      │                            │
  │── 访问 /login ──────▶│                            │
  │                      │── 302 跳转 authorize ─────▶│
  │◀──────────────────────── 登录页（密码/QQ/GitHub）──│
  │── 登录并确认授权 ────────────────────────────────▶│
  │◀──────────────────── 302 回跳 ?code=xxx&state=xxx │
  │── 带 code 回调 ─────▶│                            │
  │                      │── POST /oauth/token ──────▶│
  │                      │◀──── access_token ─────────│
  │                      │── GET /oauth/userinfo ────▶│
  │                      │◀──── 用户资料 ─────────────│
  │◀── 建立本站会话 ──────│                            │</code></pre>

    <h2 id="quick">二、5 分钟快速开始</h2>

    <h3>1. 创建应用</h3>
    <p>进入 <a href="/admin">管理后台 → 应用管理</a>，创建应用后得到 <code>client_id</code> 和 <code>client_secret</code>。
    回调地址必须<b>逐字符完全一致</b>（含结尾斜杠与协议）。</p>

    <h3>2. 拼接登录跳转</h3>
    <pre><code>${esc(I)}/oauth/authorize
  ?client_id=mzy_xxxxxxxxxxxx
  &amp;redirect_uri=https%3A%2F%2Fyour.site%2Foauth%2Fcallback
  &amp;response_type=code
  &amp;scope=openid+profile+email
  &amp;state=随机字符串（请自行校验防 CSRF）</code></pre>

    <h3>3. 回调里换 token</h3>
    <pre><code>POST ${esc(I)}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&amp;code=上一步拿到的 code
&amp;redirect_uri=https://your.site/oauth/callback
&amp;client_id=mzy_xxxxxxxxxxxx
&amp;client_secret=cs_xxxxxxxxxxxx</code></pre>

    <p>响应：</p>
    <pre><code>{
  "access_token": "mzy_at_xxxxxxxx",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "mzy_rt_xxxxxxxx",
  "scope": "openid profile email",
  "id_token": "eyJhbGciOiJIUzI1NiIs..."   // scope 含 openid 时返回
}</code></pre>

    <h3>4. 读取用户信息</h3>
    <pre><code>GET ${esc(I)}/oauth/userinfo
Authorization: Bearer mzy_at_xxxxxxxx</code></pre>

    <pre><code>{
  "sub": "u_xxxxxxxx",              // 用户唯一 ID，请用它做本站账号关联
  "name": "张三",
  "nickname": "张三",
  "picture": "https://...",
  "email": "zhangsan@example.com",
  "email_verified": false,
  "preferred_username": "zhangsan",
  "providers": ["qq", "github"],
  "groups": ["user"],
  "updated_at": 1750000000000
}</code></pre>

    <div class="notice"><b>关联账号请用 <code>sub</code></b>，不要用邮箱或昵称——用户可以修改它们，<code>sub</code> 永久不变。</div>

    <h2 id="sdk">三、前端 JS SDK（零依赖）</h2>
    <p>在页面里引入一行脚本，3 个方法即可完成接入：</p>
    <pre><code>&lt;script src="${esc(I)}/sdk.js"&gt;&lt;/script&gt;
&lt;script&gt;
  const sso = MZYSSO.init({
    issuer: '${esc(I)}',
    clientId: 'mzy_xxxxxxxxxxxx'
  });

  // 1. 跳登录（自动生成并校验 state，自动带 PKCE）
  document.querySelector('#login').onclick = () => sso.login();

  // 2. 回调页自动处理 code → 返回 { access_token, id_token, user }
  const session = await sso.handleRedirect();
  console.log(session.user);

  // 3. 已登录时静默获取
  const { user } = await sso.getUser();
&lt;/script&gt;</code></pre>
    <p>完整源码见 <a href="/sdk.js" target="_blank"><code>/sdk.js</code></a>，约 120 行，可直接抄进你的项目改造。</p>

    <h2 id="api">四、API 参考</h2>

    <h3>端点总览</h3>
    <table>
      <thead><tr><th>方法</th><th>路径</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>GET</td><td><code>/.well-known/openid-configuration</code></td><td>OIDC 发现文档，自动配置用</td></tr>
        <tr><td>GET</td><td><code>/oauth/authorize</code></td><td>授权端点，浏览器跳转</td></tr>
        <tr><td>POST</td><td><code>/oauth/authorize/decision</code></td><td>提交同意/拒绝（表单，由同意页自动调用）</td></tr>
        <tr><td>POST</td><td><code>/oauth/token</code></td><td>令牌端点，服务端调用</td></tr>
        <tr><td>GET/POST</td><td><code>/oauth/userinfo</code></td><td>用户信息，需 Bearer Token</td></tr>
        <tr><td>POST</td><td><code>/oauth/introspect</code></td><td>令牌内省（RFC 7662）</td></tr>
        <tr><td>POST</td><td><code>/oauth/revoke</code></td><td>令牌撤销（RFC 7009）</td></tr>
        <tr><td>POST</td><td><code>/oauth/register</code></td><td>动态客户端注册（RFC 7591，需开启）</td></tr>
        <tr><td>GET</td><td><code>/.well-known/jwks.json</code></td><td>签名公钥集（HS256 场景为空）</td></tr>
        <tr><td>GET</td><td><code>/logout</code></td><td>退出登录，支持 <code>post_logout_redirect_uri</code></td></tr>
      </tbody>
    </table>

    <h3>GET /oauth/authorize</h3>
    <table>
      <thead><tr><th>参数</th><th>必填</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>client_id</code></td><td>是</td><td>应用 ID</td></tr>
        <tr><td><code>redirect_uri</code></td><td>是</td><td>必须与应用注册的白名单完全一致</td></tr>
        <tr><td><code>response_type</code></td><td>是</td><td>固定 <code>code</code></td></tr>
        <tr><td><code>scope</code></td><td>否</td><td>空格分隔，默认 <code>openid profile email</code></td></tr>
        <tr><td><code>state</code></td><td>推荐</td><td>原样回传，用于防 CSRF</td></tr>
        <tr><td><code>code_challenge</code></td><td>否</td><td>PKCE 挑战值，配合 <code>code_challenge_method=S256</code></td></tr>
        <tr><td><code>prompt</code></td><td>否</td><td><code>none</code>（静默）/ <code>consent</code>（强制同意页）/ <code>login</code></td></tr>
        <tr><td><code>nonce</code></td><td>否</td><td>OIDC 防重放，会写入 id_token</td></tr>
      </tbody>
    </table>

    <h3>POST /oauth/token</h3>
    <p>支持三种 grant，客户端认证可用 HTTP Basic 或表单字段两种方式：</p>
    <table>
      <thead><tr><th>grant_type</th><th>必需参数</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>authorization_code</code></td><td><code>code</code>、<code>redirect_uri</code>、<code>client_id</code>、<code>client_secret</code></td><td>授权码换令牌，code 一次性</td></tr>
        <tr><td><code>refresh_token</code></td><td><code>refresh_token</code>、<code>client_id</code>、<code>client_secret</code></td><td>刷新令牌，旧 refresh_token 立即失效（轮换）</td></tr>
        <tr><td><code>client_credentials</code></td><td><code>client_id</code>、<code>client_secret</code></td><td>服务端对服务端，需在应用上开启</td></tr>
      </tbody>
    </table>

    <h3>Scope 说明</h3>
    <table>
      <thead><tr><th>scope</th><th>返回的字段</th></tr></thead>
      <tbody>
        <tr><td><code>openid</code></td><td>启用 OIDC，额外返回 <code>id_token</code> 与 <code>sub</code></td></tr>
        <tr><td><code>profile</code></td><td><code>name</code>、<code>nickname</code>、<code>picture</code>、<code>gender</code>、<code>locale</code>、<code>profile</code>、<code>providers</code></td></tr>
        <tr><td><code>email</code></td><td><code>email</code>、<code>email_verified</code></td></tr>
        <tr><td><code>username</code></td><td><code>preferred_username</code></td></tr>
        <tr><td><code>uid</code></td><td><code>uid</code>（与 sub 相同，兼容用）</td></tr>
        <tr><td><code>groups</code></td><td><code>groups</code>（<code>admin</code> / <code>user</code>）</td></tr>
      </tbody>
    </table>

    <h2 id="examples">五、多语言示例</h2>

    <h3>PHP（原生，无框架）</h3>
    <pre><code>&lt;?php
$ISSUER = '${esc(I)}';
$ID = 'mzy_xxxxxxxxxxxx'; $SECRET = 'cs_xxxxxxxxxxxx';
$CB  = 'https://your.site/oauth/callback';

// 第一步：跳转登录
if (!isset($_GET['code'])) {
    $_SESSION['state'] = bin2hex(random_bytes(16));
    header('Location: ' . $ISSUER . '/oauth/authorize?' . http_build_query([
        'client_id' => $ID, 'redirect_uri' => $CB,
        'response_type' => 'code', 'scope' => 'openid profile email',
        'state' => $_SESSION['state'],
    ]));
    exit;
}

// 第二步：防 CSRF 校验
if ($_GET['state'] !== $_SESSION['state']) die('state 校验失败');

// 第三步：换 token
$ch = curl_init($ISSUER . '/oauth/token');
curl_setopt_array($ch, [CURLOPT_POST => 1, CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_POSTFIELDS => http_build_query([
        'grant_type' => 'authorization_code', 'code' => $_GET['code'],
        'redirect_uri' => $CB, 'client_id' => $ID, 'client_secret' => $SECRET,
    ])]);
$token = json_decode(curl_exec($ch), true);

// 第四步：取用户信息
$ch = curl_init($ISSUER . '/oauth/userinfo');
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token['access_token']]]);
$user = json_decode(curl_exec($ch), true);
echo "欢迎 " . $user['name'] . "（ID: " . $user['sub'] . "）";</code></pre>

    <h3>Python（Flask + Authlib）</h3>
    <pre><code>from authlib.integrations.flask_client import OAuth

oauth = OAuth(app)
oauth.register(
    name='mzy',
    server_metadata_url='${esc(I)}/.well-known/openid-configuration',  # 自动发现
    client_kwargs={'scope': 'openid profile email'},
)

@app.route('/login')
def login():
    return oauth.mzy.authorize_redirect(url_for('callback', _external=True))

@app.route('/callback')
def callback():
    token = oauth.mzy.authorize_access_token()
    user  = oauth.mzy.parse_id_token(token)   # 或 oauth.mzy.userinfo(token=token)
    return f"欢迎 {user['name']}"</code></pre>

    <h3>Node.js（Express）</h3>
    <pre><code>import express from 'express';
import session from 'express-session';

const ISSUER='${esc(I)}', ID='mzy_xxxxxxxxxxxx', SECRET='cs_xxxxxxxxxxxx';
const CB='http://localhost:3000/callback';

app.get('/login', (req,res)=>{
  req.session.state = crypto.randomUUID();
  const u = new URL(ISSUER+'/oauth/authorize');
  u.searchParams.set('client_id',ID); u.searchParams.set('redirect_uri',CB);
  u.searchParams.set('response_type','code');
  u.searchParams.set('scope','openid profile email');
  u.searchParams.set('state',req.session.state);
  res.redirect(u);
});

app.get('/callback', async (req,res)=>{
  if (req.query.state !== req.session.state) return res.status(400).send('state 不匹配');
  const r = await fetch(ISSUER+'/oauth/token',{method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'authorization_code',code:req.query.code,
      redirect_uri:CB,client_id:ID,client_secret:SECRET})});
  const token = await r.json();
  const u = await fetch(ISSUER+'/oauth/userinfo',{
    headers:{Authorization:'Bearer '+token.access_token}}).then(r=>r.json());
  req.session.user = u;
  res.send('欢迎 '+u.name);
});</code></pre>

    <h3>Go</h3>
    <pre><code>import "golang.org/x/oauth2"

conf := &oauth2.Config{
    ClientID:     "mzy_xxxxxxxxxxxx",
    ClientSecret: "cs_xxxxxxxxxxxx",
    Endpoint: oauth2.Endpoint{
        AuthURL:  "${esc(I)}/oauth/authorize",
        TokenURL: "${esc(I)}/oauth/token",
    },
    RedirectURL: "http://localhost:8080/callback",
    Scopes:      []string{"openid", "profile", "email"},
}

// 登录：http.Redirect(w, r, conf.AuthCodeURL(state), 302)
// 回调：
tok, _ := conf.Exchange(r.Context(), r.URL.Query().Get("code"))
client := conf.Client(r.Context(), tok)
resp, _ := client.Get("${esc(I)}/oauth/userinfo")</code></pre>

    <h3>Java（Spring Security）</h3>
    <pre><code># application.yml
spring:
  security:
    oauth2:
      client:
        registration:
          mzy:
            client-id: mzy_xxxxxxxxxxxx
            client-secret: cs_xxxxxxxxxxxx
            scope: openid,profile,email
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/mzy"
        provider:
          mzy:
            issuer-uri: ${esc(I)}   # 自动拉取发现文档</code></pre>

    <h2 id="errors">六、错误码</h2>
    <table>
      <thead><tr><th>error</th><th>含义与处理</th></tr></thead>
      <tbody>
        <tr><td><code>invalid_request</code></td><td>参数缺失或格式错误，检查必填项</td></tr>
        <tr><td><code>invalid_client</code></td><td>client_id 不存在或 client_secret 错误</td></tr>
        <tr><td><code>invalid_grant</code></td><td>code 已被使用 / 过期 / 与 client 不匹配。code 一次性且 5 分钟有效，请勿重复提交</td></tr>
        <tr><td><code>unauthorized_client</code></td><td>该应用未开启对应 grant 类型</td></tr>
        <tr><td><code>unsupported_grant_type</code></td><td>grant_type 不支持</td></tr>
        <tr><td><code>invalid_scope</code></td><td>请求的 scope 不在支持列表内</td></tr>
        <tr><td><code>invalid_token</code></td><td>access_token 无效或过期，用 refresh_token 刷新</td></tr>
        <tr><td><code>login_required</code></td><td>prompt=none 但用户未登录，走正常登录流程</td></tr>
      </tbody>
    </table>

    <h2 id="faq">七、常见问题</h2>

    <h3>redirect_uri 总是提示不匹配？</h3>
    <p>必须<b>逐字符一致</b>：协议（http/https）、端口、路径、结尾斜杠都要对。本地调试请显式写
    <code>http://localhost:3000/callback</code>，不要用 <code>127.0.0.1</code> 与 <code>localhost</code> 混用。</p>

    <h3>能用 JWT 校验 id_token 吗？</h3>
    <p>可以。id_token 是标准 JWT（HS256），用 <code>JWT_SECRET</code> 校验签名，并验证 <code>iss</code>、<code>aud</code>、<code>exp</code> 三个声明。
    注意 HS256 是对称签名，密钥不能下发到前端。</p>

    <h3>如何实现"退出所有应用"？</h3>
    <p>把用户浏览器重定向到 <code>${esc(I)}/logout?post_logout_redirect_uri=你的首页</code>。
    如需各应用同步退出，需要各应用自行实现「全局登出」或「会话检查」。</p>

    <h3>QQ / GitHub 登录报配置错误？</h3>
    <p>QQ 走小白菜聚合登录，请确认 APPID/APPKEY 有效且回调域名已在该平台备案；
    GitHub 请在 OAuth App 设置里把 <code>${esc(I)}/api/connect/github/callback</code> 填入 Authorization callback URL。</p>

    <p class="foot" style="margin-top:30px">
      <a href="/">返回首页</a> · <a href="/admin">管理后台</a> · <a href="/.well-known/openid-configuration">OIDC 发现文档</a>
    </p>
  </div>
  </div>`;

  return new Response(page({ title: '接入文档', siteName, body, extra: EXTRA }), {
    status: 200, headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

/* ---------------- 前端 SDK（/sdk.js） ---------------- */

export function sdkScript(issuer) {
  const js = `/*!
 * MZY SSO JavaScript SDK v1.0
 * 零依赖，浏览器直连。自动处理 state 与 PKCE。
 */
(function (global) {
  'use strict';

  function b64url(buf) {
    var s = '', b = new Uint8Array(buf);
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
  }
  function rand(n) {
    var a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a);
  }
  async function pkce(verifier) {
    return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  }

  function MZYSSO(cfg) {
    this.issuer = (cfg.issuer || '').replace(/\\/$/, '');
    this.clientId = cfg.clientId;
    this.scope = cfg.scope || 'openid profile email';
    this.redirectUri = cfg.redirectUri || location.origin + location.pathname;
    this.storageKey = 'mzy_sso_' + this.clientId;
  }

  /** 跳转到 SSO 登录页 */
  MZYSSO.prototype.login = async function (extra) {
    var state = rand(16), verifier = rand(32);
    sessionStorage.setItem('mzy_state', state);
    sessionStorage.setItem('mzy_verifier', verifier);
    var u = new URL(this.issuer + '/oauth/authorize');
    u.searchParams.set('client_id', this.clientId);
    u.searchParams.set('redirect_uri', this.redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', this.scope);
    u.searchParams.set('state', state);
    u.searchParams.set('code_challenge', await pkce(verifier));
    u.searchParams.set('code_challenge_method', 'S256');
    if (extra) Object.keys(extra).forEach(function (k) { u.searchParams.set(k, extra[k]); });
    location.href = u.toString();
  };

  /** 在回调页调用：解析 code，换取 token 与用户信息 */
  MZYSSO.prototype.handleRedirect = async function () {
    var p = new URLSearchParams(location.search);
    if (p.get('error')) throw new Error(p.get('error_description') || p.get('error'));
    var code = p.get('code');
    if (!code) return null;
    if (p.get('state') !== sessionStorage.getItem('mzy_state')) throw new Error('state 校验失败');

    var body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: sessionStorage.getItem('mzy_verifier') || ''
    });

    var r = await fetch(this.issuer + '/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body
    });
    var token = await r.json();
    if (!r.ok) throw new Error(token.error_description || token.error || '换取令牌失败');
    sessionStorage.removeItem('mzy_state');
    sessionStorage.removeItem('mzy_verifier');

    var user = await this.fetchUser(token.access_token);
    var session = { token: token, user: user, expires_at: Date.now() + token.expires_in * 1000 };
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    history.replaceState({}, '', location.pathname);
    return session;
  };

  MZYSSO.prototype.fetchUser = async function (accessToken) {
    var r = await fetch(this.issuer + '/oauth/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (!r.ok) return null;
    return r.json();
  };

  /** 读取本地会话，过期自动用 refresh_token 续期 */
  MZYSSO.prototype.getSession = async function () {
    var raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (s.expires_at && s.expires_at > Date.now() + 30000) return s;
    if (!s.token || !s.token.refresh_token) { this.logout(); return null; }
    try {
      var r = await fetch(this.issuer + '/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: s.token.refresh_token,
          client_id: this.clientId
        })
      });
      var t = await r.json();
      if (!r.ok) { this.logout(); return null; }
      s.token = t; s.expires_at = Date.now() + t.expires_in * 1000;
      localStorage.setItem(this.storageKey, JSON.stringify(s));
      return s;
    } catch (e) { return s; }
  };

  MZYSSO.prototype.getUser = async function () {
    var s = await this.getSession();
    return s ? { user: s.user, token: s.token.access_token } : null;
  };

  /** 清除本地会话，并跳转到 SSO 全局登出 */
  MZYSSO.prototype.logout = function (backTo) {
    var t = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    localStorage.removeItem(this.storageKey);
    if (t.token && t.token.access_token) {
      fetch(this.issuer + '/oauth/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: t.token.access_token, client_id: this.clientId })
      }).catch(function () {});
    }
    var u = new URL(this.issuer + '/logout');
    if (backTo) u.searchParams.set('post_logout_redirect_uri', backTo);
    location.href = u.toString();
  };

  global.MZYSSO = { init: function (cfg) { return new MZYSSO(cfg); } };
})(window);`;

  return new Response(js, {
    headers: {
      'Content-Type': 'application/javascript;charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
