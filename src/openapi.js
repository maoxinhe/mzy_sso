/**
 * 面向 AI 助手与自动化工具的「机读接口契约」
 *
 *   /llms.txt       —— 精简版（几 KB，AI 一次读完即可写出接入代码）
 *   /llms-full.txt  —— 完整版（多语言示例 + 错误码 + SDK + 管理 API）
 *   /openapi.json   —— OpenAPI 3.1 规范（可导入 Postman / 生成 SDK）
 *
 * 设计目标：让任意 AI 编程助手（Cursor / Claude / CodeBuddy 等）只需抓取
 * 其中一个 URL，就能掌握全部接入细节，无需人工讲解。
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'public, max-age=300'
};
const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=UTF-8',
  'Cache-Control': 'public, max-age=300'
};
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

export function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS }
  });
}

export function textRes(body, status = 200) {
  return new Response(body, {
    status,
    headers: { ...TEXT_HEADERS, ...CORS_HEADERS }
  });
}

/* =========================================================
 *  /llms.txt  —— 精简版契约
 * ========================================================= */

export function llmsTxt(I, env) {
  const site = env.SITE_NAME || 'MZY SSO';
  const adminApi = !!env.ADMIN_API_TOKEN;

  return `# ${site}

> 自建的 OAuth 2.0 / OpenID Connect 单点登录服务。任何支持 OAuth2 / OIDC 的客户端都能接入。

## 关键信息

- Issuer（服务根地址）: ${I}
- 授权端点: ${I}/oauth/authorize
- 令牌端点: ${I}/oauth/token
- 用户信息: ${I}/oauth/userinfo
- 令牌内省: ${I}/oauth/introspect
- 令牌撤销: ${I}/oauth/revoke
- 动态注册: ${I}/oauth/register
- OIDC 自动发现: ${I}/.well-known/openid-configuration
- JWKS 公钥: ${I}/.well-known/jwks.json
- 前端 SDK: ${I}/sdk.js
- 人类可读文档: ${I}/docs
- OpenAPI 规范: ${I}/openapi.json
- 本文件的完整版: ${I}/llms-full.txt

用标准库接入时，直接把「OIDC 自动发现」地址填进去即可自动完成配置。

## 接入流程（授权码模式 + PKCE，推荐）

第 1 步：生成随机 state 与 code_verifier（43-128 字符）
        code_challenge = BASE64URL( SHA256(code_verifier) )，方法填 S256

第 2 步：把用户浏览器跳转到
        GET ${I}/oauth/authorize
          ?client_id=你的client_id
          &redirect_uri=回调地址（必须与登记值逐字符一致）
          &response_type=code
          &scope=openid profile email
          &state=随机字符串
          &code_challenge=上一步算出的值
          &code_challenge_method=S256

第 3 步：用户登录并同意后，回调到 redirect_uri，URL 带上 ?code=xxx&state=xxx

第 4 步：服务端用 code 换令牌
        POST ${I}/oauth/token
        Content-Type: application/x-www-form-urlencoded
        grant_type=authorization_code&code=xxx&redirect_uri=回调地址
        &client_id=xxx&client_secret=xxx&code_verifier=原始verifier
        返回 { access_token, token_type: "Bearer", expires_in, refresh_token, id_token }

第 5 步：取用户信息
        GET ${I}/oauth/userinfo
        Authorization: Bearer <access_token>

第 6 步（可选）：刷新令牌
        POST ${I}/oauth/token
        grant_type=refresh_token&refresh_token=xxx&client_id=xxx&client_secret=xxx
        注意：刷新后旧的 refresh_token 立即失效（轮换机制）

客户端认证支持两种方式：Authorization: Basic base64(client_id:client_secret)
或直接在表单里带 client_id / client_secret。

## Scope 说明

- openid   —— 启用 OIDC，返回 id_token 与 sub（要拿 id_token 必填）
- profile  —— name、nickname、picture、gender、locale、providers
- email    —— email、email_verified
- username —— preferred_username
- uid      —— uid（与 sub 相同，兼容旧系统用）
- groups   —— groups（admin / user）

## userinfo 返回字段

sub（永久唯一 ID）、name、nickname、picture、email、email_verified、
preferred_username、providers（已绑定的第三方）、groups、updated_at

重要：关联账号请一律用 sub。邮箱和昵称用户可以改，sub 永久不变。

## 前端 SDK（零依赖，浏览器直连）

    <script src="${I}/sdk.js"></script>
    <script>
      const sso = MZYSSO.init({ issuer: '${I}', clientId: 'mzy_xxxxxxxxxxxx' });
      sso.login();                              // 跳登录
      await sso.handleRedirect();               // 回调页处理
      const { user } = await sso.getUser();     // 拿用户（自动续期）
      sso.logout('https://your.site');          // 退出
    </script>

SDK 自动处理 state 生成校验、PKCE 挑战、令牌存储与静默续期。

## 常见坑（AI 对接时最容易错的地方）

1. redirect_uri 必须与后台登记值逐字符一致：协议、端口、路径、结尾斜杠都要对
2. localhost 与 127.0.0.1 是两个不同的地址，不能混用
3. code 一次性、5 分钟有效，重复使用会报 invalid_grant
4. 换令牌时的 redirect_uri 必须与第 2 步完全一致（只用于校验，不再跳转）
5. 要拿 id_token 必须在 scope 里带上 openid

## 同源站点轻量接口

GET ${I}/api/me —— 带会话 Cookie 访问，返回当前登录用户。
同源前端可直接用它判断登录态，不必走完整 OAuth 流程。

${adminApi ? `## 管理 API（自动化 / AI 专用）

已启用。所有请求带请求头：Authorization: Bearer <ADMIN_API_TOKEN>

- GET    ${I}/api/admin/apps                     列出所有应用（密钥只显示前缀）
- POST   ${I}/api/admin/apps                     创建应用（返回完整 client_secret，仅此一次）
- GET    ${I}/api/admin/apps/{client_id}         应用详情
- PATCH  ${I}/api/admin/apps/{client_id}         修改名称 / 主页 / 回调 / scope
- POST   ${I}/api/admin/apps/{client_id}/reset-secret   重置密钥（旧密钥与旧令牌立即失效）
- DELETE ${I}/api/admin/apps/{client_id}         删除应用
- GET    ${I}/api/admin/users                    用户列表
- GET    ${I}/api/admin/tokens                   当前有效令牌
- POST   ${I}/api/admin/tokens/revoke            撤销某个令牌
- GET    ${I}/api/admin/stats                    统计与实例配置
- GET    ${I}/api/admin/logs                     操作审计日志

client_secret 只在「创建」和「重置密钥」时返回一次，请立刻保存；忘记就重置一个。
` : ''}## 给 AI 助手的提示

如果你是帮用户对接本服务的 AI，完整契约见 ${I}/llms-full.txt，
机器可解析的规范见 ${I}/openapi.json。
标准 OAuth2/OIDC 库（Authlib、Passport、Laravel Socialite、Spring Security、
oidc-client-ts 等）直接填自动发现地址即可，无需手写流程。
`;
}

