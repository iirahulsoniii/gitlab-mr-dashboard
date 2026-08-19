@echo off
setlocal EnableDelayedExpansion

REM ==============================================================================
REM GitLab MR & Jira Analytics Dashboard - Zero-Config Windows Setup & Startup Script
REM ==============================================================================

title GitLab MR ^& Jira Analytics Dashboard Launcher
cd /d "%~dp0"

echo ================================================================
echo    GitLab MR ^& Jira Analytics Dashboard - Startup Script
echo ================================================================
echo.

REM ------------------------------------------------------------------------------
REM 1. Check Node.js and NPM
REM ------------------------------------------------------------------------------
echo [1/4] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this machine!
    echo Opening https://nodejs.org/ in your browser...
    start https://nodejs.org/
    echo Please install Node.js (LTS version) and run this script again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VERSION=%%v
echo [OK] Node.js detected: %NODE_VERSION% (npm %NPM_VERSION%)
echo.

REM ------------------------------------------------------------------------------
REM 2. Install Node Dependencies
REM ------------------------------------------------------------------------------
echo [2/4] Checking Node dependencies...
if not exist "node_modules\" (
    echo Installing node dependencies (one-time setup, please wait)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo [OK] Node packages installed.
) else (
    echo [OK] Node packages ready.
)
echo.

REM ------------------------------------------------------------------------------
REM 3. Check Python & Start Database Backend (Optional)
REM ------------------------------------------------------------------------------
echo [3/4] Checking Python Database Backend...
where python >nul 2>nul
if %errorlevel% equ 0 (
    if exist "db-backend\" (
        if not exist "db-backend\venv\" (
            echo Creating Python virtual environment in db-backend\venv...
            python -m venv db-backend\venv
        )
        echo Installing Python requirements...
        call db-backend\venv\Scripts\pip install --quiet --upgrade pip
        call db-backend\venv\Scripts\pip install --quiet -r db-backend\requirements.txt 2>nul
        
        echo Starting Database Backend on port 8000...
        start "DB-Backend" /min db-backend\venv\Scripts\python -m uvicorn main:app --port 8000 --app-dir db-backend
        echo [OK] Database Backend started.
    )
) else (
    echo [INFO] Python not found. Database backend skipped. Jira and GitLab features will work normally.
)
echo.

REM ------------------------------------------------------------------------------
REM 4. Start Vite Frontend & Open Browser
REM ------------------------------------------------------------------------------
echo [4/4] Starting Dashboard Web Application...
echo.
echo ================================================================
echo    Application is running!
echo    Local URL: http://localhost:5173
echo ================================================================
echo.
echo Leave this window open while using the application.
echo Press Ctrl+C to stop.
echo.

REM Open browser after 2 seconds in background
start "" cmd /c "timeout /t 2 >nul & start http://localhost:5173"

call npx vite --port 5173 --host 127.0.0.1
