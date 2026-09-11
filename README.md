# MZY SSO

部署在 Cloudflare Worker 上的轻量级单点登录服务。完整实现 **OAuth 2.0 授权服务器 + OpenID Connect**，内置账号密码、QQ（小白菜聚合登录）、GitHub 三种登录方式，全球边缘节点运行，零服务器运维。

- **线上地址**：https://sso.camzy.uno
- **在线文档**：https://sso.camzy.uno/docs
- **OIDC 发现**：https://sso.camzy.uno/.well-known/openid-configuration

---

## 特性

| 分类 | 说明 |
|---|---|
| 登录方式 | 账号密码（PBKDF2-SHA256 加盐哈希）、QQ 快捷登录、GitHub 授权登录 |
| 协议 | OAuth 2.0 授权码模式 + PKCE（RFC 7636）、Refresh Token 轮换、OIDC id_token（HS256） |
| 标准端点 | `authorize` / `token` / `userinfo` / `introspect` / `revoke` / `register` / `end_session` |
| 自动发现 | `/.well-known/openid-configuration`、`/.well-known/jwks.json` |
| 管理后台 | 应用（Client）增删改查、**密钥可重置**、令牌管理、用户角色、系统状态与操作审计 |
| 前端 SDK | `/sdk.js`，零依赖，自动生成 state 与 PKCE，自动续期 |
| **AI 可机读** | `/llms.txt`、`/llms-full.txt`、`/openapi.json`，AI 助手读完即可自动对接 |
| **管理 API** | REST 建应用 / 改配置 / 重置密钥 / 撤销令牌，令牌鉴权，便于脚本与 AI 自动化 |
| 存储 | Cloudflare KV，全球复制，读延迟极低 |
| 体积 | 打包后约 235 KB（gzip 约 55 KB），冷启动几乎无感 |

---

## 3 分钟上手

### 第 1 步：初始化管理员

浏览器打开 https://sso.camzy.uno/setup ，创建第一个账号。该账号自动获得管理员权限。

> `/setup` 只在系统内没有任何用户时可用，创建后自动关闭。

### 第 2 步：创建接入应用

进入 https://sso.camzy.uno/admin → **应用管理** → 创建应用。

- **回调地址**必须与接入方**逐字符完全一致**（协议、端口、路径、结尾斜杠都要对）
- 保存后得到 `client_id`（`mzy_` 开头）和 `client_secret`（`cs_` 开头）

### 第 3 步：接入你的站点

把登录按钮指向：

```
https://sso.camzy.uno/oauth/authorize
  ?client_id=mzy_xxxxxxxxxxxx
  &redirect_uri=https://your.site/oauth/callback
  &response_type=code
  &scope=openid profile email
  &state=随机字符串
```

回调里拿到 `code`，服务端换取 token：

```bash
curl -X POST https://sso.camzy.uno/oauth/token \
  -d grant_type=authorization_code \
  -d code=上一步的code \
  -d redirect_uri=https://your.site/oauth/callback \
  -d client_id=mzy_xxxxxxxxxxxx \
  -d client_secret=cs_xxxxxxxxxxxx
```

再取用户资料：

```bash
curl https://sso.camzy.uno/oauth/userinfo \
  -H "Authorization: Bearer mzy_at_xxxxxxxx"
```

完整流程图、多语言示例（PHP / Python / Node / Go / Java）、错误码表见 **在线文档**：https://sso.camzy.uno/docs

---

## AI 对接与开放 API

想让 AI 助手（Cursor / Claude / CodeBuddy / Copilot 等）帮你把登录接进来？不用把文档粘给它，
把下面任一地址发过去，它自己就能读完完整契约并写出接入代码：

| 地址 | 用途 | 体积 |
|---|---|---|
| https://sso.camzy.uno/llms.txt | **精简契约（首选）** | 约 6 KB |
| https://sso.camzy.uno/llms-full.txt | 完整契约（多语言示例 + 错误码 + 管理 API） | 约 11 KB |
| https://sso.camzy.uno/openapi.json | OpenAPI 3.1 规范 | 可导入 Postman / 生成 SDK |

