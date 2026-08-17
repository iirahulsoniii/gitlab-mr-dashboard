import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Database, 
  Server, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Loader2, 
  XCircle, 
  RefreshCcw, 
  Plus, 
  Save, 
  BookmarkPlus 
} from 'lucide-react';
import { debouncedSaveServerStorage } from '../storageApi';
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
WHERE trunc(update_date) = trunc(sysdate)
ORDER BY update_date DESC
FETCH FIRST 20 ROWS ONLY`;

const OTP_QUERY = `SELECT * 
FROM ocp_otp 
ORDER BY otp_id DESC 
FETCH FIRST 10 ROWS ONLY`;

export default function DBDashboard({ dbConfig = {} }) {
  // Support multi-database connections: user-defined or default Stage/Prod
  const connections = useMemo(() => {
    if (Array.isArray(dbConfig?.connections) && dbConfig.connections.length > 0) {
      return dbConfig.connections;
    }
    if (Array.isArray(dbConfig) && dbConfig.length > 0) {
      return dbConfig;
    }
    const conns = [];
    if (dbConfig?.stage && (dbConfig.stage.user || dbConfig.stage.dsn)) {
      conns.push({ id: 'stage-default', name: 'Stage DB (Default)', environment: 'stage', ...dbConfig.stage });
    }
    if (dbConfig?.prod && (dbConfig.prod.user || dbConfig.prod.dsn)) {
      conns.push({ id: 'prod-default', name: 'Prod DB (Default)', environment: 'prod', ...dbConfig.prod });
    }
    if (conns.length > 0) return conns;

    return [
      { id: 'stage-default', name: 'Stage DB', environment: 'stage', user: dbConfig?.stage?.user || '', password: dbConfig?.stage?.password || '', dsn: dbConfig?.stage?.dsn || '' },
      { id: 'prod-default', name: 'Prod DB', environment: 'prod', user: dbConfig?.prod?.user || '', password: dbConfig?.prod?.password || '', dsn: dbConfig?.prod?.dsn || '' }
    ];
  }, [dbConfig]);

  const [activeConnId, setActiveConnId] = useState(() => {
    const saved = localStorage.getItem('db_active_conn_id');
    if (saved && connections.some(c => c && c.id === saved)) return saved;
    return connections[0]?.id || 'stage-default';
  });

  const activeConn = useMemo(() => {
    return connections.find(c => c && c.id === activeConnId) || connections[0] || {
      id: 'stage-default',
      name: 'Database',
      environment: 'stage',
      user: '',
      password: '',
      dsn: ''
    };
  }, [connections, activeConnId]);

  // Saved queries state
  const [savedQueries, setSavedQueries] = useState(() => {
    try {
      const saved = localStorage.getItem('db_saved_queries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved queries:', e);
    }
    return {};
  });

  // By default, open the first saved query. If none, activeSavedQueryName is null.
  const [activeSavedQueryName, setActiveSavedQueryName] = useState(() => {
    const savedKeys = Object.keys(savedQueries);
    if (savedKeys.length > 0) {
      const lastActive = localStorage.getItem('db_active_saved_query_name');
      if (lastActive && savedQueries[lastActive] !== undefined) {
        return lastActive;
      }
      return savedKeys[0];
    }
    return null;
  });

  // Query pad text: default to active saved query, or empty if none
  const [query, setQuery] = useState(() => {
    const savedKeys = Object.keys(savedQueries);
    if (savedKeys.length > 0) {
      const lastActive = localStorage.getItem('db_active_saved_query_name');
      if (lastActive && savedQueries[lastActive] !== undefined) {
        return savedQueries[lastActive];
      }
      return savedQueries[savedKeys[0]];
    }
    // If no saved queries, open a new empty board
    return '';
  });

  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableError, setTableError] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');
  const abortControllerRef = useRef(null);
  const tablesAbortControllerRef = useRef(null);
  const dropdownRef = useRef(null);

  // When active connection changes, reset table list and errors
  useEffect(() => {
    localStorage.setItem('db_active_conn_id', activeConnId);
    setTables([]);
    setSelectedTable('');
    setTableError(null);
  }, [activeConnId]);

  useEffect(() => {
    localStorage.setItem('db_query', query);
  }, [query]);

  useEffect(() => {
    if (activeSavedQueryName) {
      localStorage.setItem('db_active_saved_query_name', activeSavedQueryName);
    } else {
      localStorage.removeItem('db_active_saved_query_name');
    }
  }, [activeSavedQueryName]);

  useEffect(() => {
    localStorage.setItem('db_saved_queries', JSON.stringify(savedQueries));
    debouncedSaveServerStorage({ savedQueries });
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
    if (tablesAbortControllerRef.current) {
      tablesAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    tablesAbortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    setLoadingTables(true);
    setTableError(null);
    try {
      const res = await fetch('/db-api/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          environment: activeConn.environment || 'stage', 
          connection: activeConn,
          db_config: dbConfig 
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.tables)) {
        setTables(data.tables);
        setTableError(null);
      } else {
        const errorDetail = data.detail || `Server returned ${res.status}: ${res.statusText}`;
        setTableError(errorDetail);
        setTables([]);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        setTableError('Connection timed out (12s). Check DB host, DSN, or VPN.');
      } else {
        setTableError(e.message || 'Failed to connect to database backend.');
      }
      setTables([]);
      console.warn('Could not load tables:', e);
    } finally {
      clearTimeout(timeoutId);
      setLoadingTables(false);
    }
  };

  const handleToggleTableDropdown = () => {
    const willOpen = !isTableDropdownOpen;
    setIsTableDropdownOpen(willOpen);
    if (willOpen && (tables.length === 0 || tableError)) {
      loadTables();
    }
  };

  const handleSelectTable = (tableName) => {
    setSelectedTable(tableName);
    setActiveSavedQueryName(null);
    const generatedQuery = `SELECT *
