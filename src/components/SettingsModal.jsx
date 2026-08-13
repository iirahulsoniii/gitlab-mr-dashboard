import React, { useState, useEffect, useRef } from 'react';
import { Settings, Check, X, Plus, Trash2, Download, Upload, FileJson, CheckCircle2, AlertCircle } from 'lucide-react';

const normalizeDbConfig = (cfg) => {
  if (!cfg) return { connections: [{ id: 'stage-1', name: 'Stage DB', environment: 'stage', user: '', password: '', dsn: '' }] };
  if (Array.isArray(cfg.connections)) return cfg;
  if (Array.isArray(cfg)) return { connections: cfg };
  const connections = [];
  if (cfg.stage && (cfg.stage.user || cfg.stage.dsn)) {
    connections.push({
      id: 'stage-default',
      name: 'Stage DB (Default)',
      environment: 'stage',
      user: cfg.stage.user || '',
      password: cfg.stage.password || '',
      dsn: cfg.stage.dsn || ''
    });
  }
  if (cfg.prod && (cfg.prod.user || cfg.prod.dsn)) {
    connections.push({
      id: 'prod-default',
      name: 'Production DB (Default)',
      environment: 'prod',
      user: cfg.prod.user || '',
      password: cfg.prod.password || '',
      dsn: cfg.prod.dsn || ''
    });
  }
  if (connections.length === 0) {
    connections.push({
      id: 'stage-1',
      name: 'Stage DB',
      environment: 'stage',
      user: '',
      password: '',
      dsn: ''
    });
  }
  return { ...cfg, connections };
};

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  instances, 
  onSaveInstances, 
  jiraConfig, 
  onSaveJiraConfig, 
  dbConfig, 
  onSaveDbConfig,
  onImportAll
}) {
  const [localInstances, setLocalInstances] = useState(
    instances.length > 0 ? instances : [{ id: Date.now(), name: 'GitLab', provider: 'gitlab', url: 'https://gitlab.com', token: '' }]
  );
  
  const [localJiraConfig, setLocalJiraConfig] = useState(
    jiraConfig || { email: '', token: '', bauTicket: 'CS-17557' }
  );

  const [localDbConfig, setLocalDbConfig] = useState(() => normalizeDbConfig(dbConfig));
  const [statusMessage, setStatusMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (instances && instances.length > 0) {
      setLocalInstances(instances);
    }
  }, [instances]);

  useEffect(() => {
    if (jiraConfig) {
      setLocalJiraConfig(jiraConfig);
    }
  }, [jiraConfig]);

  useEffect(() => {
    if (dbConfig) {
      setLocalDbConfig(normalizeDbConfig(dbConfig));
    }
  }, [dbConfig]);

  if (!isOpen) return null;

  const handleAdd = () => {
    setLocalInstances([...localInstances, { id: Date.now(), name: 'New Instance', provider: 'github', url: 'https://api.github.com', token: '' }]);
  };

  const handleRemove = (id) => {
    setLocalInstances(localInstances.filter(inst => inst.id !== id));
  };

  const handleChange = (id, field, value) => {
    setLocalInstances(localInstances.map(inst => {
      if (inst.id === id) {
        const updated = { ...inst, [field]: value };
        if (field === 'provider') {
          if (value === 'github' && inst.url === 'https://gitlab.com') updated.url = 'https://api.github.com';
          if (value === 'gitlab' && inst.url === 'https://api.github.com') updated.url = 'https://gitlab.com';
        }
        return updated;
      }
      return inst;
    }));
  };

  const handleAddDbConn = (env = 'stage') => {
    const newConn = {
      id: Date.now(),
      name: `${env === 'stage' ? 'Stage' : 'Prod'} DB ${localDbConfig.connections.length + 1}`,
      environment: env,
      user: '',
      password: '',
      dsn: ''
    };
    setLocalDbConfig(prev => ({
      ...prev,
      connections: [...(prev.connections || []), newConn]
    }));
  };

  const handleRemoveDbConn = (id) => {
    setLocalDbConfig(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== id)
    }));
  };

  const handleDbConnChange = (id, field, value) => {
    setLocalDbConfig(prev => ({
      ...prev,
      connections: prev.connections.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const handleExportConfig = () => {
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        gitInstances: localInstances,
        jiraConfig: localJiraConfig,
        dbConfig: localDbConfig,
        savedQueries: JSON.parse(localStorage.getItem('db_saved_queries') || '{}'),
        jiraHolidays: JSON.parse(localStorage.getItem('jira_holidays') || '[]'),
        plannedReleases: JSON.parse(localStorage.getItem('planned_releases_data') || '[]'),
        teamMembers: JSON.parse(localStorage.getItem('jira_team_members') || '[]')
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `gitlab-mr-dashboard-config-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'All configurations exported successfully to JSON file!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Export failed: ${err.message}` });
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const templateData = {
        version: '1.0',
        _description: 'GitLab MR & Operations Dashboard Configuration File',
        gitInstances: [
          {
            id: 1,
            name: 'GitLab Main',
            provider: 'gitlab',
            url: 'https://gitlab.com',
            token: 'glpat-your-token-here'
          },
          {
            id: 2,
            name: 'GitHub Org',
            provider: 'github',
            url: 'https://api.github.com',
            token: 'ghp_your_token_here'
          }
        ],
        jiraConfig: {
          email: 'your.name@omantel.om',
          token: 'your-jira-api-token',
          bauTicket: 'CS-17557'
        },
        dbConfig: {
          connections: [
            {
              id: 'stage-1',
              name: 'Stage DB',
              environment: 'stage',
              user: 'stage_user',
              password: 'stage_password',
              dsn: '10.0.0.1:1521/STAGE_SERVICE'
            },
            {
              id: 'prod-1',
              name: 'Production DB',
              environment: 'prod',
              user: 'prod_user',
              password: 'prod_password',
              dsn: '10.0.0.2:1521/PROD_SERVICE'
            }
          ]
        },
        savedQueries: {
          "Sample Query": "SELECT * FROM my_table FETCH FIRST 20 ROWS ONLY"
        },
        jiraHolidays: [
          {
            date: "2026-01-01",
            name: "New Year's Day"
          }
        ],
        plannedReleases: [],
        teamMembers: []
      };
      const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dashboard-config-template.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Template download failed: ${err.message}` });
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON format.');
        }

        let importedGit = null;
        let importedJira = null;
        let importedDb = null;
        let importedQueries = null;
        let importedHolidays = null;
        let importedReleases = null;
        const summaryParts = [];

        // Git instances detection
        if (Array.isArray(parsed.gitInstances) || Array.isArray(parsed['git-dashboard-instances']) || Array.isArray(parsed.instances)) {
          importedGit = parsed.gitInstances || parsed['git-dashboard-instances'] || parsed.instances;
        } else if (parsed.url && parsed.token) {
          importedGit = [{ id: Date.now(), name: 'Imported Git', provider: 'gitlab', url: parsed.url, token: parsed.token }];
        }

        if (importedGit && importedGit.length > 0) {
          setLocalInstances(importedGit);
          summaryParts.push(`${importedGit.length} Git instance(s)`);
        }

        // Jira config detection
        const rawJira = parsed.jiraConfig || parsed['jira-dashboard-config'] || parsed.jira;
        if (rawJira && typeof rawJira === 'object') {
          importedJira = {
            email: rawJira.email || '',
            token: rawJira.token || '',
            bauTicket: rawJira.bauTicket || 'CS-17557'
          };
          setLocalJiraConfig(importedJira);
          summaryParts.push('Jira credentials');
        }

        // DB config detection
        const rawDb = parsed.dbConfig || parsed['db-dashboard-config'] || parsed.db;
        if (rawDb) {
          importedDb = normalizeDbConfig(rawDb);
          setLocalDbConfig(importedDb);
          summaryParts.push(`${importedDb.connections?.length || 0} DB connection(s)`);
        }

        // Saved queries
        const rawQueries = parsed.savedQueries || parsed.db_saved_queries;
        if (rawQueries && typeof rawQueries === 'object') {
          importedQueries = rawQueries;
          summaryParts.push(`${Object.keys(rawQueries).length} saved queries`);
        }

        // Jira holidays
        const rawHolidays = parsed.jiraHolidays || parsed.jira_holidays;
        if (Array.isArray(rawHolidays)) {
          importedHolidays = rawHolidays;
          summaryParts.push(`${rawHolidays.length} holiday(s)`);
        }

        // Planned releases
        const rawReleases = parsed.plannedReleases || parsed.planned_releases_data;
        if (Array.isArray(rawReleases)) {
          importedReleases = rawReleases;
          summaryParts.push(`${rawReleases.length} planned release(s)`);
        }

        // Team members
        let importedTeam = null;
        const rawTeam = parsed.teamMembers || parsed.jira_team_members || parsed.team;
        if (Array.isArray(rawTeam)) {
          importedTeam = rawTeam;
          summaryParts.push(`${rawTeam.length} team member(s)`);
        }

        if (summaryParts.length === 0) {
          throw new Error('No recognizable configurations or data found in the JSON file.');
        }

        // Propagate to parent & localStorage
        if (onImportAll) {
          onImportAll({
            gitInstances: importedGit,
            jiraConfig: importedJira,
            dbConfig: importedDb,
            savedQueries: importedQueries,
            jiraHolidays: importedHolidays,
            plannedReleases: importedReleases,
            teamMembers: importedTeam
          });
        } else {
          if (importedGit) onSaveInstances(importedGit);
          if (importedJira) onSaveJiraConfig(importedJira);
          if (importedDb) onSaveDbConfig(importedDb);
          if (importedQueries) localStorage.setItem('db_saved_queries', JSON.stringify(importedQueries));
          if (importedHolidays) localStorage.setItem('jira_holidays', JSON.stringify(importedHolidays));
          if (importedReleases) localStorage.setItem('planned_releases_data', JSON.stringify(importedReleases));
          if (importedTeam) localStorage.setItem('jira_team_members', JSON.stringify(importedTeam));
        }

        setStatusMessage({
          type: 'success',
          text: `Backup imported successfully! (Restored: ${summaryParts.join(', ')})`
        });
      } catch (err) {
        setStatusMessage({
          type: 'error',
          text: `Import failed: ${err.message}`
        });
      }
    };
    reader.readAsText(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveInstances(localInstances);
    onSaveJiraConfig(localJiraConfig);
    onSaveDbConfig(localDbConfig);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
          <h2 className="flex items-center gap-2">
            <Settings size={24} /> Configuration
          </h2>
          {instances.length > 0 && instances.some(i => i.token) && (
            <button className="btn" onClick={onClose} style={{ padding: '0.25rem' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div 
            className="flex items-center justify-between" 
            style={{ 
              padding: '0.75rem 1rem', 
              borderRadius: '8px', 
              marginBottom: '1.25rem',
              backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${statusMessage.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`,
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={18} color="var(--success-color)" />
              ) : (
                <AlertCircle size={18} color="var(--danger-color)" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setStatusMessage(null)} 
              style={{ background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Backup & Restore Card */}
        <div 
          className="glass" 
          style={{ 
            padding: '1.25rem', 
            borderRadius: '10px', 
            marginBottom: '1.5rem', 
            border: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))' 
          }}
        >
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-hover)' }}>
              <FileJson size={18} /> Backup & Restore (JSON)
            </h3>
          </div>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Export all tokens, DB details, Jira credentials, and queries to a JSON file to easily transfer or restore them across any browser.
          </p>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json,application/json" 
            style={{ display: 'none' }} 
          />

          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={handleExportConfig} 
              className="btn btn-primary"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
            >
              <Download size={16} /> Export All Settings (JSON)
            </button>

            <button 
              type="button" 
              onClick={handleImportClick} 
              className="btn"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', borderColor: 'var(--accent-color)' }}
            >
              <Upload size={16} /> Import from JSON File
            </button>

            <button 
              type="button" 
              onClick={handleDownloadTemplate} 
              className="btn"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', background: 'transparent' }}
              title="Download sample template JSON"
            >
              <FileJson size={16} /> Sample Template
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSave} className="flex-col gap-6">
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>Git Instances</h3>
          {localInstances.map((inst, index) => (
            <div key={inst.id} className="glass" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>{inst.name || `Instance ${index + 1}`}</h4>
                {localInstances.length > 1 && (
                  <button type="button" onClick={() => handleRemove(inst.id)} style={{ color: 'var(--danger-color)', background: 'transparent' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="flex-col gap-2">
                  <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Name</label>
                  <input className="w-full" type="text" value={inst.name} onChange={(e) => handleChange(inst.id, 'name', e.target.value)} required />
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Provider</label>
                  <select className="w-full" value={inst.provider} onChange={(e) => handleChange(inst.id, 'provider', e.target.value)}>
                    <option value="gitlab">GitLab</option>
                    <option value="github">GitHub</option>
                  </select>
                </div>

                <div className="flex-col gap-2">
                  <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Base API URL</label>
                  <input className="w-full" type="url" value={inst.url} onChange={(e) => handleChange(inst.id, 'url', e.target.value)} required />
                </div>

                <div className="flex-col gap-2">
                  <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Access Token</label>
                  <input className="w-full" type="password" value={inst.token} onChange={(e) => handleChange(inst.id, 'token', e.target.value)} required placeholder={inst.provider === 'github' ? 'ghp_...' : 'glpat_...'} />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={handleAdd} className="btn" style={{ borderStyle: 'dashed', justifyContent: 'center' }}>
            <Plus size={18} /> Add Another Git Instance
          </button>
          
          <h3 style={{ marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Jira Configuration</h3>
          
          <div className="glass" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="flex-col gap-2">
                <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Jira Email</label>
                <input className="w-full" type="email" value={localJiraConfig.email} onChange={(e) => setLocalJiraConfig({...localJiraConfig, email: e.target.value})} placeholder="e.g. rahul.soni@omantel.om" />
              </div>
              <div className="flex-col gap-2">
                <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Jira API Token</label>
                <input className="w-full" type="password" value={localJiraConfig.token} onChange={(e) => setLocalJiraConfig({...localJiraConfig, token: e.target.value})} placeholder="ATATT3..." />
              </div>
              <div className="flex-col gap-2">
                <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>BAU Ticket ID</label>
                <input className="w-full" type="text" value={localJiraConfig.bauTicket} onChange={(e) => setLocalJiraConfig({...localJiraConfig, bauTicket: e.target.value})} placeholder="e.g. CS-17557" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center" style={{ marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Database Connections ({localDbConfig.connections?.length || 0})</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleAddDbConn('stage')} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                <Plus size={14} /> + Stage DB
              </button>
              <button type="button" onClick={() => handleAddDbConn('prod')} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
                <Plus size={14} /> + Prod DB
              </button>
            </div>
          </div>
          
          {localDbConfig.connections?.map((conn, idx) => (
            <div key={conn.id || idx} className="glass" style={{ padding: '1rem', border: `1px solid ${conn.environment === 'prod' ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`, borderRadius: '8px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                <div className="flex items-center gap-2">
                  <span className="tag" style={{ background: conn.environment === 'prod' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: conn.environment === 'prod' ? '#ef4444' : '#60a5fa', fontWeight: 600 }}>
                    {conn.environment?.toUpperCase() || 'STAGE'}
                  </span>
                  <input 
                    type="text" 
                    value={conn.name} 
                    onChange={e => handleDbConnChange(conn.id, 'name', e.target.value)} 
                    placeholder="e.g. Stage - Payments DB"
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', padding: '0.2rem 0.4rem' }}
                    required
                  />
                </div>

                {localDbConfig.connections.length > 1 && (
                  <button type="button" onClick={() => handleRemoveDbConn(conn.id)} style={{ color: 'var(--danger-color)', background: 'transparent', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="flex-col gap-1">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Environment</label>
                  <select className="w-full" value={conn.environment || 'stage'} onChange={e => handleDbConnChange(conn.id, 'environment', e.target.value)}>
                    <option value="stage">Stage</option>
                    <option value="prod">Production</option>
                  </select>
                </div>

                <div className="flex-col gap-1">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Username</label>
                  <input className="w-full" type="text" value={conn.user || ''} onChange={e => handleDbConnChange(conn.id, 'user', e.target.value)} placeholder="Database User" />
                </div>

                <div className="flex-col gap-1">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Password</label>
                  <input className="w-full" type="password" value={conn.password || ''} onChange={e => handleDbConnChange(conn.id, 'password', e.target.value)} placeholder="••••••••" />
                </div>

                <div className="flex-col gap-1">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>DSN (Host:Port/Service)</label>
                  <input className="w-full" type="text" value={conn.dsn || ''} onChange={e => handleDbConnChange(conn.id, 'dsn', e.target.value)} placeholder="host:port/service_name" />
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              <Check size={18} /> Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
