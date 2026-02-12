@echo off
echo ========================================
echo Starting Royal Photowaala Website System
echo ========================================
echo.

echo [1/3] Starting Main Website (Port 5000)...
cd /d "%~dp0main"
start "Main Website" cmd /k "npm start"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Dashboard (Port 5001)...
cd /d "%~dp0dashboard"
start "Dashboard" cmd /k "npm start"

timeout /t 3 /nobreak >nul

echo [3/3] Opening websites in browser...
start http://localhost:5000
start http://localhost:5001

echo.
echo ========================================
echo ✅ Both servers started successfully!
echo 🌐 Main Website: http://localhost:5000
echo 🎛️  Dashboard: http://localhost:5001
echo ========================================
echo.
echo Press any key to exit...
pause >nul
