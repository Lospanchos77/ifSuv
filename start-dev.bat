@echo off
title IFSUV - Development
color 0A

echo.
echo ========================================
echo   IFSUV - DEV SERVERS
echo ========================================
echo.

:: Check if MongoDB is running
echo Checking MongoDB...
sc query MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] MongoDB service not found - make sure it's running locally on :27017
) else (
    sc query MongoDB | findstr /i "RUNNING" >nul
    if %errorlevel% neq 0 (
        echo [!] MongoDB service exists but is NOT running. Start it with: net start MongoDB
    ) else (
        echo [OK] MongoDB service is running
    )
)

:: Kill any existing processes on our ports
echo.
echo Cleaning up ports 3001, 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 :5173" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Ports cleared
echo.

echo ========================================
echo   Starting all servers...
echo   API:      http://localhost:3001/api/v1
echo   Swagger:  http://localhost:3001/api/docs
echo   Web:      http://localhost:5173
echo ========================================
echo.
echo   Press Ctrl+C to stop all servers
echo.

:: Run from repo root
cd /d "%~dp0"
pnpm dev
