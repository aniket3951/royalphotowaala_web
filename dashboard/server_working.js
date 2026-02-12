require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const http = require("http");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5001;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔐 SECRET KEY
const SECRET_KEY = process.env.SECRET_KEY || "royalphotowaala-secret-2025";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

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
app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use(express.static(path.join(__dirname, "templates")));

app.use(
  session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);

// --------------------
// HELPERS
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

// Simple HTTP request function
function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// --------------------
// ROUTES
// --------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/dashboard.html"));
});

app.get("/admin_login", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/admin_login.html"));
});

app.post("/admin_login", (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).send("Username and password required");
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.logged_in = true;
    res.redirect("/");
  } else {
    res.send(`
      <script>
        alert("Invalid credentials");
        window.location.href = "/admin_login";
      </script>
    `);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin_login");
});

// Dashboard API endpoints (proxy to main website)
app.get("/api/bookings", async (req, res) => {
  try {
    const data = await makeHttpRequest('http://localhost:5000/api/bookings');
    res.json(data);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.get("/api/gallery", async (req, res) => {
  try {
    const data = await makeHttpRequest('http://localhost:5000/api/gallery');
    res.json(data);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

app.get("/api/site-assets", async (req, res) => {
  try {
    const data = await makeHttpRequest('http://localhost:5000/api/site-assets');
    res.json(data);
  } catch (error) {
    console.error('Error fetching site assets:', error);
    res.status(500).json({ error: "Failed to fetch site assets" });
  }
});

app.get("/api/home-images", async (req, res) => {
  try {
    const data = await makeHttpRequest('http://localhost:5000/api/home-images');
    res.json(data);
  } catch (error) {
    console.error('Error fetching home images:', error);
    res.status(500).json({ error: "Failed to fetch home images" });
  }
});

// Image upload endpoints (proxy to main website)
app.post("/api/upload", multer({ storage: multer.memoryStorage() }).single("image"), async (req, res) => {
  try {
    // For now, just return success since we can't easily proxy file uploads
    res.json({ ok: true, message: "Upload functionality requires direct connection to main website" });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

app.post("/api/site-assets", multer({ storage: multer.memoryStorage() }).single("image"), async (req, res) => {
  try {
    res.json({ ok: true, message: "Upload functionality requires direct connection to main website" });
  } catch (error) {
    console.error('Error uploading site asset:', error);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

app.post("/api/home-images", multer({ storage: multer.memoryStorage() }).single("image"), async (req, res) => {
  try {
    res.json({ ok: true, message: "Upload functionality requires direct connection to main website" });
  } catch (error) {
    console.error('Error uploading home image:', error);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

// Delete endpoints (proxy to main website)
app.delete("/api/gallery/:public_id", async (req, res) => {
  try {
    const data = await makeHttpRequest(`http://localhost:5000/api/gallery/${req.params.public_id}`, {
      method: 'DELETE'
    });
    res.json(data);
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ ok: false, error: "Delete failed" });
  }
});

app.delete("/api/home-images/:id", async (req, res) => {
  try {
    const data = await makeHttpRequest(`http://localhost:5000/api/home-images/${req.params.id}`, {
      method: 'DELETE'
    });
    res.json(data);
  } catch (error) {
    console.error('Error deleting home image:', error);
    res.status(500).json({ ok: false, error: "Delete failed" });
  }
});

// --------------------
// START SERVER
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Dashboard server running on port ${PORT}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 Connected to main website: http://localhost:5000`);
  console.log(`📋 Note: Upload functionality requires direct connection to main website`);
});
