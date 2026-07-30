import React, { useState, useEffect, useMemo } from 'react';
import { fetchAssignedIssues } from '../jiraApi';
import { RefreshCcw, Loader2, AlertCircle } from 'lucide-react';
import '../jira.css';

export default function JiraIssuesDashboard({ config }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [daysFilter, setDaysFilter] = useState(30);
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    if (config.email && config.token) {
      loadData();
    } else {
      setError('Please configure Jira Email and Token in Settings.');
    }
  }, [config, daysFilter]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAssignedIssues(config, daysFilter);
      setIssues(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = useMemo(() => {
    if (priorityFilter === 'all') return issues;
    return issues.filter(i => i.fields?.priority?.name === priorityFilter);
  }, [issues, priorityFilter]);

  const priorities = useMemo(() => {
    const p = new Set(issues.map(i => i.fields?.priority?.name).filter(Boolean));
    return Array.from(p).sort();
  }, [issues]);

  const getPriorityColor = (name) => {
    const n = name?.toLowerCase() || '';
    if (n.includes('highest') || n.includes('critical')) return 'var(--danger-color)';
    if (n.includes('high')) return '#f97316';
    if (n.includes('medium')) return 'var(--warning-color)';
    if (n.includes('low')) return 'var(--info-color)';
    return 'var(--text-secondary)';
  };

  if (error) {
    return (
      <div className="glass" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--danger-color)' }}>
        <h3 style={{ color: 'var(--danger-color)' }}>Error Loading Issues</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-col gap-6" style={{ marginTop: '1rem' }}>
      <div className="flex justify-between items-center glass" style={{ padding: '1rem 1.5rem' }}>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Updated in last: 
            <select className="btn" value={daysFilter} onChange={(e) => setDaysFilter(Number(e.target.value))}>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
          
          <div className="flex gap-2 items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Priority:
            <select className="btn" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        
        <button className="btn" onClick={loadData} disabled={loading}>
          <RefreshCcw size={16} className={loading ? 'spinner' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading && issues.length === 0 ? (
        <div className="flex justify-center items-center" style={{ padding: '4rem' }}>
          <Loader2 className="spinner" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : (
        <div className="flex-col gap-4">
          {filteredIssues.length === 0 ? (
            <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No assigned issues found for the selected criteria.
            </div>
          ) : (
            filteredIssues.map(issue => (
              <div key={issue.key} className="glass ticket-card" style={{ padding: '1.25rem 1.5rem', cursor: 'pointer' }} onClick={() => window.open(`https://omantel-om.atlassian.net/browse/${issue.key}`, '_blank')}>
                <div className="flex-col gap-2" style={{ flexGrow: 1 }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{issue.key}</span>
                      <span className="tag" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>{issue.fields?.status?.name}</span>
                      <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${getPriorityColor(issue.fields?.priority?.name)}`, color: getPriorityColor(issue.fields?.priority?.name) }}>
                        {issue.fields?.priority?.name || 'No Priority'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Updated: {new Date(issue.fields?.updated).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.25rem' }}>
                    {issue.fields?.summary}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', opacity: 0.7 }}>
                    Type: {issue.fields?.issuetype?.name} | Created: {new Date(issue.fields?.created).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
