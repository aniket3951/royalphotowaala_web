require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ["http://localhost:5000", "http://localhost:5001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Serve static files
app.use("/static", express.static(path.join(__dirname, "static")));
app.use(express.static(path.join(__dirname, "templates")));

// API Routes
app.get("/api/bookings", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.get("/api/gallery", async (req, res) => {
  try {
    const gallery = await prisma.gallery.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(gallery);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

app.get("/api/site-assets", async (req, res) => {
  try {
    const assets = await prisma.siteAsset.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(assets);
  } catch (error) {
    console.error('Error fetching site assets:', error);
    res.status(500).json({ error: "Failed to fetch site assets" });
  }
});

app.get("/api/home-images", async (req, res) => {
  try {
    const homeImages = await prisma.homeImage.findMany({
      orderBy: { display_order: 'asc' }
    });
    res.json(homeImages);
  } catch (error) {
    console.error('Error fetching home images:', error);
    res.status(500).json({ error: "Failed to fetch home images" });
  }
});

// Main route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Main website server running on port ${PORT}`);
  console.log(`🌐 Website: http://localhost:${PORT}`);
  console.log(`🗄️ Using Prisma database`);
});
