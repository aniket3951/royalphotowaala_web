from flask import Flask, render_template, redirect, session, request
from functools import wraps
import os

app = Flask(__name__)

# 🔐 SECRET KEY
app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", "royalphotowaala-secret-2025"
)

# 🔐 ADMIN CREDENTIALS
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

# ---------------- LOGIN REQUIRED ----------------
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get("logged_in") != True:
            session.clear()
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated

# ---------------- ROOT ----------------
@app.route("/")
def root():
    session.clear()              # 🔥 FORCE CLEAR on root
    return redirect("/login")

# ---------------- LOGIN ----------------
@app.route("/login", methods=["GET", "POST"])
def login():
    # DO NOT auto redirect from login page
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session.clear()
            session["logged_in"] = True
            return redirect("/dashboard")

        return render_template(
            "index.html",
            error="Invalid username or password"
        )

    return render_template("index.html")

# ---------------- DASHBOARD ----------------
@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard_new.html")

# ---------------- LOGOUT ----------------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

# ---------------- FORCE LOGOUT (DEBUG ONLY) ----------------
@app.route("/force_logout")
def force_logout():
    session.clear()
    return "Session cleared. Open /login now."

if __name__ == "__main__":
    app.run(debug=True)