OIDC 发现文档里也附带了这几个地址（`x_llms_txt`、`x_openapi` 等字段，
OIDC 规范要求客户端忽略未知字段，不影响任何标准库）。

### 管理 API（让 AI / 脚本自动建应用）

管理后台能做的，REST 接口都能做 —— AI 不必点页面就能把应用建好。

**启用**：设置一个管理令牌（不设置则整套管理接口返回 404，默认关闭）

```bash
npx wrangler secret put ADMIN_API_TOKEN
```

**鉴权**：所有请求带 `Authorization: Bearer <ADMIN_API_TOKEN>`（也支持 `X-Admin-Token` 头）

```bash
# 创建应用（返回 client_secret，仅此一次，务必立刻保存）
curl -X POST https://sso.camzy.uno/api/admin/apps \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"我的站点","redirect_uris":["http://localhost:3000/callback"]}'
```

| 方法 | 端点 | 说明 |
|---|---|---|
| GET | `/api/admin` | 能力探测，返回所有可用端点 |
| GET | `/api/admin/apps` | 列出应用（密钥只显示掩码） |
| POST | `/api/admin/apps` | 创建应用，返回完整 `client_secret` |
| GET | `/api/admin/apps/{id}` | 应用详情 |
| PATCH | `/api/admin/apps/{id}` | 改名称 / 主页 / 回调 / scope |
| POST | `/api/admin/apps/{id}/reset-secret` | 重置密钥（旧密钥与旧令牌立即失效） |
| DELETE | `/api/admin/apps/{id}` | 删除应用（连带清理令牌与授权） |
| GET | `/api/admin/users` | 用户列表 |
| GET | `/api/admin/tokens` | 当前有效令牌 |
| POST | `/api/admin/tokens/revoke` | 撤销令牌 |
| GET | `/api/admin/stats` | 统计与实例配置 |
| GET | `/api/admin/logs` | 操作审计日志 |

> `client_secret` 只在**创建**和**重置密钥**时返回一次，请立即保存。
> 忘记就只能重置一个新的（旧密钥与该应用下已签发令牌会一并失效）。

---

## 管理后台

管理后台是**你自己掌控的全功能控制台**，证明这是一个**自建实例**而非托管的 SaaS。所有数据都存在你自己的 Cloudflare KV 里。地址：https://sso.camzy.uno/admin

### 应用管理（应用中心）

每个接入方在 OIDC 术语里是一个 **Client（应用）**。在 **应用管理** 中可以：

| 操作 | 说明 |
|---|---|
| 创建应用 | 填写名称、主页、回调地址、申请的 scope，得到 `client_id` / `client_secret` |
| **编辑配置** | 名称、主页、回调地址、scope 都能随时改，**不需要删除重建** |
| **重置密钥** | 一键轮换 `client_secret`：立即生成新密钥，旧密钥立刻失效，且**该应用下所有已签发令牌自动撤销**（已登录的用户会被要求重新授权） |
| 删除应用 | 删除后该应用所有令牌与用户授权一并清除 |

> 为什么能编辑 / 重置了？
> 早期版本应用配置只能删除重建、密钥无法重置——这是设计缺陷，已在 v1.1.0 修复。现在应用中心支持完整编辑，密钥可安全轮换且会联动失效旧令牌。

### 用户管理

- 把任意用户设为 / 取消 **管理员**
- 管理员可见并进入管理后台；普通用户只有个人中心

### 令牌管理

- 列出当前所有**有效访问令牌**（按应用分组、带过期倒计时）
- 可单独**撤销**某个令牌，撤销后立即失效（用该令牌调 `userinfo` 会返回 401）

### 系统状态

- **这是一个自建实例**：展示实例首次启动时间、运行时长、存储后端（Cloudflare KV）、已启用登录方式、令牌有效期策略
- **操作审计日志**：初始化、建应用、改配置、重置密钥、撤销令牌等关键动作都会留痕（保留 90 天）

### 个人中心

- 地址：https://sso.camzy.uno/profile
- 查看/修改资料、解绑第三方账号
- **已授权应用**：列出你用本 SSO 登录过的所有应用，可随时**撤回某个应用的授权**（撤回后该应用下的令牌一并失效）

