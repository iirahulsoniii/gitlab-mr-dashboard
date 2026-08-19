@echo off
setlocal

REM ==============================================================================
REM GitLab MR and Jira Analytics Dashboard - Windows Startup Script
REM ==============================================================================

title GitLab MR and Jira Analytics Dashboard Launcher
cd /d "%~dp0"

echo ================================================================
echo    GitLab MR and Jira Analytics Dashboard - Startup Script
echo ================================================================
echo.

REM ------------------------------------------------------------------------------
REM 1. Check Node.js
REM ------------------------------------------------------------------------------
echo [1/4] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo.
    echo Opening https://nodejs.org/ in your browser...
    start https://nodejs.org/
    echo.
    echo Please install Node.js (LTS version), restart Command Prompt, and run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is available.
echo.

REM ------------------------------------------------------------------------------
REM 2. Install Node Dependencies if needed
REM ------------------------------------------------------------------------------
echo [2/4] Checking Node dependencies...
if not exist "node_modules\" (
    echo Dependencies not found. Installing node packages (one-time setup, please wait)...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install npm dependencies.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Dependencies are ready.
)
echo.

REM ------------------------------------------------------------------------------
REM 3. Python Backend Setup (Optional for DB Dashboard)
REM ------------------------------------------------------------------------------
echo [3/4] Checking Python Database Backend...
where python >nul 2>nul
if %errorlevel% equ 0 (
    if exist "db-backend\" (
        if not exist "db-backend\venv\" (
            echo Creating Python virtual environment in db-backend\venv...
            python -m venv db-backend\venv
        )
        if exist "db-backend\venv\Scripts\pip.exe" (
            echo Ensuring Python dependencies are installed...
            call db-backend\venv\Scripts\pip.exe install --quiet --upgrade pip
            call db-backend\venv\Scripts\pip.exe install --quiet -r db-backend\requirements.txt 2>nul
            start "DB-Backend" /min db-backend\venv\Scripts\python.exe -m uvicorn main:app --port 8000 --app-dir db-backend
            echo [OK] Database Backend running on port 8000.
        )
    )
) else (
    echo [INFO] Python not found. Database backend skipped. Jira and GitLab features will work normally.
)
echo.

REM ------------------------------------------------------------------------------
REM 4. Start Frontend Server and Open Browser
REM ------------------------------------------------------------------------------
echo [4/4] Starting Dashboard Web Application...
echo.
echo ================================================================
echo    Application is running!
echo    Local URL: http://localhost:5173
echo ================================================================
echo.
echo Leave this window open while using the dashboard.
echo Press Ctrl+C to stop.
echo.

REM Open browser
start http://localhost:5173

REM Run Vite frontend server
if exist "node_modules\vite\bin\vite.js" (
    node node_modules\vite\bin\vite.js --port 5173 --host 127.0.0.1
) else (
    call npm run dev:frontend
)

echo.
echo Application server stopped.
pause
