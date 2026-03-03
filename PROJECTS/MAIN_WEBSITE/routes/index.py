from flask import Flask, render_template, request, redirect, session, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3, os, re, urllib.parse
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from dotenv import load_dotenv
from functools import wraps
import cloudinary
import cloudinary.uploader

# -------------------------------------------------
# APP SETUP - FIRST
# -------------------------------------------------
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "royal-secret-key")

# Cloudinary config
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET")
)

CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"]
    }
})

DB_NAME = "booking.db"


# -------------------------------------------------
# WHATSAPP HELPERS
# -------------------------------------------------
def normalize_phone(number, country="91"):
    if not number:
        return None
    num = re.sub(r"\D", "", str(number))
    if len(num) == 10:
        return country + num
    if len(num) >= 11 and num.startswith(country):
        return num
    return None

ADMIN_WHATSAPP_NUMBER = normalize_phone(
    os.environ.get("ADMIN_WHATSAPP_NUMBER", "918149003738")
)
print(f"✅ WhatsApp: {ADMIN_WHATSAPP_NUMBER}")

def build_whatsapp_link(number, message):
    if not number:
        print("❌ No admin WhatsApp number")
        return None
    encoded = urllib.parse.quote(message, safe="")
    return f"https://wa.me/{number}?text={encoded}"

# -------------------------------------------------
# DATABASE (BULLETPROOF)
# -------------------------------------------------
def get_db():
    # Create folder ONLY if DB is inside a folder
    db_dir = os.path.dirname(DB_NAME)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


_db_initialized = False

def ensure_db_initialized():
    global _db_initialized
    if not _db_initialized:
        init_db()
        _db_initialized = True