/* =========================================================
 *  /llms-full.txt —— 完整版契约
 * ========================================================= */

export function llmsFullTxt(I, env) {
  const site = env.SITE_NAME || 'MZY SSO';
  const adminApi = !!env.ADMIN_API_TOKEN;

  return `# ${site} —— 完整接入契约（AI / 开发者）

本文件是 ${site} 的完整机读文档。Issuer 为 ${I}。

## 目录

1. 服务概览与端点清单
2. 授权码 + PKCE 完整流程（含 curl）
3. 刷新令牌 / 内省 / 撤销
4. Scope 与 userinfo 字段
5. 多语言接入示例（Node / Python / PHP）
6. 前端 SDK
7. 错误码
8. 同源接口 /api/me
${adminApi ? '9. 管理 API（自动化）\n' : ''}
## 1. 服务概览与端点清单

| 方法 | 端点 | 说明 |
|---|---|---|
| GET  | /.well-known/openid-configuration | OIDC 自动发现（标准库填这个） |
| GET  | /.well-known/jwks.json | 签名公钥（JWKS） |
| GET  | /oauth/authorize | 授权端点（浏览器跳转） |
| POST | /oauth/token | 令牌端点 |
| GET/POST | /oauth/userinfo | 用户信息 |
| POST | /oauth/introspect | 令牌内省 RFC 7662 |
| POST | /oauth/revoke | 令牌撤销 RFC 7009 |
| POST | /oauth/register | 动态客户端注册 RFC 7591（需管理员开启） |
| GET  | /api/me | 当前登录用户（会话 Cookie） |
| GET  | /logout | 退出登录 |
| GET  | /sdk.js | 前端 SDK |

登录方式：账号密码、QQ（小白菜聚合登录）、GitHub 授权。
第三方登录由本服务代理，接入方无需关心，统一走上面的 OAuth 流程。

## 2. 授权码 + PKCE 完整流程

### 2.1 构造跳转

    GET ${I}/oauth/authorize
      ?client_id=mzy_xxxxxxxxxxxx
      &redirect_uri=http://localhost:3000/callback
      &response_type=code
      &scope=openid profile email
      &state=随机字符串（防 CSRF，回调时原样带回，需校验）
      &code_challenge=BASE64URL(SHA256(code_verifier))
      &code_challenge_method=S256

用户未登录会先跳登录页（含 QQ / GitHub 快捷登录），登录后再跳同意页，
同意后带 code 回调到 redirect_uri。若该用户此前已同意过，会直接回调，不再询问。

### 2.2 用 code 换令牌（curl）

    curl -X POST ${I}/oauth/token \\
      -d grant_type=authorization_code \\
      -d code=回调拿到的code \\
      -d redirect_uri=http://localhost:3000/callback \\
      -d client_id=mzy_xxxxxxxxxxxx \\
      -d client_secret=cs_xxxxxxxxxxxx \\
      -d code_verifier=原始的verifier

成功返回：

    {
      "access_token": "mzy_at_xxxxxxxx",
      "token_type": "Bearer",
      "expires_in": 7200,
      "refresh_token": "mzy_rt_xxxxxxxx",
      "id_token": "eyJhbGciOi..."
    }

### 2.3 取用户信息

    curl ${I}/oauth/userinfo -H "Authorization: Bearer mzy_at_xxxxxxxx"

返回示例：

    {
      "sub": "u_eofm9yi-lefslj5u",
      "name": "张三",
      "nickname": "张三",
      "picture": "https://thirdqq.qlogo.cn/...",
      "email": "zhangsan@example.com",
      "email_verified": false,
      "preferred_username": "zhangsan",
      "providers": ["qq", "github"],
      "groups": ["user"],
      "updated_at": 1788677071862
    }

## 3. 刷新 / 内省 / 撤销

刷新（旧 refresh_token 立即失效，务必保存新的）：

    curl -X POST ${I}/oauth/token \\
      -d grant_type=refresh_token \\
      -d refresh_token=mzy_rt_xxxxxxxx \\
      -d client_id=mzy_xxxxxxxxxxxx \\
      -d client_secret=cs_xxxxxxxxxxxx

内省（资源服务器校验令牌是否有效，返回 active）：

    curl -X POST ${I}/oauth/introspect \\
      -d token=mzy_at_xxxxxxxx \\
      -d client_id=mzy_xxxxxxxxxxxx \\
      -d client_secret=cs_xxxxxxxxxxxx

撤销（登出时调用，让令牌立即失效）：

    curl -X POST ${I}/oauth/revoke \\
      -d token=mzy_at_xxxxxxxx \\
      -d client_id=mzy_xxxxxxxxxxxx \\
      -d client_secret=cs_xxxxxxxxxxxx

## 4. Scope 与字段

| scope | 返回字段 |
|---|---|
| openid | 启用 OIDC，返回 id_token 与 sub |
| profile | name、nickname、picture、gender、locale、providers |
| email | email、email_verified |
| username | preferred_username |
| uid | uid（同 sub，兼容用） |
| groups | groups（admin / user） |

关联账号用 sub，不要用邮箱。

## 5. 多语言接入示例

### Node.js（原生 fetch，无依赖）

    const I = '${I}';
    const ID = 'mzy_xxxxxxxxxxxx', SECRET = 'cs_xxxxxxxxxxxx';
    const CB = 'http://localhost:3000/callback';

    // 1) 跳登录
    app.get('/login', (req, res) => {
      const state = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('base64url');
      req.session.state = state; req.session.verifier = verifier;
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
      res.redirect(I + '/oauth/authorize?' + new URLSearchParams({
        client_id: ID, redirect_uri: CB, response_type: 'code',
        scope: 'openid profile email', state, 
        code_challenge: challenge, code_challenge_method: 'S256'
      }));
    });

    // 2) 回调换令牌
    app.get('/callback', async (req, res) => {
      if (req.query.state !== req.session.state) return res.status(400).send('state 不匹配');
      const r = await fetch(I + '/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code', code: req.query.code,
          redirect_uri: CB, client_id: ID, client_secret: SECRET,
          code_verifier: req.session.verifier
        })
      });
      const token = await r.json();
      const u = await fetch(I + '/oauth/userinfo', {
        headers: { Authorization: 'Bearer ' + token.access_token }
      }).then(x => x.json());
      req.session.user = u;              // sub 用于关联本地账号
      res.redirect('/');
    });

### Python（Flask + Authlib 标准库）

    from authlib.integrations.flask_client import OAuth
    oauth = OAuth(app)
    oauth.register(
        name='mzy',
        client_id='mzy_xxxxxxxxxxxx',
        client_secret='cs_xxxxxxxxxxxx',
        server_metadata_url='${I}/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid profile email'},
    )
    # 登录：redirect(oauth.mzy.authorize_redirect(redirect_uri=CB))
    # 回调：token = oauth.mzy.authorize_access_token()
    #       user  = oauth.mzy.parse_id_token(token)   # 或调 userinfo

### PHP（原生）

    $I = '${I}';
    // 换令牌
    $ch = curl_init($I . '/oauth/token');
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POSTFIELDS => http_build_query([
        'grant_type'    => 'authorization_code',
        'code'          => $_GET['code'],
        'redirect_uri'  => 'http://localhost:3000/callback',
        'client_id'     => 'mzy_xxxxxxxxxxxx',
        'client_secret' => 'cs_xxxxxxxxxxxx',
      ]),
    ]);
    $token = json_decode(curl_exec($ch), true);

    // 取用户
    $ch = curl_init($I . '/oauth/userinfo');
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token['access_token']],
    ]);
    $user = json_decode(curl_exec($ch), true);
    $uid = $user['sub'];   // 用它关联本地账号

## 6. 前端 SDK

    <script src="${I}/sdk.js"></script>

MZYSSO.init({issuer, clientId}) 返回对象方法：
  login()                 跳转登录
  handleRedirect()        在回调页调用，返回 session
  getUser()               获取用户，令牌过期自动用 refresh_token 续期
  logout(redirectUri)     退出登录

内部自动完成 state 生成校验、PKCE、令牌存储（localStorage）与静默续期。

## 7. 错误码

令牌端点失败返回 { error, error_description }：

| error | 含义与处理 |
|---|---|
| invalid_request | 缺少必填参数或参数格式错，检查请求体 |
| invalid_client | client_id 或 client_secret 错误 |
| invalid_grant | code/refresh_token 无效、已过期或已被用过（一次性） |
| unsupported_grant_type | grant_type 不支持 |
| invalid_scope | 申请了应用未登记的 scope |
| access_denied | 用户在同意页点了拒绝 |
| redirect_uri_mismatch | 回调地址与登记值不一致（逐字符比对） |
| registration_not_allowed | 未开放自助注册应用 |
| server_error | 服务端异常，可重试 |

HTTP 状态码对应：400 参数/授权错，401 认证失败，403 禁止，5xx 服务端错。

## 8. 同源接口 /api/me

带会话 Cookie 请求，返回当前登录用户 JSON；未登录返回 401。
适合与 SSO 同源的站点直接判断登录态，省掉完整 OAuth 往返。
${adminApi ? `
## 9. 管理 API（自动化 / AI 专用）

所有请求需带请求头：Authorization: Bearer <ADMIN_API_TOKEN>
（也支持 X-Admin-Token 头）。支持 JSON 或表单两种请求体。

### 应用管理

列出应用（密钥只返回前缀，不泄露全文）

    curl ${I}/api/admin/apps -H "Authorization: Bearer $TOKEN"

创建应用（返回完整 client_secret，只此一次）

    curl -X POST ${I}/api/admin/apps \\
      -H "Authorization: Bearer $TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{"name":"我的站点","redirect_uris":["http://localhost:3000/callback"],
           "scopes":["openid","profile","email"],"homepage":"https://a.com"}'

    返回 { "client_id": "mzy_xxx", "client_secret": "cs_xxx", ... }

