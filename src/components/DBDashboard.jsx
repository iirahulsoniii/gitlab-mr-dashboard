import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Database, Server, AlertCircle, CheckCircle2, Search, Loader2, XCircle } from 'lucide-react';
import '../db.css';

const PAYMENT_QUERY = `SELECT
    payment_request_id,
    up_id,
    payment_status,
    transaction_code,
    amount,
    card_number,
    update_date,
    merchant_id,
    status_message
FROM ocp_payment_request
ORDER BY update_date DESC
FETCH FIRST 20 ROWS ONLY`;

const OTP_QUERY = `SELECT * 
FROM ocp_otp 
ORDER BY otp_id DESC 
FETCH FIRST 10 ROWS ONLY`;

export default function DBDashboard({ dbConfig }) {
  const [environment, setEnvironment] = useState(() => localStorage.getItem('db_env') || 'stage');
  const [query, setQuery] = useState(() => localStorage.getItem('db_query') || PAYMENT_QUERY);
  const [savedQueries, setSavedQueries] = useState(() => JSON.parse(localStorage.getItem('db_saved_queries') || '{}'));
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');
  const abortControllerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('db_env', environment);
    loadTables();
  }, [environment]);

  useEffect(() => {
    localStorage.setItem('db_query', query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem('db_saved_queries', JSON.stringify(savedQueries));
  }, [savedQueries]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsTableDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch('/db-api/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment, db_config: dbConfig })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.tables) {
        setTables(data.tables);
      }
    } catch (e) {
      console.warn('Could not load tables:', e);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleSelectTable = (tableName) => {
    setSelectedTable(tableName);
    const generatedQuery = `SELECT *
FROM ${tableName}
FETCH FIRST 10 ROWS ONLY`;
    setQuery(generatedQuery);
    setIsTableDropdownOpen(false);
  };

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables;
    const term = tableSearch.toLowerCase();
    return tables.filter(t => t.toLowerCase().includes(term));
  }, [tables, tableSearch]);

  const saveCurrentQuery = () => {
    if (!query.trim()) return;
    const name = window.prompt("Enter a short name for this custom query:");
    if (name && name.trim()) {
      setSavedQueries(prev => ({ ...prev, [name.trim()]: query }));
    }
  };

  const deleteSavedQuery = (name, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete custom query "${name}"?`)) {
      setSavedQueries(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const runQuery = async () => {
    if (!query.trim()) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setResult(null);
    setSearch('');

    try {
      const res = await fetch('/db-api/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment, query, db_config: dbConfig }),
        signal: abortControllerRef.current.signal
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.detail || `Server returned error (${res.status} ${res.statusText}). Make sure the backend is running on port 8000.`);
      }

      if (data.data) {
        setResult({ columns: data.columns, data: data.data });
      } else {
        setSuccessMsg(data.message || 'Query executed successfully.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Query execution cancelled.');
      } else {
        const msg = err.message || '';
        if (msg.includes('Failed to fetch') || msg.includes('Proxy Error') || msg.includes('500') || msg.includes('502')) {
          setError(`Cannot reach backend server. Please verify FastAPI is running at http://localhost:8000 (run: npm run dev). ${msg}`);
        } else if (msg.includes('DPY-6005') || msg.includes('DPY-6000') || msg.includes('Listener refused connection')) {
          setError(`Oracle Database connection failed (${msg}). Please verify your VPN is connected and credentials/DSN in Settings or .env are valid.`);
        } else {
          setError(msg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!result?.data) return [];
    if (!search.trim()) return result.data;
    
    const lowerSearch = search.toLowerCase();
    return result.data.filter(row => 
      Object.values(row).some(val => 
        val && String(val).toLowerCase().includes(lowerSearch)
      )
    );
  }, [result, search]);

  return (
    <div className="flex-col gap-6" style={{ marginTop: '1rem' }}>
      <div className="flex justify-between items-center glass" style={{ padding: '1rem 1.5rem' }}>
        <h2 className="flex items-center gap-2" style={{ margin: 0, fontSize: '1.25rem' }}>
          <Database size={20} className="text-accent" /> Query Runner
        </h2>
        
        <div className="flex gap-2">
          <button 
            className={`btn ${environment === 'stage' ? 'btn-primary' : ''}`} 
            onClick={() => setEnvironment('stage')}
            style={environment !== 'stage' ? { background: 'transparent' } : {}}
          >
            <Server size={16} /> Stage
          </button>
          <button 
            className={`btn ${environment === 'prod' ? 'btn-primary' : ''}`} 
            onClick={() => setEnvironment('prod')}
            style={environment !== 'prod' ? { background: 'transparent', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' } : { background: 'var(--danger-color)' }}
          >
            <Server size={16} /> Production
          </button>
        </div>
      </div>

      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="flex gap-2 items-center" style={{ marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginRight: '0.25rem' }}>Presets:</span>
          <button 
            className="btn" 
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}
            onClick={() => { setSelectedTable(''); setQuery(PAYMENT_QUERY); }}
          >
            Payments
          </button>
          <button 
            className="btn" 
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}
            onClick={() => { setSelectedTable(''); setQuery(OTP_QUERY); }}
          >
            OTP
          </button>

          {/* Table Dropdown with Search Bar */}
          <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              className="btn" 
              onClick={() => setIsTableDropdownOpen(prev => !prev)}
              style={{ 
                padding: '0.25rem 0.75rem', 
                fontSize: '0.875rem', 
                background: selectedTable ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', 
                border: selectedTable ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                color: selectedTable ? '#60a5fa' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Database size={14} />
              {selectedTable ? `Table: ${selectedTable}` : `Explore Tables (${tables.length})`}
              {loadingTables && <Loader2 size={12} className="spinner" />}
            </button>

            {isTableDropdownOpen && (
              <div 
                className="glass" 
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  width: '320px',
                  maxHeight: '340px',
                  zIndex: 100,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  backdropFilter: 'blur(16px)',
                  background: 'var(--bg-glass)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                  <input 
                    type="text"
                    placeholder="Search tables..."
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    autoFocus
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', width: '100%' }}
                  />
                  {tableSearch && (
                    <button 
                      onClick={() => setTableSearch('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      ×
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0 0.25rem' }}>
                  <span>{filteredTables.length} tables found</span>
                  <button 
                    onClick={loadTables} 
                    disabled={loadingTables}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Refresh List
                  </button>
                </div>

                <div style={{ overflowY: 'auto', maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {filteredTables.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {loadingTables ? 'Loading schema tables...' : 'No matching tables found.'}
                    </div>
                  ) : (
                    filteredTables.map(t => (
                      <button
                        key={t}
                        onClick={() => handleSelectTable(t)}
                        style={{
                          textAlign: 'left',
                          padding: '0.45rem 0.6rem',
                          background: selectedTable === t ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                          color: selectedTable === t ? '#60a5fa' : 'var(--text-primary)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontFamily: 'monospace',
                          transition: 'background 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = selectedTable === t ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}
                      >
                        <span>{t}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.7 }}>SELECT</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {Object.entries(savedQueries).map(([name, q]) => (
            <div key={name} className="flex items-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <button 
                className="btn" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', border: 'none', background: 'transparent' }}
                onClick={() => { setSelectedTable(''); setQuery(q); }}
                title={q}
              >
                {name}
              </button>
              <button 
                onClick={(e) => deleteSavedQuery(name, e)}
                style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', borderLeft: '1px solid var(--border-color)', opacity: 0.7 }}
                title="Delete preset"
              >
                ×
              </button>
            </div>
          ))}

          <button 
            className="btn" 
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: 'transparent', border: '1px dashed var(--accent-color)', color: 'var(--accent-color)', marginLeft: 'auto' }}
            onClick={saveCurrentQuery}
            disabled={!query.trim()}
          >
            + Save Current Query
          </button>
        </div>
        <textarea 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter your SQL query here..."
          spellCheck="false"
          style={{
            width: '100%',
            minHeight: '200px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1rem',
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            resize: 'vertical',
            outline: 'none'
          }}
        />
        <div className="flex justify-end gap-2">
          {loading && (
            <button 
              className="btn" 
              onClick={() => {
                if (abortControllerRef.current) abortControllerRef.current.abort();
              }}
              style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', background: 'transparent' }}
            >
              <XCircle size={16} /> Cancel
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={runQuery}
            disabled={loading || !query.trim()}
          >
            {loading ? <Loader2 size={16} className="spinner" /> : <Play size={16} />}
            {loading ? 'Executing...' : 'Run Query'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass flex items-center gap-2" style={{ padding: '1rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="glass flex items-center gap-2" style={{ padding: '1rem', borderColor: 'var(--success-color)', color: 'var(--success-color)' }}>
          <CheckCircle2 size={20} />
          {successMsg}
        </div>
      )}

      {result && (
        <div className="glass" style={{ padding: '1.5rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing {filteredData.length} {filteredData.length === 1 ? 'row' : 'rows'}
              {search && ` (filtered from ${result.data.length})`}
            </div>
            
            <div className="flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <Search size={16} style={{ color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Filter results..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            {filteredData.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    {result.columns.map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {result.columns.map(col => (
                        <td key={col} style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                          {row[col] ?? <span style={{ color: 'var(--text-secondary)' }}>null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                {result.data.length === 0 ? (
                  <>
                    <Database size={32} style={{ opacity: 0.4 }} />
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Table is currently empty</div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Query executed successfully, but <strong>WORKFLOW_STEP_STATE</strong> contains <strong>0 rows</strong> in the <strong>{environment.toUpperCase()}</strong> database.
                    </div>
                  </>
                ) : (
                  <>
                    <div>No rows match your filter "<strong>{search}</strong>" (out of {result.data.length} rows).</div>
                    <button className="btn" onClick={() => setSearch('')} style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
                      Clear Filter
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
