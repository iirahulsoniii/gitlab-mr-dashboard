import os
from typing import Optional

import oracledb
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

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
    environment: str # "stage" or "prod"
    query: str
    db_config: Optional[dict] = None

class TablesRequest(BaseModel):
    environment: str # "stage" or "prod"
    db_config: Optional[dict] = None

def get_db_connection(environment: str, config: Optional[dict] = None):
    prefix = "STAGE_DB_" if environment.lower() == "stage" else "PROD_DB_"
    
    # If config provided from UI payload, use it
    if config and environment in config and config[environment].get('user'):
        env_config = config[environment]
        user = env_config.get('user')
        password = env_config.get('password')
        
        # If DSN is provided in UI, use it. Otherwise, construct from .env
        dsn = env_config.get('dsn')
        if not dsn:
            host = os.getenv(f"{prefix}HOST")
            port = os.getenv(f"{prefix}PORT")
            service = os.getenv(f"{prefix}SERVICE")
            if host and port and service:
                dsn = oracledb.makedsn(host, int(port), service_name=service)
        
        if not all([user, password, dsn]):
            raise HTTPException(status_code=400, detail=f"Incomplete UI DB configuration for {environment}. Please provide a DSN or ensure Host/Port/Service are in .env.")
            
        try:
            return oracledb.connect(user=user, password=password, dsn=dsn)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database connection failed (via UI config): {str(e)}")

    # Fallback to .env logic if UI config not provided
    user = os.getenv(f"{prefix}USER")
    password = os.getenv(f"{prefix}PASSWORD")
    host = os.getenv(f"{prefix}HOST")
    port = os.getenv(f"{prefix}PORT")
    service = os.getenv(f"{prefix}SERVICE")
    
    if not all([user, password, host, port, service]):
        raise HTTPException(status_code=500, detail=f"Database configuration for {environment} is incomplete (no UI config, and missing .env).")
        
    try:
        dsn = oracledb.makedsn(host, int(port), service_name=service)
        conn = oracledb.connect(user=user, password=password, dsn=dsn)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

@app.post("/api/tables")
async def get_tables(req: TablesRequest):
    conn = None
    try:
        conn = get_db_connection(req.environment, req.db_config)
        cur = conn.cursor()
        # Fetch user_tables
        cur.execute("SELECT table_name FROM user_tables ORDER BY table_name")
        tables = [row[0] for row in cur.fetchall()]
        if not tables:
            # Fallback to all_tables for current schema owner
            cur.execute("SELECT table_name FROM all_tables WHERE owner = USER ORDER BY table_name")
            tables = [row[0] for row in cur.fetchall()]
        return {"tables": tables, "status": "success"}
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
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    # Security note: Running arbitrary queries is dangerous in a real production app!
    conn = None
    try:
        conn = get_db_connection(req.environment, req.db_config)
        cur = conn.cursor()
        cur.execute(req.query)
        
        # Determine if it's a SELECT query that returns rows
        if cur.description:
            columns = [col[0] for col in cur.description]
            rows = cur.fetchall()
            
            # Convert rows to a list of dicts for JSON serialization
            result = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    # Handle datetimes and LOBs appropriately if needed
                    row_dict[columns[i]] = str(value) if value is not None else None
                result.append(row_dict)
                
            return {"columns": columns, "data": result, "status": "success"}
        else:
            # For UPDATE/INSERT/DELETE or DDL
            conn.commit()
            return {"status": "success", "message": f"{cur.rowcount} row(s) affected."}
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass
