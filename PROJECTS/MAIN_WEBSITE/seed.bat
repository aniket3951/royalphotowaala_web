@echo off
cd /d "c:/Users/akumb/OneDrive/Desktop/aniket/my website/main"
set DATABASE_URL=file:./dev.db
node prisma/seed.js
pause