def init_db():
    try:
        conn = get_db()
        c = conn.cursor()

        # Admin users table
        c.execute("""
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Bookings table
        c.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            package TEXT NOT NULL,
            date TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Gallery table (NEW - for Cloudinary)
        c.execute("""
        CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url TEXT NOT NULL,
            public_id TEXT NOT NULL,
            caption TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Create default admin if not exists
        admin_exists = c.execute("SELECT 1 FROM admin_users WHERE username=?", ("admin",)).fetchone()
        if not admin_exists:
            c.execute(
                "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
                ("admin", generate_password_hash("admin123"))
            )
            print("✅ Admin created: admin/admin123")

        conn.commit()
        conn.close()
        print("✅ Database fully initialized!")
    except Exception as e:
        print(f"❌ DB init error: {e}")

# -------------------------------------------------
# AUTH
# -------------------------------------------------
def login_required(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect("/admin_login")
        return f(*args, **kwargs)
    return wrap

# -------------------------------------------------
# ROUTES - ALL AFTER APP CREATION
# -------------------------------------------------
@app.route("/")
def home():
    ensure_db_initialized()
    return render_template("index.html")

@app.route("/admin_login", methods=["GET", "POST"])
def admin_login():
    ensure_db_initialized()
    
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        
        if not username or not password:
            return render_template("admin_login.html", error="Username and password required")
        
        conn = get_db()
        user = conn.execute(
            "SELECT * FROM admin_users WHERE username=?", (username,)
        ).fetchone()
        conn.close()

        if user and check_password_hash(user["password_hash"], password):
            session["logged_in"] = True
            print(f"✅ Admin login: {username}")
            return redirect("/dashboard")
        
        return render_template("admin_login.html", error="Invalid username or password")

    return render_template("admin_login.html")

@app.route("/dashboard")
@login_required
def dashboard():
    ensure_db_initialized()
    conn = get_db()
    bookings = conn.execute(
        "SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100"
    ).fetchall()
    conn.close()
    return render_template("dashboard_new.html", bookings=bookings)

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/admin_login")

# Static files
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# -------------------------------------------------
# API ROUTES
# -------------------------------------------------
@app.route("/api/upload", methods=["POST"])
def upload():
    ensure_db_initialized()
    
    if "image" not in request.files:
        return jsonify({"ok": False, "error": "No image"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"ok": False, "error": "Empty filename"}), 400

    try:
        upload_result = cloudinary.uploader.upload(file)
        url = upload_result["secure_url"]
        public_id = upload_result["public_id"]

        conn = get_db()
        c = conn.cursor()
        c.execute(
            "INSERT INTO gallery (image_url, public_id) VALUES (?, ?)",
            (url, public_id)
        )
        conn.commit()
        conn.close()

        print(f"✅ Image uploaded: {public_id}")
        return jsonify({"ok": True, "url": url, "public_id": public_id}), 201
    
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/gallery")
def gallery():
    ensure_db_initialized()
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT image_url, caption FROM gallery ORDER BY id DESC LIMIT 20")
    rows = c.fetchall()
    conn.close()
    return jsonify([
        {"url": row["image_url"], "caption": row["caption"]}
        for row in rows
    ])



@app.route("/api/health")
def health():
    ensure_db_initialized()
    return jsonify({
        "status": "ok", 
        "whatsapp": ADMIN_WHATSAPP_NUMBER,
        "database": DB_NAME,
        "db_ready": _db_initialized
    })

@app.route("/api/book", methods=["POST", "OPTIONS"])
def book():
    if request.method == "OPTIONS":
        return "", 200

    ensure_db_initialized()
    
    try:
        if not request.is_json:
            print("❌ Not JSON request")
            return jsonify({"success": False, "error": "JSON required"}), 400

        data = request.get_json()
        if not data:
            print("❌ Empty JSON body")
            return jsonify({"success": False, "error": "No data"}), 400

        print(f"🔍 Booking data: {data}")

        name = (data.get("name") or "").strip()
        phone = (data.get("phone") or "").strip()
        package = (data.get("package") or "").strip()
        date = (data.get("date") or "").strip()
        details = (data.get("details") or "").strip()

        # Strict validation
        if not name or len(name) < 2:
            return jsonify({"success": False, "error": "Valid name required"}), 400
        if not phone or len(phone) < 8:
            return jsonify({"success": False, "error": "Valid phone required"}), 400
        if not package:
            return jsonify({"success": False, "error": "Package required"}), 400
        if not date:
            return jsonify({"success": False, "error": "Date required"}), 400

        phone_normalized = normalize_phone(phone)
        if not phone_normalized:
            return jsonify({"success": False, "error": "Invalid phone format"}), 400

        # Database operation
        conn = get_db()
        cursor = conn.execute("""
            INSERT INTO bookings (name, phone, package, date, details)
            VALUES (?, ?, ?, ?, ?)
        """, (name, phone_normalized, package, date, details))
        
        booking_id = cursor.lastrowid
        conn.commit()
        conn.close()

        print(f"✅ Booking SAVED: ID={booking_id}")

        # WhatsApp notification
        message = (
            f"🌟 NEW BOOKING #{booking_id} 🌟\n"
            f"👤 {name[:50]}\n"
            f"📱 {phone_normalized}\n"
            f"📦 {package[:30]}\n"
            f"📅 {date}\n"
            f"📝 {details[:100] or 'No details'}"
        )

        wa_link = build_whatsapp_link(ADMIN_WHATSAPP_NUMBER, message)
        if not wa_link:
            wa_link = f"https://wa.me/918149003738?text={urllib.parse.quote(message[:1000])}"

        return jsonify({
            "success": True, 
            "wa_link": wa_link, 
            "booking_id": booking_id,
            "message": "Booking confirmed!"
        }), 200

    except Exception as e:
        print(f"❌ Booking error: {str(e)}")
        import traceback
        print(f"❌ TRACEBACK: {traceback.format_exc()}")
        return jsonify({
            "success": False, 
            "error": "Booking failed", 
            "debug": str(e)[:200]
        }), 500

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)




