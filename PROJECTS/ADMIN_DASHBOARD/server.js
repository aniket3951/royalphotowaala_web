const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5001;

// 🌐 MAIN WEBSITE URL CONFIGURATION
const MAIN_SITE = process.env.MAIN_SITE_URL || 'https://royalphotowaala-uyan.onrender.com';

// 🔐 SESSION CONFIGURATION
app.use(session({
  secret: process.env.SECRET_KEY || 'royal-secret-key-2025',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false, // For local development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// 🔐 ADMIN CREDENTIALS
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ==================== MULTER CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (req.originalUrl.includes('gallery-images')) {
      // Use main website's uploads folder for gallery
      uploadPath = path.join(__dirname, '../MAIN_WEBSITE/static/uploads');
    } else if (req.originalUrl.includes('logo')) {
      uploadPath = path.join(__dirname, '../../shared_images/logo');
    } else if (req.originalUrl.includes('home-images')) {
      uploadPath = path.join(__dirname, '../../shared_images/home');
    } else {
      // Default to main website's uploads folder
      uploadPath = path.join(__dirname, '../MAIN_WEBSITE/static/uploads');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from admin dashboard
app.use(express.static(path.join(__dirname, 'static')));

// Serve shared images from root directory
app.use('/shared-images', express.static(path.join(__dirname, '../../shared_images')));

// Serve main website's uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../MAIN_WEBSITE/static/uploads')));

// Multer error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 100MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Expected: imageFile'
      });
    }
  }
  
  if (error.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed'
    });
  }
  
  console.error('❌ Upload middleware error:', error);
  res.status(500).json({
    success: false,
    message: 'Upload failed: ' + error.message
  });
});

// VIEW ENGINE SETUP (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// ==================== MIDDLEWARE ====================
function loginRequired(req, res, next) {
  if (req.session.logged_in !== true) {
    req.session.destroy();
    return res.redirect('/login');
  }
  next();
}

// ==================== ROUTES ====================

// ---------------- ROOT ----------------
app.get('/', (req, res) => {
  req.session.destroy(); // 🔥 FORCE CLEAR on root
  return res.redirect('/login');
});

// ---------------- LOGIN ----------------
app.route('/login')
  .get((req, res) => {
    console.log('GET /login - rendering login page');
    try {
      res.render('login', { error: null });
    } catch (error) {
      console.error('Error rendering login:', error);
      res.status(500).send('Error rendering login page');
    }
  })
  .post((req, res) => {
    console.log('POST /login - processing login');
    try {
      const { username, password } = req.body;
      console.log('Login attempt:', { username, password: '***' });

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.logged_in = true;
        console.log('Login successful, redirecting to dashboard');
        return res.redirect('/dashboard');
      }

      console.log('Login failed - invalid credentials');
      return res.render('login', {
        error: 'Invalid username or password'
      });
    } catch (error) {
      console.error('Error in login POST:', error);
      res.status(500).render('login', { error: 'Internal server error' });
    }
  });

// ---------------- DASHBOARD ----------------
app.get('/dashboard', loginRequired, (req, res) => {
  res.render('dashboard');
});

// ---------------- LOGOUT ----------------
app.get('/logout', (req, res) => {
  req.session.destroy();
  return res.redirect('/login');
});

// ---------------- FORCE LOGOUT (DEBUG ONLY) ----------------
app.get('/force_logout', (req, res) => {
  req.session.destroy();
  return res.send('Session cleared. Open /login now.');
});

// ==================== API ROUTES ====================

// Test route to debug API calls
app.get('/api/test', loginRequired, async (req, res) => {
  console.log('🧪 Test API route called');
  res.json({ success: true, message: 'API working' });
});

// Get bookings from main website
app.get('/api/bookings', loginRequired, async (req, res) => {
  console.log('📅 Fetching bookings from main website...');
  
  try {
    // Call main website's bookings API
    const response = await fetch(`${MAIN_SITE}/api/bookings`);
    console.log('   Main website response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Main website returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('   Bookings received:', data.bookings?.length || 0);
    
    res.json({
      success: true,
      bookings: data.bookings || []
    });
  } catch (error) {
    console.error('❌ Error fetching bookings:', error.message);
    res.json({
      success: true,
      bookings: []
    });
  }
});

app.put('/api/bookings/:id/status', loginRequired, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    // Call main website's booking status update API
    const response = await fetch(`${MAIN_SITE}/api/bookings/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update status');
    }
    
    const result = await response.json();
    console.log(`✅ Booking ${id} status updated to ${status}`);
    
    res.json({
      success: true,
      message: `Booking ${id} status updated to ${status}`
    });
  } catch (error) {
    console.error('❌ Status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
});

app.delete('/api/bookings/:id', loginRequired, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Call main website's booking delete API
    const response = await fetch(`${MAIN_SITE}/api/bookings/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete booking');
    }
    
    const result = await response.json();
    console.log(`✅ Booking ${id} deleted`);
    
    res.json({
      success: true,
      message: `Booking ${id} deleted`
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking'
    });
  }
});