修改应用（只传要改的字段，密钥不受影响）

    curl -X PATCH ${I}/api/admin/apps/mzy_xxx \\
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
      -d '{"name":"新名字","redirect_uris":["https://a.com/cb"]}'

重置密钥（旧密钥立即失效，该应用已签发令牌全部撤销，返回新密钥）

    curl -X POST ${I}/api/admin/apps/mzy_xxx/reset-secret \\
      -H "Authorization: Bearer $TOKEN"

删除应用

    curl -X DELETE ${I}/api/admin/apps/mzy_xxx -H "Authorization: Bearer $TOKEN"

### 用户 / 令牌 / 统计

    GET    ${I}/api/admin/users           用户列表
    GET    ${I}/api/admin/tokens          当前有效令牌（含过期时间）
    POST   ${I}/api/admin/tokens/revoke   撤销令牌，body: {"token":"mzy_at_xxx"}
    GET    ${I}/api/admin/stats           统计与实例配置
    GET    ${I}/api/admin/logs            操作审计日志

client_secret 只在创建与重置时返回一次，请立即保存。
` : ''}
---

机器可解析规范：${I}/openapi.json
人类可读文档：${I}/docs
`;
}

/* =========================================================
 *  /openapi.json —— OpenAPI 3.1 规范
 * ========================================================= */

