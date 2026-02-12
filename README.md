# Royal Photowaala - Connected Website System

## Overview
This system connects your main website and admin dashboard so that changes made in the dashboard automatically reflect on the main website.

## Architecture
- **Main Website** (Port 5000): Public-facing website with dynamic content
- **Dashboard** (Port 5001): Admin panel for managing content
- **Shared Database**: SQLite database stores all content and bookings
- **Real-time Sync**: Automatic updates every 30 seconds

## Features

### Dashboard Management
- **Logo Management**: Upload and update website logo
- **Home Images**: Manage homepage slideshow images
- **Gallery**: Manage best captures gallery
- **Bookings**: View and manage customer bookings

### Automatic Updates
- Logo changes appear instantly on main website
- Home page images update automatically
- Gallery images sync in real-time
- Booking data is shared between both systems

## Quick Start

### 1. Install Dependencies
```bash
# Install main website dependencies
cd main
npm install

# Install dashboard dependencies  
cd ../dashboard
npm install
```

### 2. Set Up Environment
Create `.env` files in both directories:

**main/.env:**
```
PORT=5000
SECRET_KEY=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
ADMIN_WHATSAPP_NUMBER=918149003738
```

**dashboard/.env:**
```
PORT=5001
SECRET_KEY=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Start the System
#### Option A: Use the startup script (Recommended)
```bash
# Double-click start.bat or run from command line
start.bat
```

#### Option B: Manual start
```bash
# Terminal 1 - Start main website
cd main
npm start

# Terminal 2 - Start dashboard  
cd dashboard
npm start
```

### 4. Access the System
- **Main Website**: http://localhost:5000
- **Dashboard**: http://localhost:5001
- **Dashboard Login**: admin/admin123

## How It Works

### Database Connection
- Dashboard connects to main website's database (`../main/database/booking.db`)
- Both applications share the same data source
- Changes are immediately available to both systems

### API Endpoints
- `GET /api/site-assets` - Fetch logo and other assets
- `POST /api/site-assets` - Update logo
- `GET /api/home-images` - Fetch homepage images
- `POST /api/home-images` - Add homepage image
- `DELETE /api/home-images/:id` - Remove homepage image
- `GET /api/bookings` - Fetch booking data

### Real-time Sync
- Main website polls for updates every 30 seconds
- Logo and home images automatically refresh
- No page reload required for updates

## Usage Examples

### Updating Logo
1. Login to dashboard at http://localhost:5001
2. Navigate to "Logo" section
3. Upload new logo image
4. Logo automatically appears on main website within 30 seconds

### Managing Home Images
1. Go to "Home Images" in dashboard
2. Upload multiple images for slideshow
3. Images appear as rotating background on main website
4. Delete images to remove from rotation

### Viewing Bookings
1. Both dashboard and main website share booking data
2. New bookings from main website appear in dashboard
3. Booking status updates are reflected immediately

## File Structure
```
my website/
├── main/                    # Main website (Port 5000)
│   ├── server.js           # Main server with API endpoints
│   ├── templates/          # HTML templates
│   ├── static/             # CSS and static files
│   ├── database/           # SQLite database
│   └── package.json
├── dashboard/              # Admin dashboard (Port 5001)
│   ├── server.js           # Dashboard server
│   ├── templates/          # Dashboard HTML
│   ├── scripts/            # JavaScript functionality
│   ├── styles/             # Dashboard CSS
│   └── package.json
├── start.bat              # Startup script
└── README.md              # This file
```

## Troubleshooting

### Port Conflicts
- Main website uses port 5000
- Dashboard uses port 5001
- Change PORT in .env files if needed

### Database Issues
- Ensure database directory exists in main/
- Check file permissions for database file
- Dashboard must have access to main's database

### Image Upload Issues
- Verify Cloudinary credentials in .env files
- Check image file size limits
- Ensure proper file formats (JPG, PNG, WebP)

### Sync Not Working
- Check that both servers are running
- Verify API endpoints are accessible
- Check browser console for JavaScript errors

## Development Notes

### Adding New Features
1. Add database tables to main/server.js
2. Create API endpoints in both servers
3. Update dashboard UI and JavaScript
4. Add real-time polling to main website

### Security Considerations
- Dashboard requires login authentication
- API endpoints are protected with session middleware
- File uploads are validated and processed safely
- Database connections use parameterized queries

## Support
For issues or questions:
1. Check the troubleshooting section above
2. Verify all dependencies are installed
3. Ensure environment variables are correctly set
4. Check server logs for error messages
