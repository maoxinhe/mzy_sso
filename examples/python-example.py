"""
MZY SSO 接入示例 —— Python Flask

安装：
    pip install flask requests

配置（或直接用环境变量）：
    export MZY_CLIENT_ID=mzy_xxxxxxxxxxxx
    export MZY_CLIENT_SECRET=cs_xxxxxxxxxxxx

运行：
    python python-example.py      # http://localhost:5000

注意：回调地址必须注册为 http://localhost:5000/callback
"""

import os
import secrets
import urllib.parse

import requests
from flask import Flask, redirect, request, session, url_for, jsonify

ISSUER = "https://sso.camzy.uno"
CLIENT_ID = os.getenv("MZY_CLIENT_ID", "mzy_xxxxxxxxxxxx")
CLIENT_SECRET = os.getenv("MZY_CLIENT_SECRET", "cs_xxxxxxxxxxxx")
SCOPES = "openid profile email"

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET", secrets.token_hex(32))


@app.route("/")
def index():
    if "user" not in session:
        return '<h1>未登录</h1><p><a href="/login">使用 MZY SSO 登录</a></p>'
    user = session["user"]
    return f"""
    <h1>欢迎，{user.get('name', '')}</h1>
    <p><b>sub</b>（账号关联请用这个）：<code>{user.get('sub')}</code></p>
    <p><b>邮箱</b>：{user.get('email', '未公开')}</p>
    <p><b>登录方式</b>：{', '.join(user.get('providers', []))}</p>
    <p><a href="/logout">退出</a></p>
    """


@app.route("/login")
def login():
    """第一步：生成随机 state，跳转 SSO 授权页"""
    session["oauth_state"] = secrets.token_urlsafe(24)

    params = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "redirect_uri": url_for("callback", _external=True),
        "response_type": "code",
        "scope": SCOPES,
        "state": session["oauth_state"],
    })
    return redirect(f"{ISSUER}/oauth/authorize?{params}")


@app.route("/callback")
def callback():
    """第二步：校验 state，用 code 换 token，再取用户信息"""
    if request.args.get("error"):
        return f"授权被拒绝：{request.args.get('error_description')}", 400

    # 防 CSRF：state 必须完全匹配
    if request.args.get("state") != session.get("oauth_state"):
        return "state 校验失败", 400

    # code → access_token
    token_resp = requests.post(
        f"{ISSUER}/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": request.args.get("code"),
            "redirect_uri": url_for("callback", _external=True),
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
        timeout=20,
    )
    if token_resp.status_code != 200:
        return jsonify(token_resp.json()), 400

    token = token_resp.json()

    # access_token → 用户信息
    user_resp = requests.get(
        f"{ISSUER}/oauth/userinfo",
        headers={"Authorization": f"Bearer {token['access_token']}"},
        timeout=20,
    )

    session["user"] = user_resp.json()
    session["access_token"] = token["access_token"]
    session["refresh_token"] = token.get("refresh_token")
    return redirect(url_for("index"))


@app.route("/refresh")
def refresh():
    """令牌过期时用 refresh_token 续期"""
    resp = requests.post(
        f"{ISSUER}/oauth/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": session.get("refresh_token"),
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
        timeout=20,
    )
    if resp.status_code != 200:
        return redirect(url_for("login"))

    token = resp.json()
    session["access_token"] = token["access_token"]
    session["refresh_token"] = token.get("refresh_token")
    return jsonify({"message": "已续期", "expires_in": token["expires_in"]})


@app.route("/logout")
def logout():
    """退出：撤销 SSO 令牌 + 清空本地会话"""
    if session.get("access_token"):
        requests.post(
            f"{ISSUER}/oauth/revoke",
            data={"token": session["access_token"], "client_id": CLIENT_ID,
                  "client_secret": CLIENT_SECRET},
            timeout=10,
        )
    session.clear()
    return redirect(f"{ISSUER}/logout?post_logout_redirect_uri="
                    f"{urllib.parse.quote(url_for('index', _external=True))}")


if __name__ == "__main__":
    app.run(port=5000, debug=True)
