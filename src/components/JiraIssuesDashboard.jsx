import React, { useState, useEffect, useMemo } from 'react';
import { fetchAssignedIssues } from '../jiraApi';
import { RefreshCcw, Loader2, AlertCircle, User } from 'lucide-react';
import '../jira.css';

export default function JiraIssuesDashboard({ config }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [assigneeScope, setAssigneeScope] = useState('my'); // 'my', 'all', 'unassigned', 'custom'
  const [assignee, setAssignee] = useState('');
  const [daysFilter, setDaysFilter] = useState(30);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [fixVersionFilter, setFixVersionFilter] = useState('all');
  const [includeClosed, setIncludeClosed] = useState(false);

  useEffect(() => {
    if (config.email && config.token) {
      loadData();
    } else {
      setError('Please configure Jira Email and Token in Settings.');
    }
  }, [config, daysFilter, includeClosed, assigneeScope]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAssignedIssues(config, daysFilter, assignee, includeClosed, assigneeScope);
      setIssues(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      const matchesPriority = priorityFilter === 'all' || i.fields?.priority?.name === priorityFilter;
      const matchesFixVersion = fixVersionFilter === 'all' || (
        fixVersionFilter === 'none' 
          ? (!i.fields?.fixVersions || i.fields.fixVersions.length === 0)
          : i.fields?.fixVersions?.some(v => v.name === fixVersionFilter)
      );
      return matchesPriority && matchesFixVersion;
    });
  }, [issues, priorityFilter, fixVersionFilter]);

  const priorities = useMemo(() => {
    const p = new Set(issues.map(i => i.fields?.priority?.name).filter(Boolean));
    return Array.from(p).sort();
  }, [issues]);

  const fixVersions = useMemo(() => {
    const versions = new Set();
    issues.forEach(i => {
      i.fields?.fixVersions?.forEach(v => {
        if (v.name) versions.add(v.name);
      });
    });
    return Array.from(versions).sort();
  }, [issues]);

  const getPriorityColor = (name) => {
    const n = name?.toLowerCase() || '';
    if (n.includes('highest') || n.includes('critical') || n === 'p0' || n === 'p1') return 'var(--danger-color)';
    if (n.includes('high') || n === 'p2') return '#f97316';
    if (n.includes('medium') || n === 'p3') return 'var(--warning-color)';
    if (n.includes('low') || n === 'p4') return 'var(--info-color)';
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
      <div className="flex justify-between items-center glass" style={{ padding: '1rem 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex gap-4 items-center" style={{ flexWrap: 'wrap' }}>
          {/* Assignee Scope Selector */}
          <div className="flex gap-2 items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Assignee:
            <select 
              className="btn" 
              value={assigneeScope} 
              onChange={(e) => {
                setAssigneeScope(e.target.value);
                if (e.target.value !== 'custom') {
                  setAssignee('');
                }
              }}
            >
              <option value="my">Assigned to Me</option>
              <option value="all">All Users (Anyone)</option>
              <option value="unassigned">Unassigned Only</option>
              <option value="custom">Specific Person...</option>
            </select>
          </div>

          {/* Search box when specific person selected */}
          {assigneeScope === 'custom' && (
            <div className="flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <User size={16} style={{ color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Enter exact full name..." 
                value={assignee}
                autoFocus
                onChange={e => setAssignee(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadData()}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '200px', fontSize: '0.85rem' }}
              />
              <button 
                type="button" 
                onClick={loadData} 
                className="btn" 
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'var(--accent-color)', color: '#fff', border: 'none' }}
              >
                Search
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Updated in last: 
            <select className="btn" value={daysFilter} onChange={(e) => setDaysFilter(Number(e.target.value))}>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>
          
          <div className="flex gap-2 items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Priority:
            <select className="btn" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex gap-2 items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Fix Version:
            <select className="btn" value={fixVersionFilter} onChange={(e) => setFixVersionFilter(e.target.value)}>
              <option value="all">All Versions</option>
              <option value="none">No Version</option>
              {fixVersions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={includeClosed} 
              onChange={e => setIncludeClosed(e.target.checked)} 
            />
            Include Closed/Done
          </label>
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
              No issues found for the selected criteria.
            </div>
          ) : (
            filteredIssues.map(issue => (
              <div key={issue.key} className="glass ticket-card" style={{ padding: '1.25rem 1.5rem', cursor: 'pointer' }} onClick={() => window.open(`https://omantel-om.atlassian.net/browse/${issue.key}`, '_blank')}>
                <div className="flex-col gap-2" style={{ flexGrow: 1 }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{issue.key}</span>
                      <span className="tag" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>{issue.fields?.status?.name}</span>
                      
                      {/* Assignee Badge */}
                      <span className="tag" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <User size={12} style={{ color: 'var(--accent-color)' }} />
                        {issue.fields?.assignee?.displayName || 'Unassigned'}
                      </span>

                      <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${getPriorityColor(issue.fields?.priority?.name)}`, color: getPriorityColor(issue.fields?.priority?.name) }}>
                        {issue.fields?.priority?.name || 'No Priority'}
                      </span>
                      {issue.fields?.fixVersions?.map(v => (
                        <span key={v.id || v.name} className="tag" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}>
                          v: {v.name}
                        </span>
                      ))}
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
