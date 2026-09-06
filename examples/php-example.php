<?php
/**
 * MZY SSO 接入示例 —— PHP 原生（无框架，可直接运行）
 *
 * 用法：
 *   1. 把下面的 CLIENT_ID / CLIENT_SECRET 换成你在 https://sso.camzy.uno/admin 创建的值
 *   2. 回调地址必须与注册时填写的完全一致，本例为 http://localhost:8000/index.php
 *   3. php -S localhost:8000
 */

session_start();

const ISSUER  = 'https://sso.camzy.uno';
const CLIENT_ID     = 'mzy_xxxxxxxxxxxx';
const CLIENT_SECRET = 'cs_xxxxxxxxxxxx';
const REDIRECT_URI  = 'http://localhost:8000/index.php';

/** 第一步：没有 code 就跳去 SSO 登录 */
function redirectToLogin(): void
{
    $_SESSION['oauth_state'] = bin2hex(random_bytes(16));
    $params = http_build_query([
        'client_id'     => CLIENT_ID,
        'redirect_uri'  => REDIRECT_URI,
        'response_type' => 'code',
        'scope'         => 'openid profile email',
        'state'         => $_SESSION['oauth_state'],
    ]);
    header('Location: ' . ISSUER . '/oauth/authorize?' . $params);
    exit;
}

/** 第二步：用 code 换 access_token */
function exchangeCode(string $code): array
{
    $ch = curl_init(ISSUER . '/oauth/token');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_POSTFIELDS     => http_build_query([
            'grant_type'    => 'authorization_code',
            'code'          => $code,
            'redirect_uri'  => REDIRECT_URI,
            'client_id'     => CLIENT_ID,
            'client_secret' => CLIENT_SECRET,
        ]),
    ]);
    $res = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($res, true);
    if ($http !== 200 || empty($data['access_token'])) {
        throw new RuntimeException('换取令牌失败：' . ($data['error_description'] ?? $res));
    }
    return $data;
}

/** 第三步：读取用户信息 */
function fetchUser(string $accessToken): array
{
    $ch = curl_init(ISSUER . '/oauth/userinfo');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $accessToken],
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true);
}

/* ---------------- 路由 ---------------- */

// 退出
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ' . ISSUER . '/logout?post_logout_redirect_uri=' . urlencode(REDIRECT_URI));
    exit;
}

// 回调：带 code 回来
if (isset($_GET['code'])) {
    // 务必校验 state，防 CSRF
    if (empty($_GET['state']) || !hash_equals($_SESSION['oauth_state'] ?? '', $_GET['state'])) {
        exit('state 校验失败，可能是 CSRF 攻击');
    }

    try {
        $token = exchangeCode($_GET['code']);
    } catch (RuntimeException $e) {
        exit('登录失败：' . htmlspecialchars($e->getMessage()));
    }

    $_SESSION['access_token']  = $token['access_token'];
    $_SESSION['refresh_token'] = $token['refresh_token'] ?? null;
    $_SESSION['user']          = fetchUser($token['access_token']);

    header('Location: ' . REDIRECT_URI);
    exit;
}

// 未登录
if (empty($_SESSION['user'])) {
    redirectToLogin();
}

$user = $_SESSION['user'];

?><!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>PHP 接入示例 · MZY SSO</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;
       max-width:560px;margin:60px auto;padding:0 20px;color:#111827;line-height:1.7}
  code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px}
  .card{border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px}
  img{border-radius:50%;vertical-align:middle;margin-right:10px}
  a{color:#4f46e5}
</style>
</head>
<body>

<h1>登录成功</h1>

<div class="card">
  <h3 style="margin-top:0">
    <img src="<?= htmlspecialchars($user['picture'] ?? '') ?>" width="40" height="40" alt="">
    <?= htmlspecialchars($user['name'] ?? '') ?>
  </h3>
  <p><b>sub（请用它做账号关联）</b>：<code><?= htmlspecialchars($user['sub']) ?></code></p>
  <p><b>邮箱</b>：<?= htmlspecialchars($user['email'] ?? '未公开') ?></p>
  <p><b>已绑定的登录方式</b>：<?= htmlspecialchars(implode('、', $user['providers'] ?? [])) ?></p>
  <p><b>用户组</b>：<?= htmlspecialchars(implode('、', $user['groups'] ?? [])) ?></p>
</div>

<p><a href="?logout=1">退出登录</a></p>

</body>
</html>
