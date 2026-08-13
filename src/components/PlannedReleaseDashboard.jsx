import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  fetchBatchJiraIssues, 
  fetchJiraIssueDetails, 
  fetchAssignedIssues,
  fetchIssuesByFixVersion 
} from '../jiraApi';
import { debouncedSaveServerStorage } from '../storageApi';
import { 
  Plus, 
  Trash2, 
  RefreshCcw, 
  Calendar, 
  ExternalLink, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Copy, 
  Check, 
  Search, 
  X, 
  ListPlus, 
  ArrowUpDown, 
  Rocket, 
  FileText, 
  Edit3,
  ChevronDown
} from 'lucide-react';
import '../plannedRelease.css';

const STATUS_FILTER_OPTIONS = [
  { id: 'done', label: 'Done / Released', color: '#10b981' },
  { id: 'qa', label: 'In QA / Review', color: '#f59e0b' },
  { id: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'todo', label: 'To Do / Open', color: '#94a3b8' }
];

function MultiSelectDropdown({ 
  title, 
  allLabel, 
  options, 
  selected, 
  onChange,
  renderOption
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const allIds = useMemo(() => options.map(o => (typeof o === 'string' ? o : o.id)), [options]);
  const isAllSelected = selected === null || selected.length === allIds.length;
  const isNoneSelected = selected !== null && selected.length === 0;

  const currentSelectedList = selected === null ? allIds : selected;

  const handleToggle = (id) => {
    if (isAllSelected) {
      onChange(allIds.filter(x => x !== id));
    } else if (currentSelectedList.includes(id)) {
      onChange(currentSelectedList.filter(x => x !== id));
    } else {
      const next = [...currentSelectedList, id];
      if (next.length === allIds.length) {
        onChange(allIds);
      } else {
        onChange(next);
      }
    }
  };

  const handleSelectAll = () => {
    onChange(allIds);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const labelText = useMemo(() => {
    if (isAllSelected) return allLabel;
    if (isNoneSelected) return `${title} (0)`;
    if (currentSelectedList.length === 1 && typeof options[0] === 'string') {
      return currentSelectedList[0];
    }
    return `${title} (${currentSelectedList.length}/${allIds.length})`;
  }, [isAllSelected, isNoneSelected, currentSelectedList, allIds, allLabel, title, options]);

  return (
    <div className="multiselect-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        type="button"
        className="btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          fontSize: '0.82rem', 
          padding: '0.4rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          borderColor: isAllSelected ? 'var(--border-color)' : 'var(--accent-color)',
          background: isAllSelected ? 'var(--surface-color-light)' : 'rgba(59, 130, 246, 0.15)',
          color: isAllSelected ? 'var(--text-primary)' : 'var(--accent-hover)',
          fontWeight: isAllSelected ? 500 : 600
        }}
      >
        <span>{labelText}</span>
        <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div 
          className="glass flex-col"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 150,
            minWidth: '220px',
            maxWidth: '300px',
            maxHeight: '260px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'var(--surface-color)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            padding: '0.5rem',
            gap: '0.35rem'
          }}
        >
          {/* Header Action Row */}
          <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {title}
            </span>
            <div className="flex gap-1">
              <button 
                type="button" 
                onClick={handleSelectAll}
                className="btn"
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.06)' }}
              >
                All
              </button>
              <button 
                type="button" 
                onClick={handleClearAll}
                className="btn"
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem', background: 'transparent', color: 'var(--danger-color)' }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Options List */}
          <div className="flex-col gap-1" style={{ overflowY: 'auto', maxHeight: '190px' }}>
            {options.map((opt) => {
              const id = typeof opt === 'string' ? opt : opt.id;
              const label = typeof opt === 'string' ? opt : opt.label;
              const isChecked = currentSelectedList.includes(id);

              return (
                <label 
                  key={id}
                  className="flex items-center gap-2"
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    userSelect: 'none',
                    background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isChecked ? 'rgba(59, 130, 246, 0.08)' : 'transparent'}
                >
                  <input 
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(id)}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                  />
                  {renderOption ? renderOption(opt, isChecked) : (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_RELEASES = [
  {
    id: 'rel-sample-1',
    version: 'v2.4.0',
    fixVersion: 'v2.4.0',
    name: 'Core Services & Self-Care Enhancements',
    plannedDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 'In QA', // In Planning, Development, Code Freeze, In QA, Ready for Production, Released
    description: 'Quarterly payment gateway modernization and high-volume billing optimization.',
    tickets: [
      {
        key: 'CS-17557',
        summary: 'BAU - Standard Maintenance & System Optimization',
        status: 'In Progress',
        statusCategory: 'indeterminate',
        assignee: 'Rahul Soni',
        assigneeEmail: '',
        assigneeAvatar: '',
        priority: 'High',
        issueType: 'Story',
        fixVersions: ['v2.4.0'],
        updated: new Date().toISOString()
      }
    ]
  },
  {
    id: 'rel-sample-2',
    version: 'v2.5.0',
    fixVersion: 'v2.5.0',
    name: 'Autumn Feature Release',
    plannedDate: new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0],
    status: 'In Planning',
    description: 'Customer notification engine rework and analytics telemetry.',
    tickets: []
  }
];

export default function PlannedReleaseDashboard({ config }) {
  const [releases, setReleases] = useState(() => {
    const saved = localStorage.getItem('planned_releases_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing planned releases:', e);
      }
    }
    return DEFAULT_RELEASES;
  });

  const [activeReleaseId, setActiveReleaseId] = useState(() => {
    return releases.length > 0 ? releases[0].id : null;
  });

  const [ticketInput, setTicketInput] = useState('');
  const [addingTickets, setAddingTickets] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingFixVersion, setSyncingFixVersion] = useState(false);
  const [syncingTicketKey, setSyncingTicketKey] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Filtering inside the active release (Multi-select by default selects all)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(null); // null = all selected
  const [selectedPriorities, setSelectedPriorities] = useState(null); // null = all selected
  const [selectedAssignees, setSelectedAssignees] = useState(null); // null = all selected

  // Modals
  const [isNewReleaseModalOpen, setIsNewReleaseModalOpen] = useState(false);
  const [newReleaseData, setNewReleaseData] = useState({
    version: '',
    fixVersion: '',
    name: '',
    plannedDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 'In Planning',
    description: '',
    autoFetchFixVersion: true
  });

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [availableAssignedIssues, setAvailableAssignedIssues] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedPickerKeys, setSelectedPickerKeys] = useState(new Set());
  const [pickerSearch, setPickerSearch] = useState('');

  const [copiedRelease, setCopiedRelease] = useState(false);

  // Sync to localStorage & local disk persistence
  useEffect(() => {
    localStorage.setItem('planned_releases_data', JSON.stringify(releases));
    debouncedSaveServerStorage({ plannedReleases: releases });
  }, [releases]);

  // Keep activeReleaseId valid
  useEffect(() => {
    if (releases.length > 0 && !releases.find(r => r.id === activeReleaseId)) {
      setActiveReleaseId(releases[0].id);
    }
  }, [releases, activeReleaseId]);

  const activeRelease = useMemo(() => {
    return releases.find(r => r.id === activeReleaseId) || releases[0] || null;
  }, [releases, activeReleaseId]);

  const showNotification = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Helper for updating active release fields
  const updateActiveRelease = (field, value) => {
    if (!activeRelease) return;
    setReleases(prev => prev.map(r => {
      if (r.id === activeRelease.id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  // Status Color Class
  const getStatusBadgeClass = (statusName, statusCategory) => {
    const s = (statusName || '').toLowerCase();
    const cat = (statusCategory || '').toLowerCase();

    if (cat === 'done' || s.includes('done') || s.includes('closed') || s.includes('resolved') || s.includes('production') || s.includes('released')) {
      return 'done';
    }
    if (s.includes('qa') || s.includes('test') || s.includes('review') || s.includes('staging') || s.includes('validation')) {
      return 'qa';
    }
    if (cat === 'indeterminate' || s.includes('progress') || s.includes('development') || s.includes('building')) {
      return 'in-progress';
    }
    return 'todo';
  };

  const getPriorityColor = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('highest') || n.includes('critical') || n === 'p0' || n === 'p1') return 'var(--danger-color)';
    if (n.includes('high') || n === 'p2') return '#f97316';
    if (n.includes('medium') || n === 'p3') return 'var(--warning-color)';
    if (n.includes('low') || n === 'p4') return 'var(--info-color)';
    return 'var(--text-secondary)';
  };

  // Relative Date calculation
  const getRelativeDateInfo = (dateStr) => {
    if (!dateStr) return { text: 'No date set', type: 'none' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: 'Planned Today', type: 'today' };
    if (diffDays === 1) return { text: 'Tomorrow', type: 'soon' };
    if (diffDays > 1 && diffDays <= 7) return { text: `In ${diffDays} days`, type: 'soon' };
    if (diffDays > 7) return { text: `In ${diffDays} days`, type: 'upcoming' };
    return { text: `Overdue by ${Math.abs(diffDays)}d`, type: 'overdue' };
  };

  // Add Ticket Handler (handles single or multiple tickets e.g. CS-12345, CS-67890)
  const handleAddTickets = async (keysToAdd = null) => {
    const rawInput = keysToAdd || ticketInput;
    if (!rawInput || !activeRelease) return;

    // Parse keys separated by comma, whitespace, newline
    const regex = /([A-Za-z]+-\d+)/g;
    const matchedKeys = Array.from(new Set(rawInput.toUpperCase().match(regex) || []));

    if (matchedKeys.length === 0) {
      showNotification('Please enter a valid Jira ticket key (e.g. CS-17557)', 'error');
      return;
    }

    // Filter out already added tickets in this release
    const existingKeys = new Set(activeRelease.tickets.map(t => t.key.toUpperCase()));
    const newKeys = matchedKeys.filter(k => !existingKeys.has(k));

    if (newKeys.length === 0) {
      showNotification('All entered tickets are already part of this release.', 'warning');
      setTicketInput('');
      return;
    }

    setAddingTickets(true);

    try {
      let fetchedIssues = [];
      if (config.email && config.token) {
        try {
          fetchedIssues = await fetchBatchJiraIssues(config, newKeys);
        } catch (apiErr) {
          console.warn('Batch fetch failed, creating local placeholders:', apiErr);
        }
      }

      // Map found issues or fallback placeholders
      const fetchedMap = new Map(fetchedIssues.map(i => [i.key.toUpperCase(), i]));
      const newTicketObjects = newKeys.map(k => {
        if (fetchedMap.has(k)) {
          return fetchedMap.get(k);
        }
        return {
          key: k,
          summary: 'Jira Ticket (Sync to load title)',
          status: 'Planned',
          statusCategory: 'indeterminate',
          assignee: 'Unassigned',
          assigneeEmail: '',
          assigneeAvatar: '',
          priority: 'Medium',
          issueType: 'Story',
          fixVersions: [activeRelease.version],
          updated: new Date().toISOString()
        };
      });

      setReleases(prev => prev.map(r => {
        if (r.id === activeRelease.id) {
          return {
            ...r,
            tickets: [...newTicketObjects, ...r.tickets]
          };
        }
        return r;
      }));

      setTicketInput('');
      showNotification(`Added ${newTicketObjects.length} ticket(s) to ${activeRelease.version}!`, 'success');
    } catch (err) {
      showNotification(`Failed to add tickets: ${err.message}`, 'error');
    } finally {
      setAddingTickets(false);
    }
  };

  // Sync all tickets in the active release with Jira
  const handleSyncAllTickets = async () => {
    if (!activeRelease || activeRelease.tickets.length === 0) return;
    if (!config.email || !config.token) {
      showNotification('Please configure Jira Email and API Token in Settings to sync data.', 'error');
      return;
    }

    setSyncingAll(true);
    try {
      const keys = activeRelease.tickets.map(t => t.key);
      const updatedIssues = await fetchBatchJiraIssues(config, keys);
      const updatedMap = new Map(updatedIssues.map(i => [i.key.toUpperCase(), i]));

      setReleases(prev => prev.map(r => {
        if (r.id === activeRelease.id) {
          const newTickets = r.tickets.map(t => {
            if (updatedMap.has(t.key.toUpperCase())) {
              return { ...t, ...updatedMap.get(t.key.toUpperCase()) };
            }
            return t;
          });
          return { ...r, tickets: newTickets };
        }
        return r;
      }));

      showNotification(`Successfully synchronized ${updatedIssues.length} tickets with Jira!`, 'success');
    } catch (err) {
      showNotification(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingAll(false);
    }
  };

  // Sync all tickets linked with a FixVersion from Jira
  const handleSyncFixVersion = async (customFixVersion = null, targetRelId = null) => {
    const relToUpdate = targetRelId ? releases.find(r => r.id === targetRelId) : activeRelease;
    if (!relToUpdate) return;

    if (!config.email || !config.token) {
      showNotification('Please configure Jira Email and API Token in Settings to fetch Jira tickets.', 'error');
      return;
    }

    const targetVersion = (customFixVersion !== null ? customFixVersion : (relToUpdate.fixVersion || relToUpdate.version || '')).trim();
    if (!targetVersion) {
      showNotification('Please specify a valid Jira FixVersion name (e.g. v2.4.0)', 'warning');
      return;
    }

    setSyncingFixVersion(true);
    try {
      const issues = await fetchIssuesByFixVersion(config, targetVersion);
      if (issues.length === 0) {
        showNotification(`No Jira tickets found with fixVersion "${targetVersion}". Verify the fixVersion in Jira.`, 'warning');
        return;
      }

      const existingKeys = new Set((relToUpdate.tickets || []).map(t => t.key.toUpperCase()));
      const fetchedMap = new Map(issues.map(i => [i.key.toUpperCase(), i]));

      // Update existing tickets with freshly fetched fields
      const updatedExisting = (relToUpdate.tickets || []).map(t => {
        if (fetchedMap.has(t.key.toUpperCase())) {
          return { ...t, ...fetchedMap.get(t.key.toUpperCase()) };
        }
        return t;
      });

      // Find new tickets to append
      const newTickets = issues.filter(i => !existingKeys.has(i.key.toUpperCase()));
      const finalTickets = [...newTickets, ...updatedExisting];

      setReleases(prev => prev.map(r => {
        if (r.id === relToUpdate.id) {
          return {
            ...r,
            fixVersion: targetVersion,
            tickets: finalTickets
          };
        }
        return r;
      }));

      showNotification(`Linked ${issues.length} ticket(s) with fixVersion "${targetVersion}" (${newTickets.length} new added)!`, 'success');
    } catch (err) {
      showNotification(`FixVersion fetch failed: ${err.message}`, 'error');
    } finally {
      setSyncingFixVersion(false);
    }
  };

  // Single ticket sync
  const handleSyncSingleTicket = async (ticketKey) => {
    if (!config.email || !config.token) {
      showNotification('Please configure Jira Email and API Token in Settings.', 'error');
      return;
    }

    setSyncingTicketKey(ticketKey);
    try {
      const details = await fetchJiraIssueDetails(config, ticketKey);
      setReleases(prev => prev.map(r => {
        if (r.id === activeRelease.id) {
          return {
            ...r,
            tickets: r.tickets.map(t => t.key === ticketKey ? { ...t, ...details } : t)
          };
        }
        return r;
      }));
      showNotification(`Updated ${ticketKey}`, 'success');
    } catch (err) {
      showNotification(`Failed to refresh ${ticketKey}: ${err.message}`, 'error');
    } finally {
      setSyncingTicketKey(null);
    }
  };

  // Remove ticket from release
  const handleRemoveTicket = (ticketKey) => {
    if (!activeRelease) return;
    setReleases(prev => prev.map(r => {
      if (r.id === activeRelease.id) {
        return {
          ...r,
          tickets: r.tickets.filter(t => t.key !== ticketKey)
        };
      }
      return r;
    }));
    showNotification(`Removed ${ticketKey} from ${activeRelease.version}`, 'info');
  };

  // Create New Release
  const handleCreateRelease = async (e) => {
    e.preventDefault();
    const ver = newReleaseData.version.trim();
    if (!ver) {
      alert('Please enter a release version (e.g. v2.6.0)');
      return;
    }

    const assignedFixVersion = newReleaseData.fixVersion.trim() || ver;

    const newRel = {
      id: `rel-${Date.now()}`,
      version: ver,
      fixVersion: assignedFixVersion,
      name: newReleaseData.name.trim() || `Release ${ver}`,
      plannedDate: newReleaseData.plannedDate,
      status: newReleaseData.status || 'In Planning',
      description: newReleaseData.description.trim(),
      tickets: []
    };

    setReleases(prev => [newRel, ...prev]);
    setActiveReleaseId(newRel.id);
    setIsNewReleaseModalOpen(false);

    const shouldAutoFetch = newReleaseData.autoFetchFixVersion && assignedFixVersion && config.email && config.token;

    setNewReleaseData({
      version: '',
      fixVersion: '',
      name: '',
      plannedDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'In Planning',
      description: '',
      autoFetchFixVersion: true
    });

    showNotification(`Created new release ${newRel.version}!`, 'success');

    if (shouldAutoFetch) {
      handleSyncFixVersion(assignedFixVersion, newRel.id);
    }
  };

  // Delete Active Release
  const handleDeleteRelease = () => {
    if (!activeRelease) return;
    if (releases.length <= 1) {
      alert('Cannot delete the only remaining release.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${activeRelease.version} (${activeRelease.name})?`)) {
      const filtered = releases.filter(r => r.id !== activeRelease.id);
      setReleases(filtered);
      setActiveReleaseId(filtered[0].id);
      showNotification(`Deleted release ${activeRelease.version}`, 'info');
    }
  };

  // Duplicate Release
  const handleDuplicateRelease = () => {
    if (!activeRelease) return;
    const duplicated = {
      ...activeRelease,
      id: `rel-${Date.now()}`,
      version: `${activeRelease.version}-copy`,
      name: `${activeRelease.name} (Copy)`,
      tickets: [...activeRelease.tickets]
    };
    setReleases(prev => [duplicated, ...prev]);
    setActiveReleaseId(duplicated.id);
    showNotification(`Duplicated release to ${duplicated.version}`, 'success');
  };

  // Open Assigned Issues Picker
  const handleOpenPicker = async () => {
    setIsPickerOpen(true);
    setSelectedPickerKeys(new Set());
    if (availableAssignedIssues.length === 0 && config.email && config.token) {
      setPickerLoading(true);
      try {
        const issues = await fetchAssignedIssues(config, 60, '', false, 'my');
        setAvailableAssignedIssues(issues);
      } catch (e) {
        console.error('Failed to fetch assigned issues for picker:', e);
      } finally {
        setPickerLoading(false);
      }
    }
  };

  const handleAddSelectedFromPicker = () => {
    if (selectedPickerKeys.size === 0) {
      setIsPickerOpen(false);
      return;
    }
    const keysArray = Array.from(selectedPickerKeys);
    handleAddTickets(keysArray.join(', '));
    setIsPickerOpen(false);
  };

  // Copy Release Summary to Clipboard (Markdown / Notes)
  const handleCopySummary = () => {
    if (!activeRelease) return;
    const markdown = [
      `# Release Plan: ${activeRelease.version} - ${activeRelease.name}`,
      `**Target Date:** ${activeRelease.plannedDate || 'TBD'}`,
      `**Status:** ${activeRelease.status}`,
      activeRelease.description ? `**Description:** ${activeRelease.description}\n` : '',
      `### Planned Jira Tickets (${activeRelease.tickets.length})`,
      '| Key | Status | Priority | Assignee | Summary |',
      '| --- | --- | --- | --- | --- |',
      ...activeRelease.tickets.map(t => 
        `| [${t.key}](https://omantel-om.atlassian.net/browse/${t.key}) | ${t.status || 'To Do'} | ${t.priority || 'Medium'} | ${t.assignee || 'Unassigned'} | ${t.summary.replace(/\|/g, '-')} |`
      )
    ].join('\n');

    navigator.clipboard.writeText(markdown);
    setCopiedRelease(true);
    setTimeout(() => setCopiedRelease(false), 2000);
    showNotification('Release summary copied as Markdown!', 'success');
  };

  // Progress metrics calculation
  const metrics = useMemo(() => {
    if (!activeRelease || !activeRelease.tickets) {
      return { total: 0, done: 0, inProgress: 0, qa: 0, todo: 0, donePct: 0 };
    }
    const total = activeRelease.tickets.length;
    let done = 0;
    let inProgress = 0;
    let qa = 0;
    let todo = 0;

    activeRelease.tickets.forEach(t => {
      const cls = getStatusBadgeClass(t.status, t.statusCategory);
      if (cls === 'done') done++;
      else if (cls === 'qa') qa++;
      else if (cls === 'in-progress') inProgress++;
      else todo++;
    });

    const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, qa, todo, donePct };
  }, [activeRelease]);

  // Filtered tickets in active release
  const filteredTickets = useMemo(() => {
    if (!activeRelease) return [];
    return activeRelease.tickets.filter(t => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKey = t.key.toLowerCase().includes(q);
        const matchSum = t.summary.toLowerCase().includes(q);
        const matchAssignee = (t.assignee || '').toLowerCase().includes(q);
        const matchStatus = (t.status || '').toLowerCase().includes(q);
        if (!matchKey && !matchSum && !matchAssignee && !matchStatus) return false;
      }
      
      // Status Multi-Select Filter (null means all selected)
      if (selectedStatuses !== null) {
        const cat = getStatusBadgeClass(t.status, t.statusCategory);
        if (!selectedStatuses.includes(cat)) return false;
      }

      // Priority Multi-Select Filter (null means all selected)
      if (selectedPriorities !== null) {
        const p = t.priority || 'Medium';
        if (!selectedPriorities.includes(p)) return false;
      }

      // Assignee Multi-Select Filter (null means all selected)
      if (selectedAssignees !== null) {
        const a = t.assignee || 'Unassigned';
        if (!selectedAssignees.includes(a)) return false;
      }

      return true;
    });
  }, [activeRelease, searchQuery, selectedStatuses, selectedPriorities, selectedAssignees]);

  // Available filter options
  const uniqueAssignees = useMemo(() => {
    if (!activeRelease || !activeRelease.tickets) return [];
    const set = new Set(activeRelease.tickets.map(t => t.assignee || 'Unassigned').filter(Boolean));
    return Array.from(set).sort();
  }, [activeRelease]);

  const uniquePriorities = useMemo(() => {
    if (!activeRelease || !activeRelease.tickets) return [];
    const set = new Set(activeRelease.tickets.map(t => t.priority || 'Medium').filter(Boolean));
    return Array.from(set).sort();
  }, [activeRelease]);

  const dateInfo = getRelativeDateInfo(activeRelease?.plannedDate);

  return (
    <div className="planned-release-container">
      {/* Toast / Notification message */}
      {message.text && (
        <div 
          className="glass flex items-center justify-between" 
          style={{ 
            padding: '0.75rem 1.25rem', 
            borderRadius: '8px', 
            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            borderColor: message.type === 'error' ? 'var(--danger-color)' : message.type === 'success' ? 'var(--success-color)' : 'var(--accent-color)',
            color: 'var(--text-primary)'
          }}
        >
          <div className="flex items-center gap-2">
            {message.type === 'error' ? <AlertCircle size={18} color="var(--danger-color)" /> : <CheckCircle2 size={18} color="var(--success-color)" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ text: '', type: '' })} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Releases Tab Bar */}
      <div className="release-tabs-bar glass">
        {releases.map(rel => {
          const isActive = rel.id === activeRelease?.id;
          return (
            <button
              key={rel.id}
              className={`release-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => setActiveReleaseId(rel.id)}
            >
              <Rocket size={15} color={isActive ? 'var(--accent-color)' : 'var(--text-secondary)'} />
              <span>{rel.version}</span>
              <span className="release-tab-badge">
                {rel.tickets?.length || 0}
              </span>
            </button>
          );
        })}

        <button 
          className="add-release-btn"
          onClick={() => setIsNewReleaseModalOpen(true)}
          title="Create New Upcoming Release"
        >
          <Plus size={15} /> New Release
        </button>
      </div>

      {activeRelease && (
        <>
          {/* Active Release Hero & Metadata Card */}
          <div className="release-hero-card">
            <div className="release-header-top">
              <div className="release-title-group">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-color)', fontWeight: 600 }}>
                    Upcoming Target Release
                  </span>
                </div>
                
                {/* Editable Version Input */}
                <input 
                  type="text" 
                  className="release-version-input" 
                  value={activeRelease.version}
                  onChange={(e) => updateActiveRelease('version', e.target.value)}
                  placeholder="e.g. v2.4.0"
                  title="Click to edit release version"
                />

                {/* Editable Release Name / Goal */}
                <input 
                  type="text" 
                  className="release-name-input" 
                  value={activeRelease.name}
                  onChange={(e) => updateActiveRelease('name', e.target.value)}
                  placeholder="Release Codename / Main Focus (e.g. Payments Migration)"
                  title="Click to edit release focus name"
                />

                {/* Jira FixVersion Attached Control */}
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: '0.35rem' }}>
                  <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 600 }}>
                    Jira FixVersion:
                  </span>
                  <input 
                    type="text" 
                    value={activeRelease.fixVersion !== undefined ? activeRelease.fixVersion : activeRelease.version}
                    onChange={(e) => updateActiveRelease('fixVersion', e.target.value)}
                    placeholder="e.g. v2.4.0"
                    title="Click to edit Jira FixVersion to link tickets with"
                    style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid var(--border-color)', 
                      fontSize: '0.85rem', 
                      color: 'var(--text-primary)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      width: '160px'
                    }}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleSyncFixVersion(activeRelease.fixVersion !== undefined ? activeRelease.fixVersion : activeRelease.version)}
                    disabled={syncingFixVersion}
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                    title="Fetch all tickets linked to this fixVersion in Jira"
                  >
                    <Layers size={13} className={syncingFixVersion ? 'spinner' : ''} />
                    {syncingFixVersion ? 'Fetching...' : 'Fetch FixVersion Tickets'}
                  </button>
                </div>
              </div>

              {/* Release Header Controls: Date & Status */}
              <div className="release-meta-controls">
                {/* Planned Date Picker with Relative Countdown */}
                <div className="release-date-picker-wrap">
                  <Calendar size={16} style={{ color: 'var(--accent-color)' }} />
                  <div className="flex-col">
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Planned Date</span>
                    <input 
                      type="date" 
                      className="release-date-input" 
                      value={activeRelease.plannedDate || ''}
                      onChange={(e) => updateActiveRelease('plannedDate', e.target.value)}
                    />
                  </div>
                  {activeRelease.plannedDate && (
                    <span className={`countdown-badge ${dateInfo.type}`}>
                      <Clock size={12} /> {dateInfo.text}
                    </span>
                  )}
                </div>

                {/* Release Workflow Status Selector */}
                <div className="flex-col gap-1">
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Release Status</span>
                  <select 
                    className="btn" 
                    value={activeRelease.status || 'In Planning'}
                    onChange={(e) => updateActiveRelease('status', e.target.value)}
                    style={{ fontWeight: 600, fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                  >
                    <option value="In Planning">📋 In Planning</option>
                    <option value="Development">💻 Development</option>
                    <option value="Code Freeze">❄️ Code Freeze</option>
                    <option value="In QA">🧪 In QA / Testing</option>
                    <option value="Ready for Production">🚀 Ready for Production</option>
                    <option value="Released">✅ Released</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Release Description / Goals */}
            <div className="flex-col gap-1">
              <input 
                type="text" 
                value={activeRelease.description || ''} 
                onChange={(e) => updateActiveRelease('description', e.target.value)}
                placeholder="Optional release description or deployment checklist notes..."
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px dashed var(--border-color)', 
                  fontSize: '0.88rem', 
                  color: 'var(--text-secondary)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px'
                }}
              />
            </div>

            {/* Metrics & Progress Bar */}
            <div className="release-stats-container">
              <div className="release-stats-row">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="stat-chip" style={{ color: 'var(--text-primary)' }}>
                    <strong>{metrics.total}</strong> Total Tickets
                  </span>
                  <span className="stat-chip" style={{ color: '#34d399' }}>
                    <span className="dot" style={{ background: '#10b981' }} />
                    <strong>{metrics.done}</strong> Done ({metrics.donePct}%)
                  </span>
                  <span className="stat-chip" style={{ color: '#fbbf24' }}>
                    <span className="dot" style={{ background: '#f59e0b' }} />
                    <strong>{metrics.qa}</strong> In QA
                  </span>
                  <span className="stat-chip" style={{ color: '#60a5fa' }}>
                    <span className="dot" style={{ background: '#3b82f6' }} />
                    <strong>{metrics.inProgress}</strong> In Progress
                  </span>
                  <span className="stat-chip" style={{ color: 'var(--text-secondary)' }}>
                    <span className="dot" style={{ background: 'rgba(255,255,255,0.2)' }} />
                    <strong>{metrics.todo}</strong> To Do
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    className="btn" 
                    onClick={handleSyncAllTickets} 
                    disabled={syncingAll || activeRelease.tickets.length === 0}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    title="Fetch latest status & assignees for all tickets in this release from Jira"
                  >
                    <RefreshCcw size={14} className={syncingAll ? 'spinner' : ''} />
                    {syncingAll ? 'Syncing...' : 'Sync Jira Data'}
                  </button>

                  <button 
                    className="btn" 
                    onClick={handleCopySummary}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    title="Copy Markdown release notes to clipboard"
                  >
                    {copiedRelease ? <Check size={14} color="var(--success-color)" /> : <Copy size={14} />}
                    {copiedRelease ? 'Copied' : 'Share'}
                  </button>

                  <button 
                    className="btn" 
                    onClick={handleDuplicateRelease}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    title="Duplicate this release"
                  >
                    <Layers size={14} />
                  </button>

                  {releases.length > 1 && (
                    <button 
                      className="btn" 
                      onClick={handleDeleteRelease}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: 'var(--danger-color)' }}
                      title="Delete release"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Segmented Progress Bar */}
              <div className="segmented-progress-bar">
                {metrics.total > 0 ? (
                  <>
                    <div className="progress-segment done" style={{ width: `${(metrics.done / metrics.total) * 100}%` }} title={`Done: ${metrics.done}`} />
                    <div className="progress-segment testing" style={{ width: `${(metrics.qa / metrics.total) * 100}%` }} title={`In QA: ${metrics.qa}`} />
                    <div className="progress-segment in-progress" style={{ width: `${(metrics.inProgress / metrics.total) * 100}%` }} title={`In Progress: ${metrics.inProgress}`} />
                    <div className="progress-segment todo" style={{ width: `${(metrics.todo / metrics.total) * 100}%` }} title={`To Do: ${metrics.todo}`} />
                  </>
                ) : (
                  <div className="progress-segment todo" style={{ width: '100%' }} />
                )}
              </div>
            </div>
          </div>

          {/* Add Jira Tickets & Filter Toolbar */}
          <div className="glass ticket-search-add-bar">
            {/* Add Ticket Box */}
            <div className="ticket-input-group">
              <input 
                type="text" 
                className="ticket-key-input"
                placeholder="Enter Jira Ticket Keys (e.g. CS-17557, CS-18020)..."
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTickets()}
                disabled={addingTickets}
              />
              <button 
                className="btn btn-primary" 
                onClick={() => handleAddTickets()}
                disabled={addingTickets || !ticketInput.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                {addingTickets ? <RefreshCcw size={15} className="spinner" /> : <Plus size={15} />}
                {addingTickets ? 'Adding...' : 'Add Ticket'}
              </button>

              <button 
                className="btn" 
                onClick={() => handleSyncFixVersion()}
                disabled={syncingFixVersion}
                title={`Fetch all tickets linked to fixVersion: "${activeRelease.fixVersion || activeRelease.version}"`}
                style={{ whiteSpace: 'nowrap', borderColor: 'rgba(59, 130, 246, 0.4)' }}
              >
                <Layers size={15} className={syncingFixVersion ? 'spinner' : ''} style={{ color: 'var(--accent-color)' }} />
                {syncingFixVersion ? 'Syncing...' : 'Sync FixVersion'}
              </button>

              <button 
                className="btn" 
                onClick={handleOpenPicker}
                title="Browse & select from your assigned Jira issues"
                style={{ whiteSpace: 'nowrap' }}
              >
                <ListPlus size={15} /> Pick Assigned
              </button>
            </div>

            {/* Search & Filter Controls within Release */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Filter tickets..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: '130px', outline: 'none' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status Multi-Select Filter */}
              <MultiSelectDropdown 
                title="Statuses"
                allLabel="All Statuses"
                options={STATUS_FILTER_OPTIONS}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
                renderOption={(opt) => (
                  <div className="flex items-center gap-2">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                  </div>
                )}
              />

              {/* Priority Multi-Select Filter */}
              {uniquePriorities.length > 0 && (
                <MultiSelectDropdown 
                  title="Priorities"
                  allLabel="All Priorities"
                  options={uniquePriorities}
                  selected={selectedPriorities}
                  onChange={setSelectedPriorities}
                  renderOption={(opt) => (
                    <div className="flex items-center gap-2">
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getPriorityColor(opt), flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
                    </div>
                  )}
                />
              )}

              {/* Assignee Multi-Select Filter */}
              {uniqueAssignees.length > 0 && (
                <MultiSelectDropdown 
                  title="Assignees"
                  allLabel="All Assignees"
                  options={uniqueAssignees}
                  selected={selectedAssignees}
                  onChange={setSelectedAssignees}
                  renderOption={(opt) => (
                    <div className="flex items-center gap-2">
                      <User size={13} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
                    </div>
                  )}
                />
              )}
            </div>
          </div>

          {/* Planned Jira Tickets List */}
          <div className="flex-col gap-3">
            {filteredTickets.length === 0 ? (
              <div className="glass" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Rocket size={36} style={{ color: 'var(--accent-color)', opacity: 0.5, marginBottom: '0.75rem' }} />
                <h3>No tickets found for this release view</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '450px', margin: '0.5rem auto 1.5rem auto' }}>
                  {activeRelease.tickets.length === 0 
                    ? `Start planning by typing Jira ticket keys above (e.g. CS-17557) or click 'Pick Assigned' to select from your Jira work.`
                    : `No tickets match your active filter criteria.`}
                </p>
                {activeRelease.tickets.length === 0 && (
                  <button className="btn btn-primary" onClick={handleOpenPicker}>
                    <ListPlus size={16} /> Browse My Assigned Issues
                  </button>
                )}
              </div>
            ) : (
              filteredTickets.map(ticket => {
                const statusBadgeCls = getStatusBadgeClass(ticket.status, ticket.statusCategory);
                const isSyncingThis = syncingTicketKey === ticket.key;

                return (
                  <div key={ticket.key} className="planned-ticket-card">
                    {/* Left: Ticket Key, Type, Priority, Summary */}
                    <div className="planned-ticket-left">
                      <div className="planned-ticket-badges">
                        {/* Clickable Jira Ticket Link */}
                        <a 
                          href={`https://omantel-om.atlassian.net/browse/${ticket.key}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ticket-key-link"
                          title="Open ticket in Jira"
                        >
                          {ticket.key} <ExternalLink size={13} />
                        </a>

                        {/* Issue Type */}
                        {ticket.issueType && (
                          <span className="tag" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}>
                            {ticket.issueType}
                          </span>
                        )}

                        {/* Priority Badge */}
                        {ticket.priority && (
                          <span 
                            className="tag" 
                            style={{ 
                              background: 'rgba(255,255,255,0.04)', 
                              border: `1px solid ${getPriorityColor(ticket.priority)}`, 
                              color: getPriorityColor(ticket.priority) 
                            }}
                          >
                            {ticket.priority}
                          </span>
                        )}

                        {/* Fix Versions */}
                        {ticket.fixVersions && ticket.fixVersions.length > 0 && (
                          <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            v: {ticket.fixVersions.join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Ticket Title / Summary */}
                      <div className="planned-ticket-summary">
                        {ticket.summary}
                      </div>

                      {/* Sub-info */}
                      {ticket.updated && (
                        <div className="planned-ticket-subinfo">
                          <span>Updated: {new Date(ticket.updated).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Side: Status Badge & Assignee aligned to the right as requested */}
                    <div className="planned-ticket-right">
                      <div className="ticket-status-assignee-col">
                        {/* Status Badge */}
                        <span className={`jira-status-badge ${statusBadgeCls}`}>
                          {ticket.status || 'To Do'}
                        </span>

                        {/* Assignee Badge */}
                        <div className="jira-assignee-badge" title={`Assignee: ${ticket.assignee || 'Unassigned'}`}>
                          {ticket.assigneeAvatar ? (
                            <img src={ticket.assigneeAvatar} alt="" className="jira-assignee-avatar" />
                          ) : (
                            <User size={14} style={{ color: 'var(--accent-color)' }} />
                          )}
                          <span>{ticket.assignee || 'Unassigned'}</span>
                        </div>
                      </div>

                      {/* Ticket Item Actions */}
                      <div className="ticket-item-actions">
                        <button 
                          className="ticket-item-action-btn"
                          onClick={() => handleSyncSingleTicket(ticket.key)}
                          disabled={isSyncingThis}
                          title="Refresh ticket from Jira"
                        >
                          <RefreshCcw size={15} className={isSyncingThis ? 'spinner' : ''} />
                        </button>
                        
                        <button 
                          className="ticket-item-action-btn delete"
                          onClick={() => handleRemoveTicket(ticket.key)}
                          title="Remove ticket from this release"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Modal: Create New Release */}
      {isNewReleaseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
              <h3 className="flex items-center gap-2" style={{ margin: 0 }}>
                <Rocket size={20} style={{ color: 'var(--accent-color)' }} /> New Upcoming Release
              </h3>
              <button className="btn" onClick={() => setIsNewReleaseModalOpen(false)} style={{ padding: '0.25rem' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRelease} className="flex-col gap-4">
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="flex-col gap-1">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Release Version *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. v2.6.0 or 2026.09" 
                    value={newReleaseData.version}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewReleaseData(prev => ({
                        ...prev,
                        version: v,
                        fixVersion: (!prev.fixVersion || prev.fixVersion === prev.version) ? v : prev.fixVersion
                      }));
                    }}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex-col gap-1">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Jira FixVersion</label>
                  <input 
                    type="text" 
                    placeholder="e.g. v2.6.0" 
                    value={newReleaseData.fixVersion}
                    onChange={(e) => setNewReleaseData({ ...newReleaseData, fixVersion: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Release Title / Focus</label>
                <input 
                  type="text" 
                  placeholder="e.g. Self-Care Portal Modernization" 
                  value={newReleaseData.name}
                  onChange={(e) => setNewReleaseData({ ...newReleaseData, name: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2" style={{ margin: '-0.25rem 0' }}>
                <input 
                  type="checkbox" 
                  id="autoFetchFixVersion"
                  checked={newReleaseData.autoFetchFixVersion}
                  onChange={(e) => setNewReleaseData({ ...newReleaseData, autoFetchFixVersion: e.target.checked })}
                />
                <label htmlFor="autoFetchFixVersion" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Automatically fetch & add all Jira tickets for this FixVersion on creation
                </label>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="flex-col gap-1">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Planned Date</label>
                  <input 
                    type="date" 
                    value={newReleaseData.plannedDate}
                    onChange={(e) => setNewReleaseData({ ...newReleaseData, plannedDate: e.target.value })}
                  />
                </div>

                <div className="flex-col gap-1">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Initial Status</label>
                  <select 
                    value={newReleaseData.status}
                    onChange={(e) => setNewReleaseData({ ...newReleaseData, status: e.target.value })}
                  >
                    <option value="In Planning">In Planning</option>
                    <option value="Development">Development</option>
                    <option value="Code Freeze">Code Freeze</option>
                    <option value="In QA">In QA</option>
                  </select>
                </div>
              </div>

              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Description / Scope Notes</label>
                <textarea 
                  rows={3}
                  placeholder="Key deliverables, microservices impacted, or deployment goals..."
                  value={newReleaseData.description}
                  onChange={(e) => setNewReleaseData({ ...newReleaseData, description: e.target.value })}
                  style={{ 
                    background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    color: 'var(--text-primary)', 
                    padding: '0.5rem', 
                    fontFamily: 'inherit' 
                  }}
                />
              </div>

              <div className="flex justify-between items-center" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn" onClick={() => setIsNewReleaseModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Create Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pick Assigned Jira Issues */}
      {isPickerOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxWidth: '640px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <h3 className="flex items-center gap-2" style={{ margin: 0 }}>
                <ListPlus size={20} style={{ color: 'var(--accent-color)' }} /> Pick from Assigned Issues
              </h3>
              <button className="btn" onClick={() => setIsPickerOpen(false)} style={{ padding: '0.25rem' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="w-full" 
                placeholder="Search assigned issues..." 
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
            </div>

            {pickerLoading ? (
              <div className="flex justify-center items-center" style={{ padding: '3rem' }}>
                <RefreshCcw size={28} className="spinner" style={{ color: 'var(--accent-color)' }} />
              </div>
            ) : availableAssignedIssues.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {config.email ? 'No assigned issues found in Jira.' : 'Please configure Jira in Settings.'}
              </div>
            ) : (
              <div className="assigned-picker-list">
                {availableAssignedIssues
                  .filter(issue => {
                    if (!pickerSearch.trim()) return true;
                    const q = pickerSearch.toLowerCase();
                    return issue.key.toLowerCase().includes(q) || (issue.fields?.summary || '').toLowerCase().includes(q);
                  })
                  .map(issue => {
                    const isSelected = selectedPickerKeys.has(issue.key);
                    const isAlreadyInRelease = activeRelease?.tickets?.some(t => t.key === issue.key);

                    return (
                      <div 
                        key={issue.key}
                        className={`assigned-picker-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          if (isAlreadyInRelease) return;
                          const next = new Set(selectedPickerKeys);
                          if (next.has(issue.key)) next.delete(issue.key);
                          else next.add(issue.key);
                          setSelectedPickerKeys(next);
                        }}
                        style={{ opacity: isAlreadyInRelease ? 0.5 : 1, cursor: isAlreadyInRelease ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={isSelected || isAlreadyInRelease}
                            disabled={isAlreadyInRelease}
                            readOnly
                          />
                          <div className="flex-col">
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{issue.key}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {issue.fields?.summary}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="tag" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            {issue.fields?.status?.name}
                          </span>
                          {isAlreadyInRelease && (
                            <span className="tag" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success-color)' }}>
                              Already Added
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="flex justify-between items-center" style={{ marginTop: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {selectedPickerKeys.size} issue(s) selected
              </span>
              <div className="flex gap-2">
                <button type="button" className="btn" onClick={() => setIsPickerOpen(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleAddSelectedFromPicker}
                  disabled={selectedPickerKeys.size === 0}
                >
                  <Plus size={16} /> Add Selected to Release
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
