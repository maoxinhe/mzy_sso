/**
 * MZY SSO 接入示例 —— Node.js Express
 *
 * 安装：
 *   npm init -y && npm i express express-session
 *
 * 配置：
 *   export MZY_CLIENT_ID=mzy_xxxxxxxxxxxx
 *   export MZY_CLIENT_SECRET=cs_xxxxxxxxxxxx
 *
 * 运行：
 *   node node-example.js      # http://localhost:3000
 *
 * 注意：回调地址必须注册为 http://localhost:3000/callback
 */

const express = require('express');
const session = require('express-session');

const ISSUER = 'https://sso.camzy.uno';
const CLIENT_ID = process.env.MZY_CLIENT_ID || 'mzy_xxxxxxxxxxxx';
const CLIENT_SECRET = process.env.MZY_CLIENT_SECRET || 'cs_xxxxxxxxxxxx';
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = 'openid profile email';

const app = express();
app.use(session({
  secret: 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

/** 第一步：跳转 SSO 登录 */
app.get('/login', (req, res) => {
  req.session.state = require('crypto').randomUUID();

  const u = new URL(ISSUER + '/oauth/authorize');
  u.searchParams.set('client_id', CLIENT_ID);
  u.searchParams.set('redirect_uri', REDIRECT_URI);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES);
  u.searchParams.set('state', req.session.state);

  res.redirect(u.toString());
});

/** 第二步：处理回调 */
app.get('/callback', async (req, res) => {
  const { code, state, error, error_description: desc } = req.query;

  if (error) return res.status(400).send(`授权失败：${desc || error}`);

  // 防 CSRF
  if (!state || state !== req.session.state) {
    return res.status(400).send('state 校验失败');
  }

  try {
    // code → token
    const tokenRes = await fetch(ISSUER + '/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    const token = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(400).json(token);
    }

    // token → 用户信息
    const userRes = await fetch(ISSUER + '/oauth/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const user = await userRes.json();

    req.session.user = user;
    req.session.tokens = token;
    res.redirect('/');
  } catch (e) {
    res.status(500).send('登录失败：' + e.message);
  }
});

/** 首页 */
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.send('<h1>未登录</h1><p><a href="/login">使用 MZY SSO 登录</a></p>');
  }
  const u = req.session.user;
  res.send(`
    <h1>欢迎，${u.name}</h1>
    <p><b>sub</b>（账号关联请用这个）：<code>${u.sub}</code></p>
    <p><b>邮箱</b>：${u.email || '未公开'}</p>
    <p><b>登录方式</b>：${(u.providers || []).join('、')}</p>
    <p><a href="/logout">退出</a></p>
  `);
});

/** 退出：撤销令牌 + 跳转 SSO 全局登出 */
app.get('/logout', async (req, res) => {
  const at = req.session.tokens?.access_token;
  if (at) {
    await fetch(ISSUER + '/oauth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: at, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    }).catch(() => {});
  }
  req.session.destroy(() => {
    res.redirect(`${ISSUER}/logout?post_logout_redirect_uri=${encodeURIComponent('http://localhost:3000')}`);
  });
});

app.listen(3000, () => console.log('http://localhost:3000'));
