@echo off
echo ========================================
echo   Royal Photowaala - Startup Script
echo ========================================
echo.
echo Starting Main Website (Port 5000)...
start "Main Website" cmd /k "cd /d %~dp0PROJECTS\MAIN_WEBSITE && node server.js"

echo.
echo Starting Admin Dashboard (Port 5001)...
start "Admin Dashboard" cmd /k "cd /d %~dp0PROJECTS\ADMIN_DASHBOARD && node server.js"

echo.
echo ========================================
echo   Both servers are starting...
echo ========================================
echo.
echo Main Website: http://localhost:5000
echo Admin Dashboard: http://localhost:5001
echo Login: admin / admin123
echo.
echo Press any key to exit...
pause >nul
