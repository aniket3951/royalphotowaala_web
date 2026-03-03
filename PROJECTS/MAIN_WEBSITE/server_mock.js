require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

// DATABASE_URL for local development
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Serve static files
app.use("/static", express.static(path.join(__dirname, "static")));
app.use(express.static(path.join(__dirname, "templates")));

// Mock data for testing
const mockData = {
  bookings: [
    {
      id: 1,
      name: "John Doe",
      phone: "+1234567890",
      package: "Premium Package",
      date: "2024-02-24",
      status: "pending",
      details: "Wedding photography package"
    },
    {
      id: 2,
      name: "Jane Smith",
      phone: "+0987654321",
      package: "Basic Package",
      date: "2024-02-25",
      status: "confirmed",
      details: "Birthday party photography"
    }
  ],
  gallery: [
    {
      id: 1,
      public_id: "gallery_1",
      image_url: "https://via.placeholder.com/300x200/667eea/ffffff?text=Gallery+1",
      caption: "Beautiful wedding photo"
    },
    {
      id: 2,
      public_id: "gallery_2",
      image_url: "https://via.placeholder.com/300x200/764ba2/ffffff?text=Gallery+2",
      caption: "Birthday celebration"
    }
  ],
  siteAssets: [
    {
      id: 1,
      asset_type: "logo",
      image_url: "https://via.placeholder.com/150x50/667eea/ffffff?text=LOGO",
      alt_text: "Royal Photowaala Logo"
    }
  ],
  homeImages: [
    {
      id: 1,
      image_url: "https://via.placeholder.com/400x300/667eea/ffffff?text=Home+1",
      caption: "Welcome to Royal Photowaala",
      display_order: 0
    },
    {
      id: 2,
      image_url: "https://via.placeholder.com/400x300/764ba2/ffffff?text=Home+2",
      caption: "Professional photography services",
      display_order: 1
    }
  ]
};

// API Routes
app.get("/api/bookings", (req, res) => {
  console.log('📅 Bookings API called');
  res.json(mockData.bookings);
});

app.get("/api/gallery", (req, res) => {
  console.log('🖼️ Gallery API called');
  res.json(mockData.gallery);
});

app.get("/api/site-assets", (req, res) => {
  console.log('🎨 Site Assets API called');
  res.json(mockData.siteAssets);
});

app.get("/api/home-images", (req, res) => {
  console.log('🏠 Home Images API called');
  res.json(mockData.homeImages);
});

// Upload endpoints (mock for now)
app.post("/api/upload", (req, res) => {
  console.log('📤 Upload API called');
  res.json({ ok: true, message: "Upload successful (mock)" });
});

app.post("/api/site-assets", (req, res) => {
  console.log('📤 Site Assets Upload API called');
  res.json({ ok: true, message: "Logo upload successful (mock)" });
});

app.post("/api/home-images", (req, res) => {
  console.log('📤 Home Images Upload API called');
  res.json({ ok: true, message: "Home image upload successful (mock)" });
});

// Delete endpoints (mock for now)
app.delete("/api/gallery/:publicId", (req, res) => {
  console.log('🗑️ Delete Gallery API called:', req.params.publicId);
  res.json({ ok: true, message: "Gallery image deleted (mock)" });
});

app.delete("/api/site-assets/:id", (req, res) => {
  console.log('🗑️ Delete Site Asset API called:', req.params.id);
  res.json({ ok: true, message: "Site asset deleted (mock)" });
});

app.delete("/api/home-images/:id", (req, res) => {
  console.log('🗑️ Delete Home Image API called:', req.params.id);
  res.json({ ok: true, message: "Home image deleted (mock)" });
});

// Main route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock API server running on port ${PORT}`);
  console.log(`🌐 Website: http://localhost:${PORT}`);
  console.log(`✅ All API endpoints working with mock data`);
});
