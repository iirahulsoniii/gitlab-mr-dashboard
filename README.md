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

## Local Setup Instructions

### 1. Requirements
- Node.js (v16+)
- Python (v3.9+)
- Oracle Client Libraries (if required by `oracledb` thick mode)

### 2. Configure Sensitive Information
To keep your private information secure, the database connection strings are read from a local configuration file that is **ignored by version control (`.gitignore`)**.

1. Navigate to the backend directory:
   ```bash
   cd db-backend
   ```
2. Copy the template file to create your local config file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your Oracle credentials for Stage and Production. Do **not** commit this file.

*(Note: GitLab and Jira tokens are securely stored in your browser's local storage and configured directly through the UI's Settings Menu, so you don't need to put them in `.env`).*

### 3. Backend Setup
Set up the Python virtual environment and install dependencies:

```bash
cd db-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Frontend Setup
Navigate back to the project root and install NPM dependencies:

```bash
cd ..
npm install
```

### 5. Running the Application
You only need to run a single command to start the entire stack:

```bash
npm run dev
```

This will automatically spin up:
- The Vite Frontend at `http://localhost:5173`
- The FastAPI Backend proxy at `http://localhost:8000`

Open your browser to `http://localhost:5173` and enjoy!
