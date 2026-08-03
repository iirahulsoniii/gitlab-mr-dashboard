import React, { useState, useEffect, useMemo } from 'react';
import SettingsModal from './components/SettingsModal';
import FilterPanel from './components/FilterPanel';
import MRList from './components/MRList';
import JiraList from './components/JiraList';
import JiraWorklogDashboard from './components/JiraWorklogDashboard';
import DBDashboard from './components/DBDashboard';
import JiraIssuesDashboard from './components/JiraIssuesDashboard';
import { Settings, Database, ListFilter, FileText, CalendarClock, Code2, CheckSquare } from 'lucide-react';
import { fetchMergeRequests } from './api';

const DEFAULT_FILTERS = {
  author: '',
  mergedBy: '',
  status: 'all',
  service: 'all',
  branch: ''
};

function App() {
  const [instances, setInstances] = useState(() => {
    const saved = localStorage.getItem('git-dashboard-instances');
    if (saved) return JSON.parse(saved);
    const oldConfig = localStorage.getItem('gitlab-mr-config');
    if (oldConfig) {
      const parsed = JSON.parse(oldConfig);
      return [{ id: Date.now(), name: 'GitLab', provider: 'gitlab', url: parsed.url, token: parsed.token }];
    }
    return [];
  });
  
  const [jiraConfig, setJiraConfig] = useState(() => {
    const saved = localStorage.getItem('jira-dashboard-config');
    if (saved) return JSON.parse(saved);
    return { email: '', token: '', bauTicket: 'CS-17557' };
  });

  const [dbConfig, setDbConfig] = useState(() => {
    const saved = localStorage.getItem('db-dashboard-config');
    if (saved) return JSON.parse(saved);
    return { 
      stage: { user: '', password: '', dsn: '' }, 
      prod: { user: '', password: '', dsn: '' } 
    };
  });

  const [activeView, setActiveView] = useState('mr'); // 'mr', 'jira', 'db', or 'jira-issues'
  const [activeInstanceId, setActiveInstanceId] = useState(instances.length > 0 ? instances[0].id : null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(instances.length === 0);
  const [mrs, setMrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [timeframe, setTimeframe] = useState('30d');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  
  const [activeTab, setActiveTab] = useState('mrs'); // 'mrs' or 'jira'

  const activeInstance = useMemo(() => instances.find(i => i.id === activeInstanceId), [instances, activeInstanceId]);

  // Load shallow data on mount or when instance/timeframe changes
  useEffect(() => {
    if (activeInstance && activeInstance.token) {
      loadData(false);
    }
  }, [activeInstance, timeframe]);

  const loadData = async (deepSearch) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMergeRequests(activeInstance, timeframe, deepSearch);
      setMrs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData(true);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    loadData(false);
  };

  const handleSaveInstances = (newInstances) => {
    setInstances(newInstances);
    localStorage.setItem('git-dashboard-instances', JSON.stringify(newInstances));
    if (newInstances.length > 0 && !newInstances.find(i => i.id === activeInstanceId)) {
      setActiveInstanceId(newInstances[0].id);
    }
  };

  const handleSaveJiraConfig = (config) => {
    setJiraConfig(config);
    localStorage.setItem('jira-dashboard-config', JSON.stringify(config));
    setIsSettingsOpen(false);
  };

  const handleSaveDbConfig = (config) => {
    setDbConfig(config);
    localStorage.setItem('db-dashboard-config', JSON.stringify(config));
    setIsSettingsOpen(false);
  };

  const normalizeForSearch = (str) => str ? str.toLowerCase().replace(/\s+/g, '') : '';

  // Calculate available services based on ALL filters EXCEPT the 'service' filter
  const availableServices = useMemo(() => {
    const filteredForServices = mrs.filter(mr => {
      if (filters.author && mr.author) {
        const query = normalizeForSearch(filters.author);
        const matchName = mr.author.name && normalizeForSearch(mr.author.name).includes(query);
        const matchUsername = mr.author.username && normalizeForSearch(mr.author.username).includes(query);
        if (!matchName && !matchUsername) return false;
      }
      if (filters.mergedBy) {
        if (!mr.merged_by) return false;
        const query = normalizeForSearch(filters.mergedBy);
        const matchName = mr.merged_by.name && normalizeForSearch(mr.merged_by.name).includes(query);
        const matchUsername = mr.merged_by.username && normalizeForSearch(mr.merged_by.username).includes(query);
        if (!matchName && !matchUsername) return false;
      }
      if (filters.status !== 'all' && mr.state !== filters.status) return false;
      if (filters.branch) {
        const query = filters.branch.toLowerCase();
        if (!mr.source_branch.toLowerCase().includes(query) && !mr.target_branch.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });

    const unique = new Map();
    filteredForServices.forEach(mr => {
      if (mr.project_name) {
        unique.set(mr.project_id, { id: mr.project_id, name: mr.project_name });
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [mrs, filters.author, filters.mergedBy, filters.status, filters.branch]);

  // Apply all filters for the final MR list
  const filteredMRs = useMemo(() => {
    return mrs.filter(mr => {
      if (filters.author && mr.author) {
        const query = normalizeForSearch(filters.author);
        const matchName = mr.author.name && normalizeForSearch(mr.author.name).includes(query);
        const matchUsername = mr.author.username && normalizeForSearch(mr.author.username).includes(query);
        if (!matchName && !matchUsername) return false;
      }
      if (filters.mergedBy) {
        if (!mr.merged_by) return false;
        const query = normalizeForSearch(filters.mergedBy);
        const matchName = mr.merged_by.name && normalizeForSearch(mr.merged_by.name).includes(query);
        const matchUsername = mr.merged_by.username && normalizeForSearch(mr.merged_by.username).includes(query);
        if (!matchName && !matchUsername) return false;
      }
      if (filters.status !== 'all' && mr.state !== filters.status) return false;
      if (filters.service !== 'all' && mr.project_name !== filters.service) return false;
      if (filters.branch) {
        const query = filters.branch.toLowerCase();
        if (!mr.source_branch.toLowerCase().includes(query) && !mr.target_branch.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [mrs, filters]);

  // Extract Jira Tickets from filtered MRs
  const jiraTickets = useMemo(() => {
    const tickets = new Map();
    // Regex matches uppercase letters followed by a dash and numbers, e.g. CS-334343
    const regex = /([A-Z]+-\d+)/g;
    
    filteredMRs.forEach(mr => {
      const matches = mr.title.match(regex);
      if (matches) {
        matches.forEach(ticketId => {
          if (!tickets.has(ticketId)) {
            tickets.set(ticketId, { id: ticketId, mrs: [] });
          }
          // Avoid pushing duplicate MRs if ticket is mentioned multiple times
          const ticketData = tickets.get(ticketId);
          if (!ticketData.mrs.find(m => m.id === mr.id)) {
            ticketData.mrs.push(mr);
          }
        });
      }
    });
    return Array.from(tickets.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [filteredMRs]);

  const selectStyle = {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='var(--accent-color)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.25rem center',
    backgroundSize: '1em',
    paddingRight: '1.5rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--accent-color)',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
    outline: 'none'
  };

  const tabStyle = (isActive) => ({
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    borderBottom: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: isActive ? 600 : 500,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease'
  });

  return (
    <div className="container">
      <div className="flex justify-center" style={{ marginBottom: '2rem' }}>
        <div className="glass flex" style={{ padding: '0.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>
          <button 
            className="btn" 
            style={{ border: 'none', background: activeView === 'mr' ? 'var(--surface-color-light)' : 'transparent', color: activeView === 'mr' ? 'var(--accent-color)' : 'var(--text-secondary)' }}
            onClick={() => setActiveView('mr')}
          >
            <Code2 size={18} /> MR Dashboard
          </button>
          <button 
            className="btn" 
            style={{ border: 'none', background: activeView === 'jira' ? 'var(--surface-color-light)' : 'transparent', color: activeView === 'jira' ? 'var(--accent-color)' : 'var(--text-secondary)' }}
            onClick={() => setActiveView('jira')}
          >
            <CalendarClock size={18} /> Worklog Dashboard
          </button>
          <button 
            className="btn" 
            style={{ border: 'none', background: activeView === 'jira-issues' ? 'var(--surface-color-light)' : 'transparent', color: activeView === 'jira-issues' ? 'var(--accent-color)' : 'var(--text-secondary)' }}
            onClick={() => setActiveView('jira-issues')}
          >
            <CheckSquare size={18} /> Jira Issues
          </button>
          <button 
            className="btn" 
            style={{ border: 'none', background: activeView === 'db' ? 'var(--surface-color-light)' : 'transparent', color: activeView === 'db' ? 'var(--accent-color)' : 'var(--text-secondary)' }}
            onClick={() => setActiveView('db')}
          >
            <Database size={18} /> Database Dashboard
          </button>
        </div>
      </div>

      <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div className="flex-col gap-2">
          <h1 style={{ margin: 0, background: 'linear-gradient(45deg, var(--accent-color), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {activeView === 'mr' ? 'Merge Request Dashboard' : activeView === 'jira' ? 'Jira Worklog Dashboard' : activeView === 'jira-issues' ? 'Jira Assigned Issues' : 'Database Dashboard'}
          </h1>
          
          {activeView === 'mr' && instances.length > 0 && (
            <div className="flex items-center gap-2">
              <Database size={18} />
              <select 
                value={activeInstanceId || ''} 
                onChange={(e) => setActiveInstanceId(Number(e.target.value))}
                style={selectStyle}
              >
                {instances.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name} ({inst.provider})</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <button className="btn" onClick={() => setIsSettingsOpen(true)}>
          <Settings size={18} /> Settings
        </button>
      </header>

      {error && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger-color)', color: 'var(--text-primary)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {activeView === 'mr' ? (
        !isSettingsOpen && activeInstance && (
          <>
            <FilterPanel 
              filters={filters} 
              setFilters={setFilters} 
              services={availableServices} 
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              onSearch={handleSearch}
              onReset={handleReset}
            />

            <div className="flex gap-4" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={tabStyle(activeTab === 'mrs')} onClick={() => setActiveTab('mrs')}>
                <ListFilter size={18} /> Merge Requests ({filteredMRs.length})
              </div>
              <div style={tabStyle(activeTab === 'jira')} onClick={() => setActiveTab('jira')}>
                <FileText size={18} /> Jira Tickets ({jiraTickets.length})
              </div>
            </div>

            {activeTab === 'mrs' ? (
              <MRList mrs={filteredMRs} loading={loading} />
            ) : (
              <JiraList tickets={jiraTickets} />
            )}
          </>
        )
      ) : activeView === 'jira' ? (
        <JiraWorklogDashboard config={jiraConfig} />
      ) : activeView === 'jira-issues' ? (
        <JiraIssuesDashboard config={jiraConfig} />
      ) : (
        <DBDashboard dbConfig={dbConfig} />
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSaveInstances={handleSaveInstances}
        instances={instances}
        jiraConfig={jiraConfig}
        onSaveJiraConfig={handleSaveJiraConfig}
        dbConfig={dbConfig}
        onSaveDbConfig={handleSaveDbConfig}
      />
    </div>
  );
}

export default App;
