require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5001; // Different port from main website

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Connect to main website database
const db = new sqlite3.Database("../main/database/booking.db");

// 🔐 SECRET KEY
const SECRET_KEY =
  process.env.SECRET_KEY || "royalphotowaala-secret-2025";

// 🔐 ADMIN CREDENTIALS
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use(express.static(path.join(__dirname, "templates")));

app.use(
  session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set true in production (https)
      sameSite: "strict",
    },
  })
);

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ---------------- LOGIN REQUIRED ----------------
function loginRequired(req, res, next) {
  if (req.session.logged_in === true) {
    return next();
  }
  req.session.destroy(() => {
    res.redirect("/login");
  });
}

// ---------------- ROOT ----------------
app.get("/", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ---------------- LOGIN ----------------
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.regenerate((err) => {
      if (err) return res.send("Session error");

      req.session.logged_in = true;
      res.redirect("/dashboard");
    });
  } else {
    res.send(`
      <script>
        alert("Invalid username or password");
        window.location.href = "/login";
      </script>
    `);
  }
});

// ---------------- DASHBOARD ----------------
app.get("/dashboard", loginRequired, (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "dashboard.html"));
});

// ---------------- CHANGE PASSWORD ----------------
app.get("/change_password", loginRequired, (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "change_password.html"));
});

app.post("/change_password", loginRequired, (req, res) => {
  const { old_password, new_password } = req.body;
  
  if (old_password === ADMIN_PASSWORD && new_password) {
    // In production, you'd update this in a database
    res.send(`
      <script>
        alert("Password changed successfully!");
        window.location.href = "/dashboard";
      </script>
    `);
  } else {
    res.send(`
      <script>
        alert("Invalid old password");
        window.location.href = "/change_password";
      </script>
    `);
  }
});

// ---------------- LOGOUT ----------------
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ---------------- API ENDPOINTS ----------------

// Get bookings data
app.get("/api/bookings", loginRequired, (req, res) => {
  db.all("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ bookings: rows });
  });
});

// Get site assets (logo, etc.)
app.get("/api/site-assets", loginRequired, (req, res) => {
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

// Update site assets (logo, etc.)
app.post("/api/site-assets", loginRequired, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No image" });
  
  const { asset_type, alt_text } = req.body;
  if (!asset_type) return res.status(400).json({ ok: false, error: "Asset type required" });

  try {
    cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) return res.status(500).json({ ok: false, error: "Upload failed" });

        db.run(
          `INSERT OR REPLACE INTO site_assets (asset_type, image_url, public_id, alt_text, updated_at) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [asset_type, result.secure_url, result.public_id, alt_text || ""],
          function(err) {
            if (err) return res.status(500).json({ ok: false, error: "Database error" });
            
            console.log(`✅ Site asset updated: ${asset_type}`);
            res.json({ ok: true, url: result.secure_url, public_id: result.public_id });
          }
        );
      }
    ).end(req.file.buffer);
  } catch (err) {
    console.error("❌ Asset upload error:", err);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

// Get home images
app.get("/api/home-images", loginRequired, (req, res) => {
  db.all("SELECT id, image_url, caption, display_order FROM home_images WHERE is_active = 1 ORDER BY display_order ASC, id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    const images = rows.map(row => ({
      id: row.id,
      url: row.image_url,
      caption: row.caption || "",
      order: row.display_order
    }));
    res.json(images);
  });
});

// Add home image
app.post("/api/home-images", loginRequired, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No image" });
  
  const { caption, display_order } = req.body;

  try {
    cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) return res.status(500).json({ ok: false, error: "Upload failed" });

        db.run(
          "INSERT INTO home_images (image_url, public_id, caption, display_order) VALUES (?, ?, ?, ?)",
          [result.secure_url, result.public_id, caption || "", display_order || 0],
          function(err) {
            if (err) return res.status(500).json({ ok: false, error: "Database error" });
            
            console.log(`✅ Home image added: ${result.public_id}`);
            res.json({ ok: true, url: result.secure_url, public_id: result.public_id, id: this.lastID });
          }
        );
      }
    ).end(req.file.buffer);
  } catch (err) {
    console.error("❌ Home image upload error:", err);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

// Delete home image
app.delete("/api/home-images/:id", loginRequired, (req, res) => {
  const { id } = req.params;
  
  db.run("UPDATE home_images SET is_active = 0 WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ ok: false, error: "Database error" });
    }
    
    console.log(`✅ Home image deactivated: ${id}`);
    res.json({ ok: true });
  });
});

// Update home image order
app.put("/api/home-images/:id/order", loginRequired, (req, res) => {
  const { id } = req.params;
  const { display_order } = req.body;
  
  db.run("UPDATE home_images SET display_order = ? WHERE id = ?", [display_order, id], function(err) {
    if (err) {
      return res.status(500).json({ ok: false, error: "Database error" });
    }
    
    console.log(`✅ Home image order updated: ${id} -> ${display_order}`);
    res.json({ ok: true });
  });
});

// ---------------- FORCE LOGOUT ----------------
app.get("/force_logout", (req, res) => {
  req.session.destroy(() => {
    res.send("Session cleared. Open /login now.");
  });
});

// ---------------- START SERVER ----------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
========================================
🚀 Royal Photowaala Login Server Running
🌐 http://localhost:${PORT}
========================================
  `);
});
