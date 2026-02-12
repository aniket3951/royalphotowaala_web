require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------
// CONFIG
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ["http://localhost:5000", "http://localhost:5001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', cors());

// Serve static files
app.use("/static", express.static(path.join(__dirname, "static")));
app.use(express.static(path.join(__dirname, "templates")));

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
const db = new sqlite3.Database("./database/booking.db");

// Ensure database directory exists
if (!fs.existsSync("./database")) {
  fs.mkdirSync("./database");
}

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

  db.run(`
    CREATE TABLE IF NOT EXISTS site_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_type TEXT UNIQUE,
      image_url TEXT,
      public_id TEXT,
      alt_text TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS home_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT,
      public_id TEXT,
      caption TEXT,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
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
// Home page - serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/index.html"));
});

// Admin login page
app.get("/admin_login", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/admin_login.html"));
});

// Admin login POST
app.post("/admin_login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM admin_users WHERE username=?", [username], async (err, user) => {
    if (!user) {
      return res.send(`
        <script>
          alert("Invalid credentials");
          window.location.href = "/admin_login";
        </script>
      `);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.send(`
        <script>
          alert("Invalid credentials");
          window.location.href = "/admin_login";
        </script>
      `);
    }

    req.session.logged_in = true;
    res.redirect("/dashboard");
  });
});

// Dashboard page
app.get("/dashboard", loginRequired, (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/dashboard_new (1).html"));
});

// Dashboard API
app.get("/api/bookings", (req, res) => {
  db.all("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ bookings: rows });
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin_login");
});

// Terms and Privacy pages
app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/terms.html"));
});

app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/privacy.html"));
});

// --------------------
// IMAGE UPLOAD
// --------------------
const upload = multer({ 
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, 'static', 'uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
});

app.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No image" });

  try {
    // Use local file storage
    const imageUrl = `/static/uploads/${req.file.filename}`;
    const publicId = req.file.filename;
    
    db.run(
      "INSERT INTO gallery (image_url, public_id) VALUES (?, ?)",
      [imageUrl, publicId],
      function(err) {
        if (err) return res.status(500).json({ ok: false, error: "Database error" });
        
        console.log(`✅ Image uploaded locally: ${publicId}`);
        res.json({ ok: true, url: imageUrl, public_id: publicId });
      }
    );
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

// Gallery API
app.get("/api/gallery", (req, res) => {
  db.all("SELECT id, image_url, public_id, caption FROM gallery ORDER BY id DESC LIMIT 20", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    const images = rows.map(row => ({
      id: row.id,
      url: row.image_url,
      public_id: row.public_id,
      caption: row.caption || ""
    }));
    res.json(images);
  });
});

// Delete gallery image
app.delete("/api/gallery/:public_id", (req, res) => {
  const { public_id } = req.params;
  
  // First get the image info from database
  db.get("SELECT image_url, public_id FROM gallery WHERE public_id = ?", [public_id], (err, row) => {
    if (err) {
      return res.status(500).json({ ok: false, error: "Database error" });
    }
    
    if (!row) {
      return res.status(404).json({ ok: false, error: "Image not found" });
    }
    
    // Delete local file if it exists
    const filePath = path.join(__dirname, row.image_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Local file deleted: ${filePath}`);
    }
    
    // Delete from database
    db.run("DELETE FROM gallery WHERE public_id = ?", [public_id], function(err) {
      if (err) {
        return res.status(500).json({ ok: false, error: "Database error" });
      }
      
      console.log(`✅ Gallery image deleted from database: ${public_id}`);
      res.json({ ok: true });
    });
  });
});

// Site Assets API (Logo, etc.)
app.get("/api/site-assets", (req, res) => {
  db.all("SELECT asset_type, image_url, alt_text FROM site_assets ORDER BY updated_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    const assets = {};
    rows.forEach(row => {
      assets[row.asset_type] = {
        url: row.image_url,
        alt_text: row.alt_text || ""
      };
    });
    res.json(assets);
  });
});

