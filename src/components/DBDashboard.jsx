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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');
  const abortControllerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('db_env', environment);
  }, [environment]);

  useEffect(() => {
    localStorage.setItem('db_query', query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem('db_saved_queries', JSON.stringify(savedQueries));
  }, [savedQueries]);

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

    let retryCount = 0;
    while (true) {
      try {
        const res = await fetch('/db-api/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ environment, query, db_config: dbConfig }),
          signal: abortControllerRef.current.signal
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to execute query');
        }

        if (data.data) {
          setResult({ columns: data.columns, data: data.data });
        } else {
          setSuccessMsg(data.message);
        }
        
        // Success, break out of retry loop
        setError(null);
        break;
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Query execution cancelled.');
          break;
        }
        
        const msg = err.message || '';
        const isConnectionError = msg.includes('DPY-6005') || msg.includes('DPY-6000') || msg.includes('Listener refused connection');
        
        if (isConnectionError) {
          retryCount++;
          setError(`Database connection failed. Retrying... (Attempt ${retryCount})`);
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          setError(msg);
          break; // Break loop for non-retriable errors
        }
      }
    }
    setLoading(false);
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
            onClick={() => setQuery(PAYMENT_QUERY)}
          >
            Payments
          </button>
          <button 
            className="btn" 
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}
            onClick={() => setQuery(OTP_QUERY)}
          >
            OTP
          </button>

          {Object.entries(savedQueries).map(([name, q]) => (
            <div key={name} className="flex items-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <button 
                className="btn" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', border: 'none', background: 'transparent' }}
                onClick={() => setQuery(q)}
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
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No results found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
