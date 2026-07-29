import React, { useState } from 'react';
import { Settings, Check, X, Plus, Trash2 } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, instances, onSaveInstances, jiraConfig, onSaveJiraConfig }) {
  const [localInstances, setLocalInstances] = useState(
    instances.length > 0 ? instances : [{ id: Date.now(), name: 'GitLab', provider: 'gitlab', url: 'https://gitlab.com', token: '' }]
  );
  
  const [localJiraConfig, setLocalJiraConfig] = useState(
    jiraConfig || { email: '', token: '', bauTicket: 'CS-17557' }
  );

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

  const handleSave = (e) => {
    e.preventDefault();
    onSaveInstances(localInstances);
    onSaveJiraConfig(localJiraConfig);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
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
            <Plus size={18} /> Add Another Instance
          </button>
          
          <h3 style={{ marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Jira Configuration</h3>
          
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
