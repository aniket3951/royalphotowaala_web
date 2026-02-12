require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma
const prisma = new PrismaClient();

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
// DATABASE (Prisma)
// --------------------
// Database is handled by Prisma client

// Create default admin user (for demo purposes)
async function createDefaultAdmin() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { username: 'admin' }
    });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          password_hash: hashedPassword
        }
      });
      console.log("✅ Default admin created (admin/admin123)");
    }
  } catch (error) {
    console.log("⚠️ Admin creation skipped (user table may not exist)");
  }
}

// Initialize database
createDefaultAdmin();

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
app.get("/api/bookings", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { created_at: 'desc' },
      take: 100
    });
    res.json({ bookings });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
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
app.get("/api/gallery", async (req, res) => {
  try {
    const images = await prisma.gallery.findMany({
      orderBy: { created_at: 'desc' },
      take: 20
    });
    
    const formattedImages = images.map(img => ({
      id: img.id,
      url: img.image_url,
      public_id: img.public_id,
      caption: img.caption || ""
    }));
    
    res.json(formattedImages);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete gallery image
app.delete("/api/gallery/:public_id", async (req, res) => {
  const { public_id } = req.params;
  
  try {
    // First get the image info
    const image = await prisma.gallery.findUnique({
      where: { public_id }
    });
    
    if (!image) {
      return res.status(404).json({ ok: false, error: "Image not found" });
    }
    
    // Delete local file if it exists
    const filePath = path.join(__dirname, image.image_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Local file deleted: ${filePath}`);
    }
    
    // Delete from database
    await prisma.gallery.delete({
      where: { public_id }
    });
    
    console.log(`✅ Gallery image deleted: ${public_id}`);
    res.json({ ok: true });
    
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ ok: false, error: "Failed to delete image" });
  }
});

// Site Assets API (Logo, etc.)
app.get("/api/site-assets", async (req, res) => {
  try {
    const assets = await prisma.siteAsset.findMany({
      orderBy: { updated_at: 'desc' }
    });
    
    const formattedAssets = {};
    assets.forEach(asset => {
      formattedAssets[asset.asset_type] = {
        url: asset.image_url,
        alt_text: asset.alt_text
      };
    });
    
    res.json(formattedAssets);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/site-assets", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No image" });
  
  const { asset_type, alt_text } = req.body;
  if (!asset_type) return res.status(400).json({ ok: false, error: "Asset type required" });

  try {
    // Use local file storage
    const imageUrl = `/static/uploads/${req.file.filename}`;
    const publicId = req.file.filename;

    await prisma.siteAsset.upsert({
      where: { asset_type },
      update: {
        image_url: imageUrl,
        public_id: publicId,
        alt_text: alt_text || "",
        updated_at: new Date()
      },
      create: {
        asset_type,
        image_url: imageUrl,
        public_id: publicId,
        alt_text: alt_text || ""
      }
    });
    
    console.log(`✅ Site asset updated: ${asset_type}`);
    res.json({ ok: true, url: imageUrl, public_id: publicId });
    
  } catch (error) {
    console.error("❌ Asset upload error:", error);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

// Home Images API
app.get("/api/home-images", async (req, res) => {
  try {
    const images = await prisma.homeImage.findMany({
      where: { is_active: true },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }]
    });
    
    const formattedImages = images.map(img => ({
      id: img.id,
      url: img.image_url,
      caption: img.caption || "",
      display_order: img.display_order
    }));
    
    res.json(formattedImages);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/home-images", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No image" });
  
  const { caption, display_order } = req.body;

  try {
    // Use local file storage
    const imageUrl = `/static/uploads/${req.file.filename}`;
    const publicId = req.file.filename;

    await prisma.homeImage.create({
      data: {
        image_url: imageUrl,
        public_id: publicId,
        caption: caption || "",
        display_order: parseInt(display_order) || 0
      }
    });
    
    console.log(`✅ Home image added: ${publicId}`);
    res.json({ ok: true, url: imageUrl, public_id: publicId, id: this.lastID });
    
  } catch (error) {
    console.error("❌ Home image upload error:", error);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

app.delete("/api/home-images/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.homeImage.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });
    
    res.json({ ok: true });
  } catch (error) {
    console.error("❌ Delete home image error:", error);
    res.status(500).json({ ok: false, error: "Failed to delete image" });
  }
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
app.post("/api/book", async (req, res) => {
  const { name, phone, package: pkg, date, details } = req.body;

  console.log("🔍 Booking data:", req.body);

  // Validation
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: "Valid name required" });
  }
  if (!phone || phone.trim().length < 8) {
    return res.status(400).json({ success: false, error: "Valid phone required" });
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        package: pkg.trim(),
        date: date.trim(),
        details: details?.trim() || "",
        status: "pending"
      }
    });

    console.log(`✅ New booking: ${name} (${phone})`);
    
    // WhatsApp integration
    const message = `🎉 NEW BOOKING ALERT!\n\n👤 Name: ${name}\n📱 Phone: ${phone}\n📦 Package: ${pkg}\n📅 Date: ${date}\n💬 Details: ${details || "N/A"}\n\n📸 Royal Photowaala`;
    
    const waUrl = `https://wa.me/${process.env.ADMIN_WHATSAPP_NUMBER || "918149003738"}?text=${encodeURIComponent(message)}`;
    
    res.json({ 
      success: true, 
      message: "Booking submitted successfully!",
      booking: booking,
      wa_link: waUrl
    });
    
  } catch (error) {
    console.error("❌ Booking error:", error);
    res.status(500).json({ 
      error: "Failed to create booking" 
    });
  }
});

// --------------------
// START SERVER
// --------------------
async function startServer() {
  try {
    // Initialize database
    await createDefaultAdmin();
    
    app.listen(PORT, () => {
      console.log(`🚀 Royal Photowaala server running on port ${PORT}`);
      console.log(`📱 WhatsApp: ${process.env.ADMIN_WHATSAPP_NUMBER || "918149003738"}`);
      console.log(`🌐 Visit: http://localhost:${PORT}`);
      console.log(`🗄️ Using Prisma database`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
