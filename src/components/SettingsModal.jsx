import React, { useState } from 'react';
import { Settings, Check, X, Plus, Trash2 } from 'lucide-react';

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

export default function SettingsModal({ isOpen, onClose, instances, onSaveInstances, jiraConfig, onSaveJiraConfig, dbConfig, onSaveDbConfig }) {
  const [localInstances, setLocalInstances] = useState(
    instances.length > 0 ? instances : [{ id: Date.now(), name: 'GitLab', provider: 'gitlab', url: 'https://gitlab.com', token: '' }]
  );
  
  const [localJiraConfig, setLocalJiraConfig] = useState(
    jiraConfig || { email: '', token: '', bauTicket: 'CS-17557' }
  );

  const [localDbConfig, setLocalDbConfig] = useState(() => normalizeDbConfig(dbConfig));

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