---

## API 生态

### 标准端点

| 方法 | 端点 | 说明 |
|---|---|---|
| GET | `/.well-known/openid-configuration` | OIDC 发现文档，标准库自动配置用 |
| GET | `/oauth/authorize` | 授权端点（浏览器跳转） |
| POST | `/oauth/token` | 令牌端点（服务端调用） |
| GET/POST | `/oauth/userinfo` | 用户信息（Bearer Token） |
| POST | `/oauth/introspect` | 令牌内省（RFC 7662） |
| POST | `/oauth/revoke` | 令牌撤销（RFC 7009） |
| POST | `/oauth/register` | 动态客户端注册（RFC 7591，需开启） |
| GET | `/logout` | 退出登录，支持 `post_logout_redirect_uri` |

### 令牌端点支持的 grant

| grant_type | 用途 | 必需参数 |
|---|---|---|
| `authorization_code` | 授权码换令牌 | `code`、`redirect_uri`、`client_id`、`client_secret` |
| `refresh_token` | 刷新令牌（旧 token 立即失效） | `refresh_token`、`client_id`、`client_secret` |
| `client_credentials` | 服务端对服务端 | `client_id`、`client_secret` |

客户端认证支持 **HTTP Basic**（`Authorization: Basic base64(id:secret)`）和 **表单字段**两种方式。

### Scope

| scope | 返回字段 |
|---|---|
| `openid` | 启用 OIDC，返回 `id_token` 与 `sub` |
| `profile` | `name`、`nickname`、`picture`、`gender`、`locale`、`providers` |
| `email` | `email`、`email_verified` |
| `username` | `preferred_username` |
| `uid` | `uid`（与 `sub` 相同，兼容用） |
| `groups` | `groups`（`admin` / `user`） |

### userinfo 返回示例

```json
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
```

> **关联账号请用 `sub`**。邮箱、昵称用户可以改，`sub` 永久不变。

### 前端 SDK

```html
<script src="https://sso.camzy.uno/sdk.js"></script>
<script>
  const sso = MZYSSO.init({
    issuer: 'https://sso.camzy.uno',
    clientId: 'mzy_xxxxxxxxxxxx'
  });

  sso.login();                          // 跳转登录
  const session = await sso.handleRedirect();  // 回调页处理
  const { user } = await sso.getUser();        // 获取用户（自动续期）
  sso.logout('https://your.site');             // 退出
</script>
```

SDK 自动处理 `state` 生成校验、PKCE 挑战、token 存储与静默续期。

### 轻量 JSON API

`GET /api/me` —— 带会话 Cookie 访问，返回当前登录用户（同源站点可直接用来判断登录态）。

---

## 第三方登录配置

### QQ（小白菜聚合登录）

