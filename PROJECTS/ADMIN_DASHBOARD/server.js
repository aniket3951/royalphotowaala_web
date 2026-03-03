const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = 5001;

const SECRET_KEY = process.env.SECRET_KEY || 'royalphotowaala-secret-2025';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

app.use(session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
    if (req.session && req.session.loggedIn) {
        res.sendFile(path.join(__dirname, 'templates', 'dashboard_inline.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'dashboard_inline.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.loggedIn = true;
        req.session.username = username;
        res.json({ success: true, message: "Login successful" });
    } else {
        res.json({ success: false, message: "Invalid credentials" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.redirect('/login');
    });
});

app.get("/api/bookings", async (req, res) => {
    try {
        const response = await fetch('http://localhost:5000/api/bookings');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.json([]);
    }
});

app.get("/api/gallery", async (req, res) => {
    try {
        const response = await fetch('http://localhost:5000/api/gallery');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching gallery:', error);
        res.json([]);
    }
});

app.get("/api/site-assets", async (req, res) => {
    try {
        const response = await fetch('http://localhost:5000/api/site-assets');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching site assets:', error);
        res.json([]);
    }
});

app.get("/api/home-images", async (req, res) => {
    try {
        const response = await fetch('http://localhost:5000/api/home-images');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching home images:', error);
        res.json([]);
    }
});

app.post("/api/upload", upload.array('images', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.json({ success: false, error: "No files uploaded" });
    }

    const uploadPromises = req.files.map(file => {
        return new Promise((resolve) => {
            const curlCommand = `curl -X POST http://localhost:5000/api/upload -F "image=@${file.path}"`;
            
            exec(curlCommand, (error, stdout, stderr) => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                
                if (error) {
                    resolve({ success: false, error: "Upload failed" });
                } else {
                    try {
                        const result = JSON.parse(stdout);
                        resolve({ success: true, data: result });
                    } catch (e) {
                        resolve({ success: false, error: "Upload failed" });
                    }
                }
            });
        });
    });

    Promise.all(uploadPromises).then(results => {
        const successCount = results.filter(r => r.success).length;
        res.json({ 
            success: successCount > 0, 
            uploaded: successCount,
            total: req.files.length,
            results 
        });
    });
});

app.post("/api/site-assets", upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.json({ success: false, error: "No file uploaded" });
    }

    const curlCommand = `curl -X POST http://localhost:5000/api/site-assets -F "image=@${req.file.path}" -F "asset_type=logo" -F "alt_text=Royal Photowaala Logo"`;
    
    exec(curlCommand, (error, stdout, stderr) => {
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        if (error) {
            return res.json({ success: false, error: "Upload failed" });
        }
        
        try {
            const result = JSON.parse(stdout);
            res.json({ success: true, data: result });
        } catch (e) {
            res.json({ success: false, error: "Upload failed" });
        }
    });
});

app.post("/api/home-images", upload.array('images', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.json({ success: false, error: "No files uploaded" });
    }

    const uploadPromises = req.files.map(file => {
        return new Promise((resolve) => {
            const curlCommand = `curl -X POST http://localhost:5000/api/home-images -F "image=@${file.path}"`;
            
            exec(curlCommand, (error, stdout, stderr) => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                
                if (error) {
                    resolve({ success: false, error: "Upload failed" });
                } else {
                    try {
                        const result = JSON.parse(stdout);
                        resolve({ success: true, data: result });
                    } catch (e) {
                        resolve({ success: false, error: "Upload failed" });
                    }
                }
            });
        });
    });

    Promise.all(uploadPromises).then(results => {
        const successCount = results.filter(r => r.success).length;
        res.json({ 
            success: successCount > 0, 
            uploaded: successCount,
            total: req.files.length,
            results 
        });
    });
});

app.delete("/api/gallery/:id", (req, res) => {
    const curlCommand = `curl -X DELETE http://localhost:5000/api/gallery/${req.params.id}`;
    
    exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, error: "Delete failed" });
        }
        res.json({ success: true });
    });
});

app.delete("/api/site-assets/:id", (req, res) => {
    const curlCommand = `curl -X DELETE http://localhost:5000/api/site-assets/${req.params.id}`;
    
    exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, error: "Delete failed" });
        }
        res.json({ success: true });
    });
});

app.delete("/api/home-images/:id", (req, res) => {
    const curlCommand = `curl -X DELETE http://localhost:5000/api/home-images/${req.params.id}`;
    
    exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, error: "Delete failed" });
        }
        res.json({ success: true });
    });
});

app.delete("/api/bookings/:id", (req, res) => {
    const curlCommand = `curl -X DELETE http://localhost:5000/api/bookings/${req.params.id}`;
    
    exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, error: "Delete failed" });
        }
        res.json({ success: true });
    });
});

app.put("/api/bookings/:id/status", (req, res) => {
    const curlCommand = `curl -X PUT http://localhost:5000/api/bookings/${req.params.id}/status -H "Content-Type: application/json" -d '${JSON.stringify(req.body)}'`;
    
    exec(curlCommand, (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, error: "Update failed" });
        }
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Royal Photowaala Dashboard running on http://localhost:${PORT}`);
    console.log(`🔐 Login: ${ADMIN_USERNAME}/${ADMIN_PASSWORD}`);
});