app.post("/api/site-assets", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No image" });
  
  const { asset_type, alt_text } = req.body;
  if (!asset_type) return res.status(400).json({ ok: false, error: "Asset type required" });

  try {
    // Use local file storage
    const imageUrl = `/static/uploads/${req.file.filename}`;
    const publicId = req.file.filename;

    db.run(
      `INSERT OR REPLACE INTO site_assets (asset_type, image_url, public_id, alt_text, updated_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [asset_type, imageUrl, publicId, alt_text || ""],
      function(err) {
        if (err) return res.status(500).json({ ok: false, error: "Database error" });
        
        console.log(`✅ Site asset updated: ${asset_type}`);
        res.json({ ok: true, url: imageUrl, public_id: publicId });
      }
    );
  } catch (err) {
    console.error("❌ Asset upload error:", err);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

// Home Images API
app.get("/api/home-images", (req, res) => {
  db.all("SELECT image_url, caption, display_order FROM home_images WHERE is_active = 1 ORDER BY display_order ASC, id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    const images = rows.map(row => ({
      url: row.image_url,
      caption: row.caption || "",
      order: row.display_order
    }));
    res.json(images);
  });
});

app.post("/api/home-images", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No image" });
  
  const { caption, display_order } = req.body;

  try {
    // Use local file storage
    const imageUrl = `/static/uploads/${req.file.filename}`;
    const publicId = req.file.filename;

    db.run(
      "INSERT INTO home_images (image_url, public_id, caption, display_order) VALUES (?, ?, ?, ?)",
      [imageUrl, publicId, caption || "", display_order || 0],
      function(err) {
        if (err) return res.status(500).json({ ok: false, error: "Database error" });
        
        console.log(`✅ Home image added: ${publicId}`);
        res.json({ ok: true, url: imageUrl, public_id: publicId, id: this.lastID });
      }
    );
  } catch (err) {
    console.error("❌ Home image upload error:", err);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

app.delete("/api/home-images/:id", (req, res) => {
  const { id } = req.params;
  
  db.run("UPDATE home_images SET is_active = 0 WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ ok: false, error: "Database error" });
    }
    
    console.log(`✅ Home image deactivated: ${id}`);
    res.json({ ok: true });
  });
});

// Health API
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    whatsapp: process.env.ADMIN_WHATSAPP_NUMBER || "918149003738",
    database: "./database/booking.db",
    db_ready: true,
    uploads_dir: path.join(__dirname, "static", "uploads"),
    uploads_exist: fs.existsSync(path.join(__dirname, "static", "uploads"))
  });
});

// Test bookings endpoint
app.get("/api/test-bookings", (req, res) => {
  db.all("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ 
      message: "Bookings API working",
      count: rows.length,
      bookings: rows 
    });
  });
});

// --------------------
// BOOKING API
// --------------------
app.post("/api/book", (req, res) => {
  const { name, phone, package: pkg, date, details } = req.body;

  console.log("🔍 Booking data:", req.body);

  // Validation
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: "Valid name required" });
  }
  if (!phone || phone.trim().length < 8) {
    return res.status(400).json({ success: false, error: "Valid phone required" });
  }
  if (!pkg) {
    return res.status(400).json({ success: false, error: "Package required" });
  }
  if (!date) {
    return res.status(400).json({ success: false, error: "Date required" });
  }

  const phoneNormalized = normalizePhone(phone.trim());
  if (!phoneNormalized) {
    return res.status(400).json({ success: false, error: "Invalid phone format" });
  }

  db.run(
    "INSERT INTO bookings (name, phone, package, date, details) VALUES (?, ?, ?, ?, ?)",
    [name.trim(), phoneNormalized, pkg, date, details || ""],
    function (err) {
      if (err) {
        console.error("❌ Booking error:", err);
        return res.status(500).json({ success: false, error: "Booking failed" });
      }

      const bookingId = this.lastID;
      console.log(`✅ Booking SAVED: ID=${bookingId}`);

      const message = `🌟 NEW BOOKING #${bookingId} 🌟
👤 ${name.trim()}
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
        message: "Booking confirmed!"
      });
    }
  );
});

// --------------------
// START SERVER
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Royal Photowaala server running on port ${PORT}`);
  console.log(`📱 WhatsApp: ${process.env.ADMIN_WHATSAPP_NUMBER || "918149003738"}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});
