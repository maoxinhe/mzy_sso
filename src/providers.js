/**
 * 第三方登录适配器
 *
 * QQ    —— 走「小白菜聚合登录」（https://u.0mz.cn），彩虹系协议：
 *          act=login  取跳转地址 → 用户授权 → 回调带 code → act=callback 换用户信息
 * GitHub —— 标准 OAuth 2.0：
 *          /login/oauth/authorize → 回调带 code → /login/oauth/access_token → /user
 */

import { randomToken } from './crypto.js';

/* =========================================================
 *  QQ（小白菜聚合登录）
 * ========================================================= */

export async function qqLoginUrl(env, redirectUri, state) {
  const url = new URL(`${env.QQ_API}/connect.php`);
  url.searchParams.set('act', 'login');
  url.searchParams.set('appid', env.QQ_APPID);
  url.searchParams.set('appkey', env.QQ_APPKEY);
  url.searchParams.set('type', 'qq');
  url.searchParams.set('redirect_uri', redirectUri);
  // 部分聚合登录实现会把 state 原样透传，这里带上便于防 CSRF
  if (state) url.searchParams.set('state', state);

  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'MZY-SSO/1.0' } });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    throw new Error(`QQ 登录接口不可达（HTTP ${res.status}）`);
  }
  if (data.code !== 0 || !data.url) {
    throw new Error(data.msg || '获取 QQ 登录地址失败，请检查 APPID / APPKEY 是否正确');
  }
  return data.url;
}

/**
 * 用回调里的 code 换取 QQ 用户信息
 * @returns {{id:string,nickname:string,avatar:string,gender:string,location:string,raw:object}}
 */
export async function qqCallback(env, code) {
  const url = new URL(`${env.QQ_API}/connect.php`);
  url.searchParams.set('act', 'callback');
  url.searchParams.set('appid', env.QQ_APPID);
  url.searchParams.set('appkey', env.QQ_APPKEY);
  url.searchParams.set('type', 'qq');
  url.searchParams.set('code', code);

  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'MZY-SSO/1.0' } });
  const data = await res.json().catch(() => null);

  if (!data) throw new Error('QQ 登录回调解析失败');
  if (data.code !== 0) throw new Error(data.msg || 'QQ 登录失败，授权可能已过期，请重试');
  if (!data.social_uid) throw new Error('未能获取 QQ 用户标识');

  return {
    id: String(data.social_uid),
    nickname: data.nickname || `QQ用户${String(data.social_uid).slice(0, 6)}`,
    avatar: data.faceimg || `https://q1.qlogo.cn/g?b=qq&nk=${data.social_uid}&s=100`,
    gender: data.gender || null,
    location: data.location || null,
    access_token: data.access_token || null,
    raw: data
  };
}

/* =========================================================
 *  GitHub
 * ========================================================= */

export function githubLoginUrl(env, redirectUri, state) {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'true');
  return url.toString();
}

export async function githubCallback(env, code) {
  // 1) code 换 access_token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'MZY-SSO/1.0'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenData || tokenData.error) {
    throw new Error(tokenData?.error_description || 'GitHub 换取 access_token 失败');
  }
  const ghToken = tokenData.access_token;
  if (!ghToken) throw new Error('GitHub 未返回 access_token');

  // 2) 拉取用户资料
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'MZY-SSO/1.0'
    }
  });
  if (!userRes.ok) throw new Error(`GitHub 获取用户信息失败（HTTP ${userRes.status}）`);
  const u = await userRes.json();

  // 3) 拉取主邮箱（可能失败，失败不阻塞）
  let email = u.email || null;
  let emailVerified = false;
  try {
    const mailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'MZY-SSO/1.0'
      }
    });
    if (mailRes.ok) {
      const mails = await mailRes.json();
      const primary = Array.isArray(mails) && (mails.find(m => m.primary && m.verified) || mails.find(m => m.verified));
      if (primary) {
        email = primary.email;
        emailVerified = !!primary.verified;
      }
    }
  } catch { /* 邮箱非必需，忽略 */ }

  return {
    id: String(u.id),
    login: u.login,
    nickname: u.name || u.login,
    avatar: u.avatar_url || `https://avatars.githubusercontent.com/u/${u.id}?v=4`,
    email,
    email_verified: emailVerified,
    bio: u.bio || '',
    location: u.location || null,
    access_token: ghToken,
    raw: u
  };
}

/* =========================================================
 *  统一入口
 * ========================================================= */

export const PROVIDERS = {
  qq: {
    name: 'QQ',
    label: 'QQ 账号登录',
    getLoginUrl: qqLoginUrl,
    handleCallback: qqCallback
  },
  github: {
    name: 'GitHub',
    label: 'GitHub 登录',
    getLoginUrl: githubLoginUrl,
    handleCallback: githubCallback
  }
};

export function newState() {
  return randomToken(24);
}