FROM ${tableName}
FETCH FIRST 10 ROWS ONLY`;
    setQuery(generatedQuery);
    setIsTableDropdownOpen(false);
  };

  const filteredTables = useMemo(() => {
    if (!Array.isArray(tables)) return [];
    if (!tableSearch || !tableSearch.trim()) return tables;
    const term = tableSearch.toLowerCase();
    return tables.filter(t => typeof t === 'string' && t.toLowerCase().includes(term));
  }, [tables, tableSearch]);

  // Open a new blank query pad
  const handleNewQuery = () => {
    setActiveSavedQueryName(null);
    setSelectedTable('');
    setQuery('');
    setError(null);
    setSuccessMsg(null);
  };

  // Save changes to current query (or Save As if new)
  const handleSave = () => {
    if (!query.trim()) return;
    if (activeSavedQueryName) {
      setSavedQueries(prev => ({ ...prev, [activeSavedQueryName]: query }));
      setSuccessMsg(`Query "${activeSavedQueryName}" saved successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      handleSaveAs();
    }
  };

  // Save query under a new name
  const handleSaveAs = () => {
    if (!query.trim()) return;
    const defaultName = activeSavedQueryName ? `${activeSavedQueryName} (Copy)` : 'My Query';
    const name = window.prompt("Enter a name for this saved query:", defaultName);
    if (name && name.trim()) {
      const cleanName = name.trim();
      setSavedQueries(prev => ({ ...prev, [cleanName]: query }));
      setActiveSavedQueryName(cleanName);
      setSelectedTable('');
      setSuccessMsg(`Query saved as "${cleanName}".`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const deleteSavedQuery = (name, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete saved query "${name}"?`)) {
      setSavedQueries(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      if (activeSavedQueryName === name) {
        const remainingKeys = Object.keys(savedQueries).filter(k => k !== name);
        if (remainingKeys.length > 0) {
          const nextKey = remainingKeys[0];
          setActiveSavedQueryName(nextKey);
          setQuery(savedQueries[nextKey]);
        } else {
          setActiveSavedQueryName(null);
          setQuery('');
        }
      }
    }
  };

  const runQuery = async () => {
    if (!query.trim()) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setResult(null);
    setSearch('');

    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s safety timeout

    try {
      const res = await fetch('/db-api/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          environment: activeConn.environment || 'stage', 
          query, 
          connection: activeConn,
          db_config: dbConfig 
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        const errorDetail = data.detail || `Server returned error (${res.status} ${res.statusText}).`;
        setError(errorDetail);
        setLoading(false);
        return;
      }

      if (data.data) {
        setResult({ columns: data.columns || [], data: data.data || [] });
      } else {
        setSuccessMsg(data.message || 'Query executed successfully with 0 rows returned.');
      }
      setError(null);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Query execution timed out after 20 seconds or was cancelled. Please check DB host, DSN, or VPN.');
      } else {
        const msg = err.message || 'Failed to execute query.';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setError('Cannot reach database backend. Make sure FastAPI is running on port 8000.');
        } else {
          setError(msg);
        }
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const renderCellContent = (val) => {
    if (val === null || val === undefined) {
      return <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>null</span>;
    }
    
    if (typeof val === 'object') {
      return (
        <pre style={{ margin: 0, fontSize: '0.75rem', maxWidth: '380px', maxHeight: '120px', overflow: 'auto', background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.5rem', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    
    const strVal = String(val);
    
    // Automatically detect JSON payloads (e.g. OUTPUT_ATTRS) and provide interactive viewer
    if ((strVal.startsWith('{') && strVal.endsWith('}')) || (strVal.startsWith('[') && strVal.endsWith(']'))) {
      try {
        const parsed = JSON.parse(strVal);
        return (
          <details style={{ cursor: 'pointer', maxWidth: '420px' }}>
            <summary style={{ color: '#60a5fa', fontSize: '0.8rem', outline: 'none', userSelect: 'none' }}>
              {'{ }'} JSON Payload ({Array.isArray(parsed) ? `${parsed.length} items` : `${Object.keys(parsed).length} keys`})
            </summary>
            <pre style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', maxHeight: '180px', overflow: 'auto', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </details>
        );
      } catch (e) {
        // Not valid JSON, render as plain string
      }
    }
    
    if (strVal.length > 80) {
      return (
        <div style={{ maxWidth: '320px', maxHeight: '90px', overflowY: 'auto', wordBreak: 'break-word', whiteSpace: 'pre-wrap', fontSize: '0.82rem' }}>
          {strVal}
        </div>
      );
    }
    
    return <span style={{ wordBreak: 'break-word' }}>{strVal}</span>;
  };

  const filteredData = useMemo(() => {
    if (!result?.data) return [];
    if (!search.trim()) return result.data;
    
    const lowerSearch = search.toLowerCase();
    return result.data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(lowerSearch)
      )
    );
  }, [result, search]);

  const isCurrentQueryDirty = useMemo(() => {
    if (!activeSavedQueryName) return false;
    return savedQueries[activeSavedQueryName] !== query;
  }, [activeSavedQueryName, savedQueries, query]);

  return (
    <div className="flex-col gap-6" style={{ marginTop: '0.5rem' }}>
      {/* Top Header & Multi-Connection Switcher */}
      <div className="glass flex justify-between items-center" style={{ padding: '1rem 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex items-center gap-3">
          <Database size={22} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ margin: 0 }}>Oracle Database Explorer</h3>
        </div>
        
        {/* Dynamic Multi-Connection Switcher */}
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Connection:</span>
          {connections.map(conn => {
            if (!conn) return null;
            const isActive = conn.id === activeConnId;
            const isProd = (conn.environment || '').toLowerCase() === 'prod' || (conn.name || '').toLowerCase().includes('prod');
            return (
              <button 
                key={conn.id}
                className={`btn ${isActive ? (isProd ? '' : 'btn-primary') : ''}`}
                onClick={() => {
                  setActiveConnId(conn.id);
                  setSelectedTable('');
                }}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.35rem 0.85rem',
                  background: isActive ? (isProd ? 'var(--danger-color)' : undefined) : 'transparent',
                  borderColor: isProd ? 'var(--danger-color)' : (isActive ? undefined : 'var(--border-color)'),
                  color: isProd && !isActive ? 'var(--danger-color)' : undefined
                }}
                title={conn.dsn ? `DSN: ${conn.dsn}` : conn.name}
              >
                <Server size={14} />
                {conn.name || (isProd ? 'Production' : 'Stage')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Query Pad Container */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Query Tabs & Presets Bar */}
        <div className="flex gap-2 items-center" style={{ marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          {/* New Blank Query Button */}
          <button 
            className="btn" 
            style={{ 
              padding: '0.25rem 0.75rem', 
              fontSize: '0.875rem', 
              background: (!activeSavedQueryName && !selectedTable) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', 
              border: (!activeSavedQueryName && !selectedTable) ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              color: (!activeSavedQueryName && !selectedTable) ? '#60a5fa' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: (!activeSavedQueryName && !selectedTable) ? 600 : 500
            }}
            onClick={handleNewQuery}
            title="Open a new blank query pad"
          >
            <Plus size={14} /> New Query
          </button>

          {/* Table Dropdown with Search Bar */}
          <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              className="btn" 
              onClick={handleToggleTableDropdown}
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
              {selectedTable ? `Table: ${selectedTable}` : `Explore Tables (${Array.isArray(tables) ? tables.length : 0})`}
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
                  {tableError ? (
                    <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--danger-color)', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', margin: '0.25rem 0' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Failed to load tables</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', wordBreak: 'break-word' }}>{tableError}</div>
                      <button 
                        type="button"
                        className="btn btn-primary"
                        onClick={loadTables}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <RefreshCcw size={12} /> Retry
                      </button>
                    </div>
                  ) : filteredTables.length === 0 ? (
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

          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0.25rem' }}>|</span>

          {/* Built-in Presets */}
          <button 
            className="btn" 
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}
            onClick={() => { setSelectedTable(''); setActiveSavedQueryName(null); setQuery(PAYMENT_QUERY); }}
          >
            Payments
          </button>
          <button 
            className="btn" 
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}
            onClick={() => { setSelectedTable(''); setActiveSavedQueryName(null); setQuery(OTP_QUERY); }}
          >
            OTP
          </button>

          {/* Saved Queries Pills */}
          {Object.keys(savedQueries).length > 0 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0.25rem' }}>|</span>
          )}

          {Object.entries(savedQueries).map(([name, q]) => {
            const isSelected = activeSavedQueryName === name;
            return (
              <div 
                key={name} 
                className="flex items-center" 
                style={{ 
                  background: isSelected ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255,255,255,0.05)', 
                  border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)', 
                  borderRadius: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <button 
                  className="btn" 
                  style={{ 
                    padding: '0.25rem 0.55rem', 
                    fontSize: '0.82rem', 
                    border: 'none', 
                    background: 'transparent',
                    color: isSelected ? '#60a5fa' : 'var(--text-primary)',
                    fontWeight: isSelected ? 600 : 400
                  }}
                  onClick={() => { 
                    setSelectedTable(''); 
                    setActiveSavedQueryName(name); 
                    setQuery(q); 
                  }}
                  title={q}
                >
                  {name}
                </button>
                <button 
                  onClick={(e) => deleteSavedQuery(name, e)}
                  style={{ 
                    padding: '0.25rem 0.45rem', 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--danger-color)', 
                    cursor: 'pointer', 
                    borderLeft: '1px solid var(--border-color)', 
                    opacity: 0.7 
                  }}
                  title={`Delete saved query "${name}"`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Query Text Area */}
        <textarea 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter your SQL query here or select a table / preset above..."
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

        {/* Bottom Bar: Query Status on Left, Actions (Save, Save As, Cancel, Run Query) on Bottom Right */}
        <div className="flex justify-between items-center flex-wrap gap-3" style={{ paddingTop: '0.25rem' }}>
          {/* Left Status */}
          <div className="flex items-center gap-2" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {activeSavedQueryName ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>Active Query:</span>
                <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>
                  {activeSavedQueryName}
                </span>
                {isCurrentQueryDirty && (
                  <span style={{ color: '#f59e0b', fontSize: '0.78rem', fontStyle: 'italic', fontWeight: 500 }}>
                    ● Unsaved changes
                  </span>
                )}
              </div>
            ) : selectedTable ? (
              <div className="flex items-center gap-1.5">
                <span>Table Explorer:</span>
                <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>
                  {selectedTable}
                </span>
              </div>
            ) : (
              <span style={{ fontStyle: 'italic' }}>
                {query.trim() ? 'New Query (Unsaved)' : 'New Query (Empty Pad)'}
              </span>
            )}
          </div>

          {/* Bottom Right Actions */}
          <div className="flex items-center gap-2">
            {/* Save Button */}
            <button
              type="button"
              className="btn"
              onClick={handleSave}
              disabled={!query.trim()}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: isCurrentQueryDirty ? 'var(--accent-color)' : 'var(--border-color)',
                color: isCurrentQueryDirty ? '#60a5fa' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title={activeSavedQueryName ? `Save changes to "${activeSavedQueryName}"` : "Save this query"}
            >
              <Save size={14} />
              Save
            </button>

            {/* Save As Button */}
            <button
              type="button"
              className="btn"
              onClick={handleSaveAs}
              disabled={!query.trim()}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Save as a new query preset"
            >
              <BookmarkPlus size={14} />
              Save As...
            </button>

            {loading && (
              <button 
                type="button"
                className="btn" 
                onClick={() => {
                  if (abortControllerRef.current) abortControllerRef.current.abort();
                }}
                style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', background: 'transparent', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
              >
                <XCircle size={15} /> Cancel
              </button>
            )}

            {/* Run Query Button */}
            <button 
              type="button"
              className="btn btn-primary" 
              onClick={runQuery}
              disabled={loading || !query.trim()}
              style={{ padding: '0.35rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {loading ? <Loader2 size={15} className="spinner" /> : <Play size={15} />}
              {loading ? 'Executing...' : 'Run Query'}
            </button>
          </div>
        </div>
      </div>

      {/* Error and Success Banners */}
      {error && (
        <div className="glass flex items-center gap-3" style={{ padding: '1rem 1.25rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', wordBreak: 'break-word' }}>
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div className="flex-col" style={{ flexGrow: 1 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Query Execution Error</span>
            <span style={{ fontSize: '0.85rem', marginTop: '2px', color: 'var(--text-primary)' }}>{error}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="glass flex items-center gap-2" style={{ padding: '0.85rem 1.25rem', borderColor: 'var(--success-color)', color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '0.85rem' }}>{successMsg}</span>
        </div>
      )}

      {/* Results Table */}
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
          
          <div className="db-results-scroll-container">
            {filteredData.length > 0 ? (
              <table className="db-results-table">
                <thead>
                  <tr>
                    {result.columns.map(col => (
                      <th key={col}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map(col => (
                        <td key={col}>
                          {renderCellContent(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No records match your filter criteria.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
