# Unified Developer Dashboard

A comprehensive React (Vite) and FastAPI application that brings together your Merge Requests, Jira Worklogs, and Database query runner into a single pane of glass.

## Features
- **Merge Request Dashboard**: Track MRs across multiple GitLab repositories using your personal access tokens.
- **Jira Worklog Dashboard**: View your team's Jira activity and extract tickets directly from MR branches/titles.
- **Database Query Runner**: Run predefined or custom SQL queries against Oracle databases safely via a Python backend proxy.

## Architecture
- **Frontend**: React (Vite), JavaScript, Vanilla CSS, Lucide Icons.
- **Backend**: Python, FastAPI, Oracle DB driver.
- **Run Engine**: `concurrently` runs both frontend and backend synchronously via a single script.

---

## ⚡ Quick Start (1-Click Startup for Non-Technical Users)

You can launch the entire dashboard with a single click or command:

### 🍎 On macOS:
Double-click `start-mac.command` in Finder, or run in Terminal:
```bash
./start-mac.sh
```
*This automatically checks Node.js & Python, installs dependencies, starts the backend and frontend dev servers, and opens `http://localhost:5173` in your browser.*

### 🪟 On Windows:
Double-click `start-windows.bat` in File Explorer, or run in Command Prompt:
```cmd
start-windows.bat
```
*This handles dependency checks, launches the servers, and opens the application in your default browser.*

---

## Manual Setup Instructions

### 1. Requirements
- Node.js (v18+)
- Python (v3.9+)

### 2. Configure Sensitive Information
To keep your private information secure, database connection strings are read from `db-backend/.env` (ignored by version control).

1. Navigate to the backend directory:
   ```bash
   cd db-backend
   ```
2. Copy the template:
   ```bash
   cp .env.example .env
   ```
3. Fill in any database credentials if using the Database Query tool. *(GitLab and Jira tokens are configured directly in the web UI settings and securely stored in your browser)*.

### 3. Running Manually
```bash
npm install
npm run dev
```

This will spin up:
- Vite Frontend: `http://localhost:5173`
- FastAPI Backend: `http://localhost:8000`

