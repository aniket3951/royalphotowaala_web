# Royal Photowaala - Shared Image & Database Setup

## 📁 Shared Structure

```
my website/
├── PROJECTS/
│   ├── MAIN_WEBSITE/
│   │   └── static/
│   │       └── uploads/              # Gallery images (both services)
│   ├── ADMIN_DASHBOARD/              # Admin dashboard (Port 5001)
│   │   ├── server_new.js             # Node.js server
│   │   └── templates/                # EJS templates
│   └── shared_images/                # Shared for logo & home only
│       ├── logo/                     # Website logo (both services)
│       └── home/                     # Home slideshow images (both services)
```

## 🔗 API Endpoints

### Admin Dashboard (Port 5001)
- `GET /api/gallery-images` - Get all gallery images from MAIN_WEBSITE/static/uploads
- `POST /api/gallery-images` - Upload gallery image to MAIN_WEBSITE/static/uploads
- `DELETE /api/gallery-images/:filename` - Delete from MAIN_WEBSITE/static/uploads
- `GET /api/logo` - Get website logo from shared_images/logo
- `POST /api/logo` - Upload logo to shared_images/logo
- `GET /api/home-images` - Get home slideshow images from shared_images/home
- `POST /api/home-images` - Upload home image to shared_images/home
- `DELETE /api/home-images/:filename` - Delete from shared_images/home

### Static Image Serving
- `/uploads/` - Gallery images (from MAIN_WEBSITE/static/uploads)
- `/shared-images/logo/` - Logo images
- `/shared-images/home/` - Home images

## 🔄 How It Works

1. **Gallery Images**: Both services use `MAIN_WEBSITE/static/uploads/` folder
2. **Logo & Home Images**: Both services use `shared_images/` folder
3. **API Integration**: Admin dashboard manages images via REST API
4. **Real-time Sync**: Changes in admin dashboard reflect immediately on main website
5. **File Storage**: Images are stored as actual files (not base64)

## 🚀 Usage

### Admin Dashboard
1. Login at http://localhost:5001
2. Navigate to Gallery section to manage images in MAIN_WEBSITE/static/uploads
3. Navigate to Logo section to manage shared_images/logo
4. Navigate to Home Images section to manage shared_images/home
5. Upload/delete images using the interface

### Main Website
1. Access gallery images via `/uploads/` endpoints
2. Display gallery images from MAIN_WEBSITE/static/uploads
3. Use logo from shared_images/logo
4. Show home slideshow from shared_images/home

## ✅ Fixed Integration Issues

- **Gallery Images**: Now uses MAIN_WEBSITE/static/uploads (same as main website)
- **Delete Sync**: Deleting from dashboard removes from main website folder
- **Upload Sync**: New uploads go directly to main website folder
- **URL Paths**: Gallery images served via `/uploads/` (same as main website)

## 📝 Next Steps

1. **Database Sync**: Connect both services to same database
2. **Image Optimization**: Add image resizing/compression
3. **Backup**: Add backup system for shared images
4. **Logo/Home Integration**: Update main website to use shared_images folders

## 🔧 Environment Variables

Both services use the same environment variables:
- `SECRET_KEY=royal-secret-key-2025`
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=admin123`
- `DATABASE_URL="file:./dev.db"`
