@echo off
echo ========================================
echo  Federal & California Leave Assistant
echo  Server Startup Script
echo ========================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

echo.
echo [2/4] Installing dependencies (if needed)...
if not exist "node_modules" (
    echo Installing npm packages...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        echo Please check your internet connection and try again.
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
) else (
    echo ✅ Dependencies already installed
)

echo.
echo [3/4] Checking if port 3001 is available...
netstat -an | find "3001" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  Port 3001 appears to be in use
    echo The server may already be running or another app is using this port.
    echo.
)

echo.
echo [4/4] Starting the server...
echo.
echo ========================================
echo  🚀 Server starting on http://localhost:3001
echo  📱 Open this URL in your browser
echo  ⚙️  Use your OpenAI API key in Settings
echo  🎭 Or use "demo" for testing
echo  ❌ Press Ctrl+C to stop the server
echo ========================================
echo.

npm start

echo.
echo Server has stopped.
pause