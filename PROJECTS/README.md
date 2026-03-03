# 📸 Royal Photowaala - Complete Photography Business Solution

## 🏢 Project Overview
Royal Photowaala is a comprehensive photography business management system with a beautiful public website and powerful admin dashboard.

## 📁 Perfect Folder Structure
```
my website/
├── 📁 PROJECTS/
│   ├── 📁 MAIN_WEBSITE/          # Public website (Port 5000)
│   │   ├── 📄 server.js
│   │   ├── 📄 package.json
│   │   ├── 📁 config/
│   │   ├── 📁 prisma/
│   │   ├── 📁 routes/
│   │   ├── 📁 static/
│   │   └── 📁 templates/
│   └── 📁 ADMIN_DASHBOARD/       # Admin panel (Port 5001)
│       ├── 📄 server.js
│       ├── 📄 package.json
│       ├── 📁 static/
│       ├── 📁 templates/
│       └── 📁 uploads/
├── 📄 README.md                  # This file
├── 📄 .gitignore
└── 📁 .windsurf/
```

## 🚀 Quick Start

### 1. Start Main Website
```bash
cd PROJECTS/MAIN_WEBSITE
npm install
npm start
```
📍 **Website:** http://localhost:5000

### 2. Start Admin Dashboard
```bash
cd PROJECTS/ADMIN_DASHBOARD
npm install
npm start
```
📍 **Dashboard:** http://localhost:5001
🔐 **Login:** admin / admin123

## ✨ Features

### 🌐 Main Website
- 📱 Responsive design
- 📸 Photography portfolio
- 📅 Booking system
- 📧 Contact forms
- 🎨 Beautiful galleries

### 🎛️ Admin Dashboard
- 📊 Booking management
- 🖼️ Gallery uploads
- 🎨 Logo management
- 🏠 Home page slideshow
- 🌙 Dark mode
- 📱 Mobile friendly
- 🔄 Real-time updates

## 🔧 Technology Stack
- **Backend:** Node.js, Express
- **Frontend:** HTML5, CSS3, JavaScript
- **Database:** Prisma ORM
- **Sessions:** Express-session
- **Uploads:** Multer
- **UI:** Custom professional design

## 📞 Business Information
- **Business:** Royal Photowaala
- **Services:** Photography, Events, Portraits
- **Location:** India
- **Contact:** Through website booking system

## 🛠️ Development
- **Main Website API:** http://localhost:5000
- **Admin Dashboard API:** http://localhost:5001
- **Database:** Configured in MAIN_WEBSITE/.env

## 📝 Notes
- Both servers can run simultaneously
- Dashboard connects to main website API
- All files are organized and clean
- Professional code structure maintained
