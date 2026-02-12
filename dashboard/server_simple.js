require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const http = require("http");

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
app.use(require("cors")({
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

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
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
      req.write(options.body);
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
    const data = await makeRequest('http://localhost:5000/api/bookings');
    res.json(data);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.get("/api/gallery", async (req, res) => {
  try {
    const data = await makeRequest('http://localhost:5000/api/gallery');
    res.json(data);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

app.get("/api/site-assets", async (req, res) => {
  try {
    const data = await makeRequest('http://localhost:5000/api/site-assets');
    res.json(data);
  } catch (error) {
    console.error('Error fetching site assets:', error);
    res.status(500).json({ error: "Failed to fetch site assets" });
  }
});

app.get("/api/home-images", async (req, res) => {
  try {
    const data = await makeRequest('http://localhost:5000/api/home-images');
    res.json(data);
  } catch (error) {
    console.error('Error fetching home images:', error);
    res.status(500).json({ error: "Failed to fetch home images" });
  }
});

// Image upload endpoints (proxy to main website)
app.post("/api/upload", multer({ storage: multer.memoryStorage() }).single("image"), async (req, res) => {
  try {
    const boundary = '----formdata-node-' + Math.random().toString(16).substr(2, 16);
    let formData = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${req.file.originalname}"\r\nContent-Type: ${req.file.mimetype}\r\n\r\n${req.file.buffer.toString('base64')}\r\n--${boundary}--`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      }
    };
    
    const data = await makeRequest('http://localhost:5000/api/upload', options);
    res.json(data);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

app.post("/api/site-assets", multer({ storage: multer.memoryStorage() }).single("image"), async (req, res) => {
  try {
    const boundary = '----formdata-node-' + Math.random().toString(16).substr(2, 16);
    let formData = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${req.file.originalname}"\r\nContent-Type: ${req.file.mimetype}\r\n\r\n${req.file.buffer.toString('base64')}\r\n--${boundary}\r\nContent-Disposition: form-data; name="asset_type"\r\n\r\n${req.body.asset_type}\r\n--${boundary}\r\nContent-Disposition: form-data; name="alt_text"\r\n\r\n${req.body.alt_text || ''}\r\n--${boundary}--`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      }
    };
    
    const data = await makeRequest('http://localhost:5000/api/site-assets', options);
    res.json(data);
  } catch (error) {
    console.error('Error uploading site asset:', error);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

app.post("/api/home-images", multer({ storage: multer.memoryStorage() }).single("image"), async (req, res) => {
  try {
    const boundary = '----formdata-node-' + Math.random().toString(16).substr(2, 16);
    let formData = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${req.file.originalname}"\r\nContent-Type: ${req.file.mimetype}\r\n\r\n${req.file.buffer.toString('base64')}\r\n--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${req.body.caption || ''}\r\n--${boundary}\r\nContent-Disposition: form-data; name="display_order"\r\n\r\n${req.body.display_order || '0'}\r\n--${boundary}--`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      }
    };
    
    const data = await makeRequest('http://localhost:5000/api/home-images', options);
    res.json(data);
  } catch (error) {
    console.error('Error uploading home image:', error);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

// Delete endpoints (proxy to main website)
app.delete("/api/gallery/:public_id", async (req, res) => {
  try {
    const data = await makeRequest(`http://localhost:5000/api/gallery/${req.params.public_id}`, {
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
    const data = await makeRequest(`http://localhost:5000/api/home-images/${req.params.id}`, {
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
});