export function openApiSpec(I, env) {
  const site = env.SITE_NAME || 'MZY SSO';
  const hasAdmin = !!env.ADMIN_API_TOKEN;

  const bearerAuth = {
    type: 'http',
    scheme: 'bearer',
    description: `管理 API 令牌（ADMIN_API_TOKEN），格式：Authorization: Bearer <token>`
  };

  const spec = {
    openapi: '3.1.0',
    info: {
      title: `${site} API`,
      version: '1.1.0',
      description:
        `自建的 OAuth 2.0 / OpenID Connect 单点登录服务。\n\n` +
        `标准 OIDC 客户端请直接用自动发现地址：${I}/.well-known/openid-configuration\n\n` +
        `AI 助手可直接读取 ${I}/llms.txt 获取精简接入契约。`,
      contact: { name: site, url: I }
    },
    servers: [{ url: I, description: '线上实例' }],
    tags: [
      { name: 'Discovery', description: 'OIDC 自动发现与公钥' },
      { name: 'OAuth', description: 'OAuth 2.0 / OIDC 标准端点' },
      { name: 'Session', description: '会话与同源接口' },
      { name: 'AI', description: '面向 AI 助手的机读文档' },
      ...(hasAdmin ? [{ name: 'Admin', description: '管理 API（需 Bearer 令牌）' }] : [])
    ],
    paths: {
      '/.well-known/openid-configuration': {
        get: {
          tags: ['Discovery'],
          summary: 'OIDC 自动发现文档',
          operationId: 'getDiscovery',
          responses: {
            200: {
              description: '发现文档',
              content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } }
            }
          }
        }
      },
      '/.well-known/jwks.json': {
        get: {
          tags: ['Discovery'],
          summary: 'JWKS 签名公钥',
          operationId: 'getJwks',
          responses: {
            200: {
              description: 'JWKS',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/JWKS' } } }
            }
          }
        }
      },
      '/oauth/authorize': {
        get: {
          tags: ['OAuth'],
          summary: '授权端点（浏览器跳转）',
          operationId: 'authorize',
          parameters: [
            { name: 'client_id', in: 'query', required: true, schema: { type: 'string', example: 'mzy_xxxxxxxxxxxx' } },
            { name: 'redirect_uri', in: 'query', required: true, description: '必须与登记值逐字符一致', schema: { type: 'string', format: 'uri' } },
            { name: 'response_type', in: 'query', required: true, schema: { type: 'string', enum: ['code'] } },
            { name: 'scope', in: 'query', required: false, description: '空格分隔，常用 openid profile email', schema: { type: 'string', example: 'openid profile email' } },
            { name: 'state', in: 'query', required: false, description: '防 CSRF，回调原样带回', schema: { type: 'string' } },
            { name: 'code_challenge', in: 'query', required: false, description: 'PKCE，BASE64URL(SHA256(verifier))', schema: { type: 'string' } },
            { name: 'code_challenge_method', in: 'query', required: false, schema: { type: 'string', enum: ['S256', 'plain'] } },
            { name: 'prompt', in: 'query', required: false, description: '填 consent 可强制重新询问授权', schema: { type: 'string' } }
          ],
          responses: {
            302: { description: '重定向到登录页、同意页，或带 code 回调 redirect_uri' },
            400: { $ref: '#/components/responses/OAuthError' }
          }
        }
      },
      '/oauth/token': {
        post: {
          tags: ['OAuth'],
          summary: '令牌端点',
          operationId: 'token',
          requestBody: {
            required: true,
            content: {
              'application/x-www-form-urlencoded': {
                schema: {
                  type: 'object',
                  required: ['grant_type'],
                  properties: {
                    grant_type: { type: 'string', enum: ['authorization_code', 'refresh_token', 'client_credentials'] },
                    code: { type: 'string', description: 'authorization_code 模式必填（一次性，5 分钟有效）' },
                    redirect_uri: { type: 'string', format: 'uri', description: 'authorization_code 模式必填，须与授权请求一致' },
                    code_verifier: { type: 'string', description: 'PKCE verifier，发起时用了 challenge 就必填' },
                    refresh_token: { type: 'string', description: 'refresh_token 模式必填（用后旧令牌失效）' },
                    client_id: { type: 'string' },
                    client_secret: { type: 'string', description: '也可用 Authorization: Basic base64(id:secret)' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: '令牌',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } }
            },
            400: { $ref: '#/components/responses/OAuthError' }
          }
        }
      },
      '/oauth/userinfo': {
        get: {
          tags: ['OAuth'],
          summary: '用户信息',
          operationId: 'userinfo',
          security: [{ bearerAccess: [] }],
          responses: {
            200: {
              description: '用户信息',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Userinfo' } } }
            },
            401: { $ref: '#/components/responses/OAuthError' }
          }
        },
        post: {
          tags: ['OAuth'],
          summary: '用户信息（POST 等价）',
          operationId: 'userinfoPost',
          security: [{ bearerAccess: [] }],
          responses: {
            200: { description: '用户信息', content: { 'application/json': { schema: { $ref: '#/components/schemas/Userinfo' } } } }
          }
        }
      },
      '/oauth/introspect': {
        post: {
          tags: ['OAuth'],
          summary: '令牌内省 RFC 7662',
          operationId: 'introspect',
          requestBody: {
            required: true,
            content: {
              'application/x-www-form-urlencoded': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string' },
                    token_type_hint: { type: 'string', enum: ['access_token', 'refresh_token'] },
                    client_id: { type: 'string' },
                    client_secret: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: '内省结果，active 为 true 表示有效',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Introspection' } } }
            }
          }
        }
      },
      '/oauth/revoke': {
        post: {
          tags: ['OAuth'],
          summary: '令牌撤销 RFC 7009',
          operationId: 'revoke',
          requestBody: {
            required: true,
            content: {
              'application/x-www-form-urlencoded': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string' },
                    token_type_hint: { type: 'string', enum: ['access_token', 'refresh_token'] },
                    client_id: { type: 'string' },
                    client_secret: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: '已撤销（无效令牌同样返回 200）' } }
        }
      },
      '/oauth/register': {
        post: {
          tags: ['OAuth'],
          summary: '动态客户端注册 RFC 7591（需管理员开启）',
          operationId: 'register',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['client_name', 'redirect_uris'],
                  properties: {
                    client_name: { type: 'string' },
                    redirect_uris: { type: 'array', items: { type: 'string', format: 'uri' } },
                    client_uri: { type: 'string', format: 'uri' },
                    scope: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: '注册成功，返回 client_id / client_secret' },
            403: { $ref: '#/components/responses/OAuthError' }
          }
        }
      },
      '/api/me': {
        get: {
          tags: ['Session'],
          summary: '当前登录用户（会话 Cookie）',
          operationId: 'me',
          responses: {
            200: { description: '当前用户', content: { 'application/json': { schema: { $ref: '#/components/schemas/Userinfo' } } } },
            401: { description: '未登录' }
          }
        }
      },
      '/llms.txt': {
        get: {
          tags: ['AI'],
          summary: 'AI 精简接入契约（纯文本）',
          operationId: 'llmsTxt',
          responses: { 200: { description: '精简契约', content: { 'text/plain': { schema: { type: 'string' } } } } }
        }
      },
      '/llms-full.txt': {
        get: {
          tags: ['AI'],
          summary: 'AI 完整接入契约（纯文本）',
          operationId: 'llmsFullTxt',
          responses: { 200: { description: '完整契约', content: { 'text/plain': { schema: { type: 'string' } } } } }
        }
      },
      '/openapi.json': {
        get: {
          tags: ['AI'],
          summary: '本 OpenAPI 规范',
          operationId: 'openapi',
          responses: { 200: { description: 'OpenAPI 3.1 文档' } }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAccess: { type: 'http', scheme: 'bearer', description: 'OAuth access_token（mzy_at_ 开头）' },
        ...(hasAdmin ? { adminToken: bearerAuth } : {})
      },
      responses: {
        OAuthError: {
          description: 'OAuth 标准错误',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'invalid_grant' },
                  error_description: { type: 'string' }
                }
              }
            }
          }
        }
      },
      schemas: {
        TokenResponse: {
          type: 'object',
          properties: {
            access_token: { type: 'string', example: 'mzy_at_xxxxxxxx' },
            token_type: { type: 'string', example: 'Bearer' },
            expires_in: { type: 'integer', example: 7200 },
            refresh_token: { type: 'string', example: 'mzy_rt_xxxxxxxx' },
            id_token: { type: 'string', description: 'scope 含 openid 时返回（JWT HS256）' },
            scope: { type: 'string' }
          }
        },
        Userinfo: {
          type: 'object',
          properties: {
            sub: { type: 'string', description: '永久唯一 ID，关联账号请用这个' },
            uid: { type: 'string', description: '同 sub' },
            name: { type: 'string' },
            nickname: { type: 'string' },
            picture: { type: 'string', format: 'uri' },
            email: { type: 'string' },
            email_verified: { type: 'boolean' },
            preferred_username: { type: 'string' },
            providers: { type: 'array', items: { type: 'string', enum: ['password', 'qq', 'github'] } },
            groups: { type: 'array', items: { type: 'string', enum: ['admin', 'user'] } },
            updated_at: { type: 'integer' }
          }
        },
        Introspection: {
          type: 'object',
          properties: {
            active: { type: 'boolean' },
            scope: { type: 'string' },
            client_id: { type: 'string' },
            sub: { type: 'string' },
            exp: { type: 'integer' },
            iat: { type: 'integer' },
            token_type: { type: 'string' }
          }
        },
        App: {
          type: 'object',
          properties: {
            client_id: { type: 'string', example: 'mzy_xxxxxxxxxxxx' },
            client_secret: { type: 'string', description: '仅创建/重置时返回一次', example: 'cs_xxxxxxxxxxxx' },
            client_secret_hint: { type: 'string', description: '列表接口的掩码形式', example: 'cs_...abcd' },
            name: { type: 'string' },
            homepage: { type: 'string', nullable: true },
            redirect_uris: { type: 'array', items: { type: 'string' } },
            scopes: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'integer' },
            updated_at: { type: 'integer' }
          }
        },
        JWKS: {
          type: 'object',
          properties: {
            keys: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kty: { type: 'string', example: 'oct' },
                  use: { type: 'string', example: 'sig' },
                  alg: { type: 'string', example: 'HS256' },
                  kid: { type: 'string' },
                  k: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  };

  /* ---- 管理 API（仅在配置了 ADMIN_API_TOKEN 时暴露） ---- */
  if (hasAdmin) {
    const adminSecurity = [{ adminToken: [] }];
    Object.assign(spec.paths, {
      '/api/admin/apps': {
        get: {
          tags: ['Admin'], summary: '列出所有应用', operationId: 'adminListApps',
          security: adminSecurity,
          responses: { 200: { description: '应用列表', content: { 'application/json': { schema: { type: 'object', properties: { apps: { type: 'array', items: { $ref: '#/components/schemas/App' } } } } } } } }
        },
        post: {
          tags: ['Admin'], summary: '创建应用（返回完整 client_secret）', operationId: 'adminCreateApp',
          security: adminSecurity,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['name', 'redirect_uris'],
                  properties: {
                    name: { type: 'string' },
                    redirect_uris: { type: 'array', items: { type: 'string' }, description: '也可传换行分隔的字符串' },
                    homepage: { type: 'string' },
                    scopes: { type: 'array', items: { type: 'string' }, example: ['openid', 'profile', 'email'] }
                  }
                }
              }
            }
          },
          responses: { 201: { description: '创建成功，含 client_secret' }, 400: { description: '参数错误' } }
        }
      },
      '/api/admin/apps/{client_id}': {
        parameters: [{ name: 'client_id', in: 'path', required: true, schema: { type: 'string', example: 'mzy_xxxxxxxxxxxx' } }],
        get: {
          tags: ['Admin'], summary: '应用详情', operationId: 'adminGetApp',
          security: adminSecurity,
          responses: { 200: { description: '应用详情' }, 404: { description: '不存在' } }
        },
        patch: {
          tags: ['Admin'], summary: '修改应用配置（密钥不受影响）', operationId: 'adminUpdateApp',
          security: adminSecurity,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    homepage: { type: 'string' },
                    redirect_uris: { type: 'array', items: { type: 'string' } },
                    scopes: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          responses: { 200: { description: '已更新' }, 404: { description: '不存在' } }
        },
        delete: {
          tags: ['Admin'], summary: '删除应用', operationId: 'adminDeleteApp',
          security: adminSecurity,
          responses: { 200: { description: '已删除' }, 404: { description: '不存在' } }
        }
      },
      '/api/admin/apps/{client_id}/reset-secret': {
        parameters: [{ name: 'client_id', in: 'path', required: true, schema: { type: 'string' } }],
        post: {
          tags: ['Admin'], summary: '重置密钥（旧密钥与旧令牌立即失效，返回新密钥）', operationId: 'adminResetSecret',
          security: adminSecurity,
          responses: { 200: { description: '新 client_secret' }, 404: { description: '不存在' } }
        }
      },
      '/api/admin/users': {
        get: {
          tags: ['Admin'], summary: '用户列表', operationId: 'adminListUsers',
          security: adminSecurity,
          responses: { 200: { description: '用户列表' } }
        }
      },
      '/api/admin/tokens': {
        get: {
          tags: ['Admin'], summary: '当前有效令牌', operationId: 'adminListTokens',
          security: adminSecurity,
          responses: { 200: { description: '令牌列表' } }
        }
      },
      '/api/admin/tokens/revoke': {
        post: {
          tags: ['Admin'], summary: '撤销令牌', operationId: 'adminRevokeToken',
          security: adminSecurity,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } } }
          },
          responses: { 200: { description: '已撤销' } }
        }
      },
      '/api/admin/stats': {
        get: {
          tags: ['Admin'], summary: '统计与实例配置', operationId: 'adminStats',
          security: adminSecurity,
          responses: { 200: { description: '统计' } }
        }
      },
      '/api/admin/logs': {
        get: {
          tags: ['Admin'], summary: '操作审计日志', operationId: 'adminLogs',
          security: adminSecurity,
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } }],
          responses: { 200: { description: '日志' } }
        }
      }
    });
  }

  return spec;
}
