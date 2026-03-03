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

// Fix DATABASE_URL for local development
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma with error handling
const prisma = new PrismaClient();

// Test database connection
prisma.$connect()
  .then(() => {
    console.log('✅ Prisma database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Prisma database connection failed:', error);
    console.error('❌ DATABASE_URL:', process.env.DATABASE_URL);
  });

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

// --------------------
// AUTH MIDDLEWARE
// --------------------
const loginRequired = (req, res, next) => {
  if (!req.session.logged_in) {
    return res.status(401).send(`
      <script>
        alert("Please login first");
        window.location.href = "/admin_login";
      </script>
    `);
  }
  next();
};

// --------------------
// ROUTES
// --------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/index.html"));
});

app.get("/admin_login", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/admin_login.html"));
});

app.post("/admin_login", async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).send("Username and password required");
  }

  // Simple admin check (replace with proper auth in production)
  if (username === "admin" && password === "admin123") {
    req.session.logged_in = true;
    res.redirect("/dashboard");
  } else {
    res.send(`
      <script>
        alert("Invalid credentials");
        window.location.href = "/admin_login";
      </script>
    `);
  }
});

app.get("/dashboard", loginRequired, (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/dashboard_new (1).html"));
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
    
    const newImage = await prisma.gallery.create({
      data: {
        image_url: imageUrl,
        public_id: publicId,
        caption: ""
      }
    });
    
    console.log(`✅ Image uploaded locally: ${publicId}`);
    res.json({ ok: true, url: imageUrl, public_id: publicId });
    
  } catch (error) {
    console.error("❌ Upload error:", error);
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

    const updatedAsset = await prisma.siteAsset.upsert({
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

    const newImage = await prisma.homeImage.create({
      data: {
        image_url: imageUrl,
        public_id: publicId,
        caption: caption || "",
        display_order: parseInt(display_order) || 0
      }
    });
    
    console.log(`✅ Home image added: ${publicId}`);
    res.json({ ok: true, url: imageUrl, public_id: publicId, id: newImage.id });
    
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

// Update booking status
app.put("/api/bookings/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status: status }
    });
    
    console.log(`✅ Booking ${id} status updated to ${status}`);
    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("❌ Status update error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Delete booking
app.delete("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const deletedBooking = await prisma.booking.delete({
      where: { id: parseInt(id) }
    });
    
    console.log(`✅ Booking ${id} deleted`);
    res.json({
      success: true,
      message: "Booking deleted successfully",
      booking: deletedBooking
    });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin_login");
});

// Health API
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    whatsapp: process.env.ADMIN_WHATSAPP_NUMBER || "918149003738",
    database: "dev.db",
    db_ready: true,
    uploads_dir: path.join(__dirname, "static", "uploads"),
    uploads_exist: fs.existsSync(path.join(__dirname, "static", "uploads"))
  });
});

// Test bookings endpoint
app.get("/api/test-bookings", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { created_at: 'desc' },
      take: 5
    });
    res.json({ 
      message: "Bookings API working",
      count: bookings.length,
      bookings: bookings 
    });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
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
app.listen(PORT, () => {
  console.log(`🚀 Royal Photowaala server running on port ${PORT}`);
  console.log(`📱 WhatsApp: ${process.env.ADMIN_WHATSAPP_NUMBER || "918149003738"}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
  console.log(`🗄️ Using Prisma database`);
});
