/**
 * 密码学工具：随机数、密码哈希、HMAC、JWT、PKCE
 * 全部基于 Web Crypto API（Cloudflare Workers 原生支持，无需第三方依赖）
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ---------------- Base64url 编解码 ---------------- */

export function b64urlEncode(input) {
  let bin;
  if (typeof input === 'string') bin = enc.encode(input);
  else bin = new Uint8Array(input);
  let s = '';
  for (let i = 0; i < bin.length; i++) s += String.fromCharCode(bin[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64urlDecodeStr(str) {
  return dec.decode(b64urlDecode(str));
}

/* ---------------- 随机数 / 随机串 ---------------- */

function randomBytes(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

/** 生成 URL 安全的随机令牌，默认 32 字节 → 43 字符 */
export function randomToken(bytes = 32) {
  return b64urlEncode(randomBytes(bytes));
}

/** 生成带前缀的 ID，如 uid_xxxx / mzy_xxxx */
export function randomId(prefix, bytes = 16) {
  return `${prefix}_${b64urlEncode(randomBytes(bytes)).toLowerCase()}`;
}

/* ---------------- 密码哈希：PBKDF2-SHA256 ---------------- */

// Workers 免费版 CPU 上限约 10ms，迭代数需要在安全与性能之间权衡。
// 10 万次迭代在本环境实测约 20-40ms 会超限，这里默认 5 万次（约 10-20ms）。
// 若你的账户是付费版，建议把 ITERATIONS 提到 210000（OWASP 推荐值）。
const PBKDF2_ITERATIONS = 50000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/**
 * 生成密码哈希，格式：pbkdf2$<迭代数>$<salt>$<hash>
 */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BYTES * 8
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64urlEncode(salt)}$${b64urlEncode(bits)}`;
}

/**
 * 校验密码，兼容存储格式中记录的迭代数（便于平滑升级）
 */
export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = parseInt(parts[1], 10);
  if (!iterations || iterations < 1000) return false;
  const salt = b64urlDecode(parts[2]);
  const expected = b64urlEncode(new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']),
    256
  )));
  return timingSafeEqual(expected, parts[3]);
}

/** 常量时间字符串比较，防止时序侧信道 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------------- HMAC-SHA256 ---------------- */

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']
  );
}

export async function hmacSHA256(secret, data) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data));
  return b64urlEncode(sig);
}

/* ---------------- JWT（HS256） ---------------- */

/**
 * 签发 JWT
 * @param {object} payload 载荷
 * @param {string} secret 密钥
 * @param {number} ttlSeconds 有效期（秒）
 */
export async function signJWT(payload, secret, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64urlEncode(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + ttlSeconds
  }));
  const signingInput = `${header}.${body}`;
  const sig = await hmacSHA256(secret, signingInput);
  return `${signingInput}.${sig}`;
}

/**
 * 校验并解析 JWT，失败返回 null
 */
export async function verifyJWT(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;

  try {
    const expectSig = await hmacSHA256(secret, `${header}.${body}`);
    if (!timingSafeEqual(expectSig, sig)) return null;

    const claims = JSON.parse(b64urlDecodeStr(body));
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === 'number' && claims.exp < now) return null;
    return claims;
  } catch {
    return null;
  }
}

/* ---------------- PKCE ---------------- */

/** 生成 S256 的 code_challenge */
export async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(verifier));
  return b64urlEncode(digest);
}

/** 校验 PKCE verifier 与 challenge 是否匹配 */
export async function verifyCodeChallenge(verifier, challenge, method = 'S256') {
  if (!verifier || !challenge) return false;
  if (method === 'plain') return timingSafeEqual(verifier, challenge);
  const computed = await generateCodeChallenge(verifier);
  return timingSafeEqual(computed, challenge);
}

/* ---------------- 杂项哈希 ---------------- */

export async function sha256hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