在 [https://u.0mz.cn](https://u.0mz.cn) 申请 APPID / APPKEY，填入配置。

回调地址填：`https://sso.camzy.uno/api/connect/qq/callback`

### GitHub

在 GitHub → Settings → Developer settings → OAuth Apps 创建应用。

**Authorization callback URL 必须填**：`https://sso.camzy.uno/api/connect/github/callback`

> 这是最容易漏的一步。回调地址不匹配会报 `redirect_uri_mismatch`。

---

## 自行部署 / 二次开发

### 前置条件

- Node.js 18+
- Cloudflare 账户

### 部署步骤

```bash
git clone https://github.com/maoxinhe/mzy_sso.git
cd mzy_sso
npm install

# 1. 登录 Cloudflare
npx wrangler login

# 2. 创建 KV 命名空间，把返回的 id 填进 wrangler.toml
npx wrangler kv namespace create mzy-sso-kv

# 3. 修改 wrangler.toml：ISSUER、routes、QQ/GitHub 配置

# 4. 敏感配置用 Secret 写入（推荐，不要提交到 Git）
npx wrangler secret put JWT_SECRET
npx wrangler secret put QQ_APPKEY
npx wrangler secret put GITHUB_CLIENT_SECRET

# 5. 部署
npm run deploy
```

### 本地调试

```bash
npm run dev          # http://localhost:8787
```

### 配置项说明

| 变量 | 说明 | 默认值 |
|---|---|---|
| `ISSUER` | 服务对外根地址，必须与浏览器实际访问地址一致 | — |
| `SITE_NAME` | 显示在登录页与文档的服务名 | MZY SSO |
| `QQ_API` / `QQ_APPID` / `QQ_APPKEY` | 小白菜聚合登录配置 | — |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth App | — |
| `JWT_SECRET` | id_token 签名密钥 | — |
| `ACCESS_TOKEN_TTL` | 访问令牌有效期（秒） | 7200 |
| `REFRESH_TOKEN_TTL` | 刷新令牌有效期（秒） | 2592000 |
| `AUTH_CODE_TTL` | 授权码有效期（秒） | 300 |
| `SESSION_TTL` | 浏览器会话有效期（秒） | 604800 |
| `ALLOW_REGISTER` | 是否开放公开注册 | true |
| `ALLOW_APP_REGISTER` | 是否开放应用自助注册（RFC 7591） | false |
| `ADMIN_API_TOKEN` | 管理 API 令牌（建议用 Secret 写入）。不设置则管理 API 整体关闭 | — |

### 目录结构

```
mzy_sso/
├── src/
│   ├── index.js       # Worker 入口与路由分发
│   ├── oauth.js       # OAuth 2.0 / OIDC 授权服务器核心
│   ├── store.js       # Cloudflare KV 数据层
│   ├── crypto.js      # PBKDF2 密码哈希、JWT、PKCE、随机数
│   ├── providers.js   # QQ（小白菜）与 GitHub 登录适配器
│   ├── ui.js          # 登录/注册/同意/个人中心页面
│   ├── admin.js       # 管理后台（网页）
│   ├── adminapi.js    # 管理 REST API（令牌鉴权，供 AI / 脚本调用）
│   ├── openapi.js     # /llms.txt、/llms-full.txt、/openapi.json 机读契约
│   └── docs.js        # 在线文档页与 /sdk.js
├── examples/          # 各语言接入示例
├── wrangler.toml      # Worker 配置
└── package.json
```

---

## 安全设计

- 密码用 **PBKDF2-SHA256** 加盐哈希，每个用户独立随机盐，校验为常量时间比较
- 授权码**一次性**且 5 分钟过期，用后即焚，防止重放
- 强制校验 `redirect_uri` 白名单，阻断开放重定向
- `refresh_token` **轮换**：每次刷新旧令牌立即失效
- 全站 Cookie `HttpOnly` + `Secure` + `SameSite=Lax`
- 第三方登录 `state` 参数防 CSRF
- 站内跳转地址过滤 `//evil.com` 这类协议相对 URL
- 登录失败统一错误提示，避免账号枚举

### 上线前建议

1. **改掉默认密钥**：`JWT_SECRET` 换成随机长字符串
   ```bash
   npx wrangler secret put JWT_SECRET
   ```
2. **不要提交 Secret 到公开仓库**：`wrangler.toml` 里目前为开箱即用写了默认值，正式使用前请删除那几行，改用 Secret。
3. **确认 ISSUER 与实际域名一致**：不一致会导致 id_token 校验和自动发现失败。
4. 生产环境可把 `crypto.js` 里的 `PBKDF2_ITERATIONS` 提到 `210000`（OWASP 推荐值），免费版 Workers 因 10ms CPU 限制默认 50000。

---

## 常见问题

**redirect_uri 提示不匹配？**
必须逐字符一致。本地调试写 `http://localhost:3000/callback`，不要混用 `127.0.0.1` 与 `localhost`。

**code 换不到 token？**
code 一次性且 5 分钟有效。检查是否重复提交，或 `redirect_uri` 与授权请求时不一致。

**能用标准库接入吗？**
可以。任何支持 OAuth2 / OIDC 的库（Laravel Socialite、Authlib、Passport、Spring Security、oidc-client-ts 等）填入发现文档地址即可自动完成配置。

**免费版 KV 够用吗？**
免费额度为每日 10 万次读 / 1000 次写，个人与小团队足够。超出可迁移到 D1。

---

## License

MIT
