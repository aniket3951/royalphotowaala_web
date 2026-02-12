require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5001;

// 🔐 ADMIN CREDENTIALS
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// --------------------
// CONFIG
// --------------------
app.use(
  session({
    secret: "royalphotowaala-secret-2025",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true 
    }
  })
);

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
app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use(express.static(path.join(__dirname, "templates")));

// --------------------
// ROUTES
// --------------------
app.get("/", (req, res) => {
  console.log('🔍 Dashboard access - Session:', req.session);
  
  if (!req.session.logged_in) {
    console.log('❌ Not logged in, redirecting to login');
    return res.redirect("/admin_login");
  }
  
  console.log('✅ Logged in, serving dashboard');
  res.sendFile(path.join(__dirname, "templates/dashboard.html"));
});

app.get("/admin_login", (req, res) => {
  console.log('🔍 Serving simple login page');
  res.sendFile(path.join(__dirname, "templates/simple_login.html"));
});

app.post("/admin_login", (req, res) => {
  console.log('🔍 Login attempt:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('❌ Missing credentials');
    return res.status(400).send("Username and password required");
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.logged_in = true;
    console.log('✅ Login successful, redirecting to dashboard');
    res.redirect("/");
  } else {
    console.log('❌ Invalid credentials');
    res.send(`
      <script>
        alert("Invalid credentials");
        window.location.href = "/admin_login";
      </script>
    `);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
    res.redirect("/admin_login");
  });
});

// --------------------
// START SERVER
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Dashboard server running on port ${PORT}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`✅ Admin login: admin/admin123`);
});
