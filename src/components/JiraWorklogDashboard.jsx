import React, { useState, useEffect } from 'react';
import { fetchJiraData, logJiraHours, fetchJiraIssue } from '../jiraApi';
import { RefreshCcw, Loader2, Search, CalendarOff, CalendarHeart } from 'lucide-react';
import '../jira.css';

export default function JiraWorklogDashboard({ config }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [daysFilter, setDaysFilter] = useState(30);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  
  // Track logging state per ticket: { [dateStr_ticketId]: { comment: '', hours: '', logging: false, success: false } }
  const [logForms, setLogForms] = useState({});
  const [holidays, setHolidays] = useState(() => JSON.parse(localStorage.getItem('jira_holidays') || '[]'));

  useEffect(() => {
    localStorage.setItem('jira_holidays', JSON.stringify(holidays));
  }, [holidays]);

  const toggleHoliday = (dateStr) => {
    setHolidays(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

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
      const res = await fetchJiraData(config, daysFilter);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateLogForm = (key, field, value) => {
    setLogForms(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { comment: '', hours: '' }), [field]: value }
    }));
  };

  const handleLogHours = async (dateStr, ticket) => {
    const formKey = `${dateStr}_${ticket.issue_key}`;
    const form = logForms[formKey] || {};
    const hours = parseFloat(form.hours);

    if (isNaN(hours) || hours <= 0) {
      alert("Please enter a valid number of hours.");
      return;
    }

    updateLogForm(formKey, 'logging', true);
    
    try {
      await logJiraHours(config, ticket.issue_key, dateStr, hours, form.comment);
      
      // Optimistically update the UI to instantly reflect the logged hours
      setData(prevData => {
        if (!prevData) return prevData;
        const newDays = prevData.days.map(d => {
          if (d.date === dateStr) {
            const newTickets = d.tickets.map(t => {
              if (t.issue_key === ticket.issue_key) {
                return { ...t, hours: t.hours + hours, actions: Array.from(new Set([...t.actions, 'Logged Hours'])) };
              }
              return t;
            });
            // Re-sort tickets so the one with most hours is on top
            newTickets.sort((a, b) => b.hours - a.hours);
            return { ...d, total_hours: d.total_hours + hours, tickets: newTickets };
          }
          return d;
        });
        const newSummary = { ...prevData.summary, total_hours: prevData.summary.total_hours + hours };
        return { ...prevData, days: newDays, summary: newSummary };
      });
      
      updateLogForm(formKey, 'success', true);
      // Quickly reset form
      setTimeout(() => {
        setLogForms(prev => {
          const next = {...prev};
          delete next[formKey];
          return next;
        });
        // We no longer strictly need loadData() since we updated local state, but calling it keeps us in sync
        loadData();
      }, 1500);
    } catch (err) {
      alert(err.message);
      updateLogForm(formKey, 'logging', false);
    }
  };

  const manuallyAddTicket = async (dateStr) => {
    const issueKey = window.prompt("Enter the Jira Ticket ID (e.g. CS-12345):");
    if (!issueKey) return;
    
    try {
      const result = await fetchJiraIssue(config, issueKey);
      
      setData(prevData => {
        if (!prevData) return prevData;
        const newDays = prevData.days.map(d => {
          if (d.date === dateStr) {
            // Check if it already exists
            if (!d.tickets.some(t => t.issue_key === issueKey)) {
              const newTicket = {
                issue_key: issueKey,
                hours: 0,
                summary: result.summary,
                actions: ["Manually Added"]
              };
              return { ...d, tickets: [newTicket, ...d.tickets] };
            }
          }
          return d;
        });
        return { ...prevData, days: newDays };
      });
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) {
    return (
      <div className="glass" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--danger-color)' }}>
        <h3 style={{ color: 'var(--danger-color)' }}>Error Loading Jira</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data && loading) {
    return (
      <div className="flex justify-center items-center" style={{ padding: '4rem' }}>
        <Loader2 className="spinner" size={32} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  if (!data) return null;

  let activeDaysCount = 0;
  let ticketsTouchedCount = 0;

  const filteredDays = data.days.filter(day => {
    const trueActivity = day.tickets.filter(t => t.hours > 0 || !t.actions.includes("Pinned"));
    if (trueActivity.length > 0) {
      activeDaysCount++;
      trueActivity.forEach(t => { if (t.hours === 0) ticketsTouchedCount++; });
    }

    if (showMissingOnly) {
      if (day.is_weekend || holidays.includes(day.date) || day.total_hours >= 8) return false;
    }
    return true;
  });

  return (
    <div className="flex-col gap-6">
      <div className="flex justify-between items-center glass" style={{ padding: '1rem 1.5rem' }}>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Timeframe: 
            <select className="btn" value={daysFilter} onChange={(e) => setDaysFilter(Number(e.target.value))}>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
          
          <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
            <input 
              type="checkbox" 
              checked={showMissingOnly}
              onChange={(e) => setShowMissingOnly(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            Show Missing Hours Only
          </label>
        </div>
        
        <button className="btn" onClick={loadData} disabled={loading}>
          <RefreshCcw size={16} className={loading ? 'spinner' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Hours</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success-color)' }}>{data.summary.total_hours}h</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tickets Touched</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--info-color)' }}>{ticketsTouchedCount}</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Days</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{activeDaysCount} / {data.days.length}</div>
        </div>
      </div>

      <div className="timeline">
        {filteredDays.map(day => {
          const dateObj = new Date(day.date);
          const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const hasActivity = day.tickets.some(t => t.hours > 0 || !t.actions.includes("Pinned"));
          
          return (
            <div key={day.date} className="day-block">
              <div className={`day-date ${day.is_weekend ? 'weekend' : ''} ${holidays.includes(day.date) ? 'holiday' : ''} ${hasActivity ? 'has-activity' : ''}`}>
                <div className="date-text">{formattedDate}</div>
                <div className="date-subtext">
                  {day.is_weekend ? 'Weekend' : ''}
                  {holidays.includes(day.date) ? (day.is_weekend ? ' • Holiday' : 'Holiday') : ''}
                </div>
                <div className="date-actions">
                  <button className="add-ticket-btn" onClick={() => manuallyAddTicket(day.date)}>
                    + Add Ticket
                  </button>
                  {!day.is_weekend && (
                    <button 
                      className={`holiday-btn ${holidays.includes(day.date) ? 'is-holiday' : ''}`}
                      onClick={() => toggleHoliday(day.date)}
                    >
                      {holidays.includes(day.date) ? 'Remove Holiday' : 'Mark as Holiday'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="day-content">
                <div className="ticket-list">
                  {day.tickets.map(ticket => {
                    const formKey = `${day.date}_${ticket.issue_key}`;
                    const form = logForms[formKey] || {};
                    const hasHours = ticket.hours > 0;
                    
                    return (
                      <div key={ticket.issue_key} className="glass ticket-card">
                        <div className="ticket-main-info" onClick={() => window.open(`https://omantel-om.atlassian.net/browse/${ticket.issue_key}`, '_blank')}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{ticket.issue_key}</span>
                            <div className="ticket-tags">
                              {ticket.actions.map(a => {
                                let c = 'touched';
                                if (a === 'Logged Hours') c = 'logged';
                                if (a === 'Pinned') c = 'pinned';
                                return <span key={a} className={`tag ${c}`}>{a}</span>
                              })}
                            </div>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>{ticket.summary}</div>
                        </div>
                        
                        <div className="ticket-actions-area">
                          <div className="ticket-hours">
                            <div className={`hours-value ${hasHours ? 'has-hours' : 'no-hours'}`}>{ticket.hours.toFixed(2)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hours</div>
                          </div>
                          <div className="log-time-form" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="text" 
                              placeholder="Comment (optional)" 
                              value={form.comment || ''}
                              onChange={e => updateLogForm(formKey, 'comment', e.target.value)}
                              style={{ width: '130px', padding: '0.35rem' }}
                            />
                            <input 
                              type="number" 
                              placeholder="0.0" 
                              min="0.1" 
                              step="0.1" 
                              value={form.hours || ''}
                              onChange={e => updateLogForm(formKey, 'hours', e.target.value)}
                              style={{ width: '60px', padding: '0.35rem' }}
                            />
                            <button 
                              className="btn btn-primary" 
                              onClick={() => handleLogHours(day.date, ticket)}
                              disabled={form.logging || form.success}
                              style={{ padding: '0.35rem 0.75rem' }}
                            >
                              {form.logging ? <Loader2 size={14} className="spinner" /> : form.success ? '✓' : 'Log'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {day.total_hours > 0 && (
                  <div className="day-summary-row">
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Total for {formattedDate}</div>
                    <div style={{ fontWeight: 700, color: 'var(--success-color)', fontSize: '1.1rem' }}>{day.total_hours.toFixed(2)}h</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
