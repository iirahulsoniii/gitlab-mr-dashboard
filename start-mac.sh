#!/usr/bin/env bash

# ==============================================================================
# GitLab MR & Jira Analytics Dashboard - Zero-Config Mac Setup & Startup Script
# ==============================================================================

set -e

# Always run from the project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Color formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}   🚀 GitLab MR & Jira Analytics Dashboard - Startup Script     ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo ""

# ------------------------------------------------------------------------------
# 1. Check Node.js and NPM
# ------------------------------------------------------------------------------
echo -e "${BLUE}[1/4] Checking Node.js environment...${NC}"
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}${BOLD}❌ Node.js is not installed!${NC}"
    echo -e "${YELLOW}Please download and install Node.js (LTS version) from: https://nodejs.org/${NC}"
    echo "Opening download page in your browser..."
    open "https://nodejs.org/" 2>/dev/null || true
    read -p "Press Enter once Node.js is installed to continue..."
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${RED}Node.js still not found in PATH. Exiting.${NC}"
        exit 1
    fi
fi

NODE_VER=$(node -v)
NPM_VER=$(npm -v)
echo -e "${GREEN}✓ Node.js detected: ${NODE_VER} (npm ${NPM_VER})${NC}"

# ------------------------------------------------------------------------------
# 2. Install Frontend Node Dependencies
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[2/4] Checking Node dependencies...${NC}"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo -e "${YELLOW}Installing node packages (this only happens once)...${NC}"
    npm install
    echo -e "${GREEN}✓ Node dependencies installed successfully.${NC}"
else
    echo -e "${GREEN}✓ Node dependencies are ready.${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Setup Python Backend (Optional for DB Dashboard)
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[3/4] Checking Python Database Backend...${NC}"
BACKEND_PID=""

if command -v python3 >/dev/null 2>&1; then
    PYTHON_VER=$(python3 --version)
    echo -e "${GREEN}✓ Python detected: ${PYTHON_VER}${NC}"
    
    if [ -d "db-backend" ]; then
        if [ ! -d "db-backend/venv" ]; then
            echo -e "${YELLOW}Creating Python virtual environment in db-backend/venv...${NC}"
            python3 -m venv db-backend/venv
        fi
        
        echo -e "${YELLOW}Ensuring Python backend dependencies are installed...${NC}"
        ./db-backend/venv/bin/pip install --quiet --upgrade pip
        ./db-backend/venv/bin/pip install --quiet -r db-backend/requirements.txt || true
        
        echo -e "${GREEN}Starting Database Backend API on port 8000...${NC}"
        ./db-backend/venv/bin/python -m uvicorn main:app --port 8000 --app-dir db-backend >/dev/null 2>&1 &
        BACKEND_PID=$!
        echo -e "${GREEN}✓ Database Backend running (PID: ${BACKEND_PID})${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Python3 not detected. DB Dashboard backend will be skipped. Jira & GitLab dashboards will work normally.${NC}"
fi

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}Servers stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# 4. Start Vite Frontend Server & Open Browser
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[4/4] Starting Dashboard Web Application...${NC}"
npx vite --port 5173 --host 127.0.0.1 &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉 Application is running!                                   ${NC}"
echo -e "${GREEN}${BOLD}   🔗 Local URL: http://localhost:5173                          ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${YELLOW}Press Ctrl+C at any time in this window to stop the servers.${NC}"
echo ""

# Wait a moment for server to bind, then open default browser
sleep 2
open "http://localhost:5173" 2>/dev/null || true

# Keep script running
wait $FRONTEND_PID