app.post('/api/archive', loginRequired, (req, res) => {
  // Mock response
  res.json({
    success: true,
    archived_count: 0,
    message: 'No bookings to archive'
  });
});

// ==================== IMAGE MANAGEMENT API ====================

// Get gallery images
app.get('/api/gallery-images', loginRequired, async (req, res) => {
  try {
    // Call main website's gallery API
    const response = await fetch(`${MAIN_SITE}/api/gallery`);
    const images = await response.json();
    
    res.json({
      success: true,
      images: images.map(img => ({
        id: img.id || Date.now(),
        filename: img.public_id,
        image_url: img.url ? img.url.replace('/static/uploads/', '/uploads/') : `/uploads/${img.public_id}`,
        public_id: img.public_id
      }))
    });
  } catch (error) {
    console.error('Error fetching from main website:', error);
    res.json({ success: true, images: [] });
  }
});

// Upload gallery image
app.post('/api/gallery-images', loginRequired, upload.single('imageFile'), async (req, res) => {
  console.log('📤 Gallery upload request received');
  console.log('   File exists:', !!req.file);
  
  try {
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    console.log('✅ File uploaded successfully:', req.file.filename);
    
    // Read the file and create proper FormData
    const fileBuffer = fs.readFileSync(req.file.path);
    const formData = new FormData();
    formData.append('image', new Blob([fileBuffer]), req.file.originalname);
    
    // Call main website's upload endpoint
    const response = await fetch(`${MAIN_SITE}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Main website error:', errorText);
      throw new Error('Failed to upload to main website');
    }
    
    const result = await response.json();
    console.log('✅ Image uploaded to main website:', result);
    
    res.json({
      success: true,
      message: 'Gallery image uploaded successfully',
      image: {
        id: Date.now(), // Generate temporary ID
        filename: result.public_id || req.file.filename,
        url: result.url ? result.url.replace('/static/uploads/', '/uploads/') : `/uploads/${req.file.filename}`,
        public_id: result.public_id || req.file.filename
      }
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image: ' + error.message
    });
  }
});

// Delete gallery image
app.delete('/api/gallery-images/:filename', loginRequired, async (req, res) => {
  const { filename } = req.params;
  
  try {
    // Call main website's delete API
    const response = await fetch(`${MAIN_SITE}/api/gallery/${filename}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Main website error:', errorText);
      throw new Error('Failed to delete from main website');
    }
    
    const result = await response.json();
    console.log('✅ Image deleted from main website:', filename);
    
    res.json({
      success: true,
      message: 'Gallery image deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.json({
      success: false,
      message: 'Failed to delete image: ' + error.message
    });
  }
});

// Get logo
app.get('/api/logo', loginRequired, async (req, res) => {
  try {
    // Call main website's site assets API
    const response = await fetch(`${MAIN_SITE}/api/site-assets`);
    const assets = await response.json();
    
    if (assets.logo) {
      res.json({
        success: true,
        logo: {
          filename: assets.logo.url.split('/').pop(),
          image_url: assets.logo.url.replace('/static/uploads/', '/uploads/')
        }
      });
    } else {
      res.json({ success: true, logo: null });
    }
  } catch (error) {
    console.error('Error fetching logo:', error);
    res.json({ success: true, logo: null });
  }
});

