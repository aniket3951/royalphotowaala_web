require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------
// CONFIG
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SECRET_KEY || "royal-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --------------------
// DATABASE
// --------------------
const db = new sqlite3.Database("./booking.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      package TEXT,
      date TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT,
      public_id TEXT,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Default admin
  db.get("SELECT * FROM admin_users WHERE username = ?", ["admin"], async (err, row) => {
    if (!row) {
      const hash = await bcrypt.hash("admin123", 10);
      db.run("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", [
        "admin",
        hash,
      ]);
      console.log("✅ Default admin created (admin/admin123)");
    }
  });
});

// --------------------
// HELPERS
// --------------------
function normalizePhone(number, country = "91") {
  if (!number) return null;
  let num = number.replace(/\D/g, "");
  if (num.length === 10) return country + num;
  if (num.startsWith(country)) return num;
  return null;
}

function buildWhatsAppLink(number, message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

function loginRequired(req, res, next) {
  if (!req.session.logged_in) {
    return res.redirect("/admin_login");
  }
  next();
}

// --------------------
// ROUTES
// --------------------
app.get("/", (req, res) => {
  res.send("Home Page Running");
});

// Admin Login
app.post("/admin_login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM admin_users WHERE username=?", [username], async (err, user) => {
    if (!user) return res.send("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.send("Invalid credentials");

    req.session.logged_in = true;
    res.redirect("/dashboard");
  });
});

app.get("/dashboard", loginRequired, (req, res) => {
  db.all("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100", [], (err, rows) => {
    res.json(rows);
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin_login");
});

// --------------------
// IMAGE UPLOAD
// --------------------
const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false });

  try {
    const result = await cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) return res.status(500).json({ ok: false });

        db.run(
          "INSERT INTO gallery (image_url, public_id) VALUES (?, ?)",
          [result.secure_url, result.public_id]
        );

        res.json({ ok: true, url: result.secure_url });
      }
    );

    result.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// Gallery API
app.get("/api/gallery", (req, res) => {
  db.all("SELECT image_url, caption FROM gallery ORDER BY id DESC LIMIT 20", [], (err, rows) => {
    res.json(rows);
  });
});

// --------------------
// BOOKING API
// --------------------
app.post("/api/book", (req, res) => {
  const { name, phone, package: pkg, date, details } = req.body;

  if (!name || !phone || !pkg || !date)
    return res.status(400).json({ success: false });

  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized)
    return res.status(400).json({ success: false });

  db.run(
    "INSERT INTO bookings (name, phone, package, date, details) VALUES (?, ?, ?, ?, ?)",
    [name, phoneNormalized, pkg, date, details],
    function (err) {
      if (err) return res.status(500).json({ success: false });

      const bookingId = this.lastID;

      const message = `🌟 NEW BOOKING #${bookingId}
👤 ${name}
📱 ${phoneNormalized}
📦 ${pkg}
📅 ${date}
📝 ${details || "No details"}`;

      const waLink = buildWhatsAppLink(
        process.env.ADMIN_WHATSAPP_NUMBER || "918149003738",
        message
      );

      res.json({
        success: true,
        booking_id: bookingId,
        wa_link: waLink,
      });
    }
  );
});

// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
