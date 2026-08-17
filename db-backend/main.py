import os
import json
import time
from datetime import datetime
from typing import Optional

import oracledb
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "data")
STORAGE_FILE = os.path.join(STORAGE_DIR, "dashboard_storage.json")

def read_storage() -> dict:
    if not os.path.exists(STORAGE_FILE):
        return {}
    try:
        with open(STORAGE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading storage file: {e}")
        return {}

def write_storage(data: dict):
    os.makedirs(STORAGE_DIR, exist_ok=True)
    temp_file = f"{STORAGE_FILE}.tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(temp_file, STORAGE_FILE)

# Configure oracledb to fetch LOBs (CLOB, BLOB) directly as strings/bytes
oracledb.defaults.fetch_lobs = False

app = FastAPI()

# Allow CORS for the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    environment: Optional[str] = "stage" # "stage" or "prod"
    query: str
    db_config: Optional[dict] = None
    connection: Optional[dict] = None

class TablesRequest(BaseModel):
    environment: Optional[str] = "stage" # "stage" or "prod"
    db_config: Optional[dict] = None
    connection: Optional[dict] = None

def is_listener_busy_error(err_str: str) -> bool:
    s = str(err_str).lower()
    return any(k in s for k in ("dpy-6005", "dpy-6000", "listener refused", "12516", "12520", "available handler", "cannot connect to database"))

def connect_with_retry(user, password, dsn, conn_name: str, max_retries: int = 3):
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            return oracledb.connect(user=user, password=password, dsn=dsn, tcp_connect_timeout=8)
        except Exception as e:
            last_err = e
            err_msg = str(e)
            if is_listener_busy_error(err_msg) and attempt < max_retries:
                print(f"[{conn_name}] Oracle Listener busy on backend attempt {attempt}/{max_retries}. Retrying in 1.5s...")
                time.sleep(1.5)
                continue
            break
    raise HTTPException(status_code=500, detail=f"Database connection failed for '{conn_name}': {str(last_err)}")

def get_db_connection(environment: str, config: Optional[dict] = None, connection: Optional[dict] = None):
    # 1. If explicit connection object is provided (Multi-DB connection support)
    if connection and connection.get('user'):
        user = connection.get('user')
        password = connection.get('password')
        dsn = connection.get('dsn')
        env = connection.get('environment') or environment or "stage"
        prefix = "STAGE_DB_" if str(env).lower() == "stage" else "PROD_DB_"
        
        if isinstance(user, str): user = user.strip()
        if isinstance(dsn, str): dsn = dsn.strip()
        
        if not dsn:
            host = os.getenv(f"{prefix}HOST")
            port = os.getenv(f"{prefix}PORT")
            service = os.getenv(f"{prefix}SERVICE")
            if host and port and service:
                dsn = oracledb.makedsn(host.strip(), int(port), service_name=service.strip())
                
        if not all([user, password, dsn]):
            conn_name = connection.get('name') or f"{str(env).upper()} Connection"
            raise HTTPException(status_code=400, detail=f"Incomplete connection details for '{conn_name}'. Please verify user, password, and DSN in Settings.")
            
        conn_name = connection.get('name') or f"{str(env).upper()} Connection"
        return connect_with_retry(user=user, password=password, dsn=dsn, conn_name=conn_name)

    prefix = "STAGE_DB_" if (environment or "").lower() == "stage" else "PROD_DB_"
    
    # 2. If legacy config provided from UI payload, use it
    if config and environment in config and config[environment].get('user'):
        env_config = config[environment]
        user = env_config.get('user')
        password = env_config.get('password')
        
        if isinstance(user, str): user = user.strip()
        
        # If DSN is provided in UI, use it. Otherwise, construct from .env
        dsn = env_config.get('dsn')
        if isinstance(dsn, str): dsn = dsn.strip()
        if not dsn:
            host = os.getenv(f"{prefix}HOST")
            port = os.getenv(f"{prefix}PORT")
            service = os.getenv(f"{prefix}SERVICE")
            if host and port and service:
                dsn = oracledb.makedsn(host.strip(), int(port), service_name=service.strip())
        
        if not all([user, password, dsn]):
            raise HTTPException(status_code=400, detail=f"Incomplete UI DB configuration for {environment}. Please provide a DSN or ensure Host/Port/Service are in .env.")
            
        return connect_with_retry(user=user, password=password, dsn=dsn, conn_name=f"{environment.upper()} Connection")

    # 3. Fallback to .env logic if UI config not provided
    user = os.getenv(f"{prefix}USER")
    password = os.getenv(f"{prefix}PASSWORD")
    host = os.getenv(f"{prefix}HOST")
    port = os.getenv(f"{prefix}PORT")
    service = os.getenv(f"{prefix}SERVICE")
    
    if not all([user, password, host, port, service]):
        raise HTTPException(status_code=500, detail=f"Database configuration for {environment} is incomplete (no UI config, and missing .env).")
        
    dsn = oracledb.makedsn(host.strip(), int(port), service_name=service.strip())
    return connect_with_retry(user=user.strip(), password=password, dsn=dsn, conn_name=f"{environment.upper()} Connection (.env)")

@app.post("/api/tables")
async def get_tables(req: TablesRequest):
    conn = None
    try:
        conn = get_db_connection(req.environment, req.db_config, req.connection)
        cur = conn.cursor()
        # Fetch user_tables and user_views (fast direct dictionary query)
        cur.execute("""
            SELECT table_name FROM user_tables
            UNION
            SELECT view_name AS table_name FROM user_views
            ORDER BY 1
        """)
        tables = [row[0] for row in cur.fetchall()]
        if not tables:
            # Fallback to all_tables for current schema owner
            cur.execute("SELECT table_name FROM all_tables WHERE owner = USER ORDER BY table_name")
            tables = [row[0] for row in cur.fetchall()]
        return {"tables": tables, "status": "success", "count": len(tables)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch tables: {str(e)}")
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

@app.post("/api/query")
async def execute_query(req: QueryRequest):
    cleaned_query = req.query.strip()
    if not cleaned_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # Strict Safety Guardrail: Allow ONLY read-only queries (SELECT, WITH, EXPLAIN, DESCRIBE)
    first_word = cleaned_query.split()[0].upper() if cleaned_query.split() else ""
    if first_word not in ("SELECT", "WITH", "EXPLAIN", "DESC"):
        raise HTTPException(
            status_code=403, 
            detail="Safety Guardrail: Modifying queries (DELETE, UPDATE, INSERT, DROP, TRUNCATE, ALTER) are strictly prohibited. Only read-only queries (SELECT) are permitted."
        )

    # Double check for dangerous destructive keyword tokens
    dangerous_keywords = ["DELETE ", "UPDATE ", "DROP ", "TRUNCATE ", "ALTER ", "INSERT ", "MERGE ", "GRANT ", "REVOKE "]
    upper_query = cleaned_query.upper()
    for kw in dangerous_keywords:
        if kw in upper_query and not upper_query.startswith("SELECT") and not upper_query.startswith("WITH"):
            raise HTTPException(
                status_code=403,
                detail=f"Safety Guardrail: '{kw.strip()}' statements are strictly forbidden."
            )
        
    conn = None
    try:
        conn = get_db_connection(req.environment, req.db_config, req.connection)
        cur = conn.cursor()
        cur.execute(cleaned_query)
        
        # Determine if it's a SELECT query that returns rows
        if cur.description:
            columns = [col[0] for col in cur.description]
            rows = cur.fetchall()
            
            # Convert rows to a list of dicts for JSON serialization
            result = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[columns[i]] = str(value) if value is not None else None
                result.append(row_dict)
                
            return {"columns": columns, "data": result, "status": "success"}
        else:
            return {"columns": [], "data": [], "status": "success", "message": "Query executed with 0 rows returned."}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

@app.get("/storage")
def get_storage():
    """Retrieve all persistent dashboard configurations and data stored on disk."""
    return read_storage()

@app.post("/storage")
def save_storage(payload: dict):
    """Save/update persistent dashboard configurations and data directly to disk."""
    try:
        current = read_storage()
        current.update(payload)
        current["lastSavedAt"] = datetime.utcnow().isoformat()
        write_storage(current)
        return {
            "status": "success", 
            "savedAt": current["lastSavedAt"], 
            "keys": list(current.keys())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save dashboard storage: {str(e)}")