// Upload logo
app.post('/api/logo', loginRequired, upload.single('logoFile'), async (req, res) => {
  console.log('📤 Logo upload request received');
  
  try {
    if (!req.file) {
      console.log('❌ No logo file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }
    
    console.log('✅ Logo uploaded successfully:', req.file.filename);
    
    // Read the file and create proper FormData
    const fileBuffer = fs.readFileSync(req.file.path);
    const formData = new FormData();
    formData.append('image', new Blob([fileBuffer]), req.file.originalname);
    formData.append('asset_type', 'logo');
    formData.append('alt_text', 'Royal Photowaala Logo');
    
    // Call main website's site assets endpoint
    const response = await fetch(`${MAIN_SITE}/api/site-assets`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Main website error:', errorText);
      throw new Error('Failed to upload logo to main website');
    }
    
    const result = await response.json();
    console.log('✅ Logo uploaded to main website:', result);
    
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logo: {
        filename: result.public_id || req.file.filename,
        url: result.url ? result.url.replace('/static/uploads/', '/uploads/') : `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('❌ Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo: ' + error.message
    });
  }
});

// Get home images
app.get('/api/home-images', loginRequired, async (req, res) => {
  try {
    // Call main website's home images API
    const response = await fetch(`${MAIN_SITE}/api/home-images`);
    const images = await response.json();
    
    res.json({
      success: true,
      images: images.map(img => {
        // Extract filename from URL since public_id doesn't exist
        const filename = img.url.split('/').pop();
        return {
          id: img.id,
          filename: filename,
          image_url: img.url ? img.url.replace('/static/uploads/', '/uploads/') : `/uploads/${filename}`,
          public_id: filename // Use filename as public_id for consistency
        };
      })
    });
  } catch (error) {
    console.error('Error fetching home images:', error);
    res.json({ success: true, images: [] });
  }
});

// Upload home image
app.post('/api/home-images', loginRequired, upload.single('homeFile'), async (req, res) => {
  console.log('📤 Home image upload request received');
  
  try {
    if (!req.file) {
      console.log('❌ No home image file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No home image file uploaded'
      });
    }
    
    console.log('✅ Home image uploaded successfully:', req.file.filename);
    
    // Read the file and create proper FormData
    const fileBuffer = fs.readFileSync(req.file.path);
    const formData = new FormData();
    formData.append('image', new Blob([fileBuffer]), req.file.originalname);
    formData.append('caption', 'Home Slideshow Image');
    formData.append('display_order', '1');
    
    // Call main website's home images endpoint
    const response = await fetch(`${MAIN_SITE}/api/home-images`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Main website error:', errorText);
      throw new Error('Failed to upload home image to main website');
    }
    
    const result = await response.json();
    console.log('✅ Home image uploaded to main website:', result);
    
    res.json({
      success: true,
      message: 'Home image uploaded successfully',
      image: {
        id: result.id || Date.now(),
        filename: result.public_id || req.file.filename,
        url: result.url ? result.url.replace('/static/uploads/', '/uploads/') : `/uploads/${req.file.filename}`,
        public_id: result.public_id || req.file.filename
      }
    });
  } catch (error) {
    console.error('❌ Home image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload home image: ' + error.message
    });
  }
});

// Delete home image
app.delete('/api/home-images/:filename', loginRequired, async (req, res) => {
  const { filename } = req.params;
  
  try {
    // Call main website's delete API (uses ID, not filename)
    // First get the image ID from filename by matching the filename in the URL
    const getResponse = await fetch(`${MAIN_SITE}/api/home-images`);
    const images = await getResponse.json();
    
    // Extract filename from URL and match
    const imageToDelete = images.find(img => {
      const urlFilename = img.url.split('/').pop(); // Extract filename from URL
      return urlFilename === filename;
    });
    
    console.log('🏠 Looking for image with filename:', filename);
    console.log('🏠 Available images:', images.map(img => ({
      id: img.id,
      url: img.url,
      extractedFilename: img.url.split('/').pop()
    })));
    
    if (!imageToDelete) {
      console.log('🏠 Image not found for filename:', filename);
      return res.json({
        success: false,
        message: 'Image not found'
      });
    }
    
    console.log('🏠 Found image to delete:', imageToDelete);
    
    // Call main website's delete API with ID
    const response = await fetch(`${MAIN_SITE}/api/home-images/${imageToDelete.id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Main website error:', errorText);
      throw new Error('Failed to delete from main website');
    }
    
    const result = await response.json();
    console.log('✅ Home image deleted from main website:', filename);
    
    res.json({
      success: true,
      message: 'Home image deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.json({
      success: false,
      message: 'Failed to delete image: ' + error.message
    });
  }
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).render('login', { error: 'Page not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('login', { error: 'Internal server error' });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Royal Photowaala Admin Dashboard running on http://localhost:${PORT}`);
  console.log(`🔐 Login credentials: ${ADMIN_USERNAME}/${ADMIN_PASSWORD}`);
});
