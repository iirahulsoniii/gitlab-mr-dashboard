import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  fetchIssuesForAssignees, 
  searchJiraUsers 
} from '../jiraApi';
import { debouncedSaveServerStorage } from '../storageApi';
import { 
  RefreshCcw, 
  Loader2, 
  User, 
  Users, 
  X, 
  Search, 
  ExternalLink, 
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Check
} from 'lucide-react';
import '../jira.css';

export default function JiraIssuesDashboard({ config }) {
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'team'
  
  // Issues state
  const [myIssues, setMyIssues] = useState([]);
  const [teamIssues, setTeamIssues] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [error, setError] = useState('');

  // Multiple Teams State
  const [teams, setTeams] = useState(() => {
    const savedTeams = localStorage.getItem('jira_teams_data');
    if (savedTeams) {
      try {
        const parsed = JSON.parse(savedTeams);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing teams data:', e);
      }
    }
    // Check legacy single team
    const savedLegacy = localStorage.getItem('jira_team_members');
    if (savedLegacy) {
      try {
        const parsed = JSON.parse(savedLegacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [{ id: 'team-default', name: 'My Team', members: parsed }];
        }
      } catch (e) {}
    }
    return [{ id: 'team-1', name: 'Core Team', members: [] }];
  });

  const [activeTeamId, setActiveTeamId] = useState(() => {
    return teams[0]?.id || 'team-1';
  });

  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('all');

  // Team creation / editing UI states
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editingTeamNameText, setEditingTeamNameText] = useState('');

  // Team member user search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const searchDropdownRef = useRef(null);

  // Filters
  const [daysFilter, setDaysFilter] = useState(30);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fixVersionFilter, setFixVersionFilter] = useState('all');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active team resolution
  const activeTeam = useMemo(() => {
    return teams.find(t => t.id === activeTeamId) || teams[0] || { id: 'team-1', name: 'My Team', members: [] };
  }, [teams, activeTeamId]);

  // Keep activeTeamId valid
  useEffect(() => {
    if (teams.length > 0 && !teams.find(t => t.id === activeTeamId)) {
      setActiveTeamId(teams[0].id);
    }
  }, [teams, activeTeamId]);

  // Sync teams to localStorage & local disk persistence
  useEffect(() => {
    localStorage.setItem('jira_teams_data', JSON.stringify(teams));
    debouncedSaveServerStorage({ jiraTeams: teams, teamMembers: activeTeam.members });
  }, [teams, activeTeam]);

  // Reset member filter on team switch
  useEffect(() => {
    setSelectedTeamMemberId('all');
  }, [activeTeamId]);

  // Load My Issues on mount or filter changes
  useEffect(() => {
    if (config.email && config.token) {
      loadMyIssues();
    } else {
      setError('Please configure Jira Email and Token in Settings.');
    }
  }, [config, daysFilter, includeClosed]);

  // Load Team Issues when active team members or filters change
  useEffect(() => {
    if (config.email && config.token && activeTeam.members.length > 0) {
      loadTeamIssues();
    } else {
      setTeamIssues([]);
    }
  }, [config, daysFilter, includeClosed, activeTeam.id, activeTeam.members]);

  // Debounced search for Jira users
  useEffect(() => {
    if (!userSearchQuery.trim() || userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await searchJiraUsers(config, userSearchQuery);
        setUserSearchResults(results);
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery, config]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setIsUserSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMyIssues = async () => {
    setLoadingMy(true);
    setError('');
    try {
      const data = await fetchIssuesForAssignees(config, {
        isCurrentUser: true,
        days: daysFilter,
        includeClosed
      });
      setMyIssues(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMy(false);
    }
  };

  const loadTeamIssues = async () => {
    if (!activeTeam.members || activeTeam.members.length === 0) {
      setTeamIssues([]);
      return;
    }
    setLoadingTeam(true);
    setError('');
    try {
      const accountIds = activeTeam.members.map(m => m.accountId).filter(Boolean);
      const data = await fetchIssuesForAssignees(config, {
        accountIds,
        days: daysFilter,
        includeClosed
      });
      setTeamIssues(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Team Operations
  const handleCreateTeam = (e) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;

    const newTeam = {
      id: `team-${Date.now()}`,
      name,
      members: []
    };
    setTeams(prev => [...prev, newTeam]);
    setActiveTeamId(newTeam.id);
    setNewTeamName('');
    setIsCreatingTeam(false);
  };

  const handleSaveTeamName = () => {
    const name = editingTeamNameText.trim();
    if (!name) return;
    setTeams(prev => prev.map(t => t.id === activeTeam.id ? { ...t, name } : t));
    setIsEditingTeamName(false);
  };

  const handleDeleteTeam = (teamId, e) => {
    e.stopPropagation();
    if (teams.length <= 1) {
      alert('You must have at least one team.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${activeTeam.name}"?`)) {
      const remaining = teams.filter(t => t.id !== teamId);
      setTeams(remaining);
      setActiveTeamId(remaining[0].id);
    }
  };

  const handleAddTeamMember = (user) => {
    if (!activeTeam.members.some(m => m.accountId === user.accountId)) {
      const updatedMembers = [...activeTeam.members, user];
      setTeams(prev => prev.map(t => t.id === activeTeam.id ? { ...t, members: updatedMembers } : t));
    }
    setUserSearchQuery('');
    setUserSearchResults([]);
    setIsUserSearchOpen(false);
  };

  const handleRemoveTeamMember = (accountId, e) => {
    e.stopPropagation();
    const updatedMembers = activeTeam.members.filter(m => m.accountId !== accountId);
    setTeams(prev => prev.map(t => t.id === activeTeam.id ? { ...t, members: updatedMembers } : t));
    if (selectedTeamMemberId === accountId) {
      setSelectedTeamMemberId('all');
    }
  };

  // Status Badge Class
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
    const n = name?.toLowerCase() || '';
    if (n.includes('highest') || n.includes('critical') || n === 'p0' || n === 'p1') return 'var(--danger-color)';
    if (n.includes('high') || n === 'p2') return '#f97316';
    if (n.includes('medium') || n === 'p3') return 'var(--warning-color)';
    if (n.includes('low') || n === 'p4') return 'var(--info-color)';
    return 'var(--text-secondary)';
  };

  // Active raw issues based on active tab
  const rawActiveIssues = useMemo(() => {
    if (activeTab === 'my') return myIssues;

    // Strict team check: ONLY include tickets whose assignee is in active team's members
    if (!activeTeam.members || activeTeam.members.length === 0) return [];
    const validAccountIds = new Set(activeTeam.members.map(m => m.accountId).filter(Boolean));
    return teamIssues.filter(i => {
      const accId = i.fields?.assignee?.accountId;
      return accId && validAccountIds.has(accId);
    });
  }, [activeTab, myIssues, teamIssues, activeTeam]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return rawActiveIssues.filter(i => {
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKey = i.key.toLowerCase().includes(q);
        const matchSum = (i.fields?.summary || '').toLowerCase().includes(q);
        const matchAssignee = (i.fields?.assignee?.displayName || '').toLowerCase().includes(q);
        const matchStatus = (i.fields?.status?.name || '').toLowerCase().includes(q);
        if (!matchKey && !matchSum && !matchAssignee && !matchStatus) return false;
      }

      // Priority Filter
      if (priorityFilter !== 'all' && i.fields?.priority?.name !== priorityFilter) return false;

      // Status Filter
      if (statusFilter !== 'all' && i.fields?.status?.name !== statusFilter) return false;

      // FixVersion Filter
      if (fixVersionFilter !== 'all') {
        if (fixVersionFilter === 'none') {
          if (i.fields?.fixVersions && i.fields.fixVersions.length > 0) return false;
        } else {
          if (!i.fields?.fixVersions?.some(v => v.name === fixVersionFilter)) return false;
        }
      }

      // Team Member Filter on Team tab
      if (activeTab === 'team' && selectedTeamMemberId !== 'all') {
        if (i.fields?.assignee?.accountId !== selectedTeamMemberId) return false;
      }

      return true;
    });
  }, [rawActiveIssues, searchQuery, priorityFilter, statusFilter, fixVersionFilter, activeTab, selectedTeamMemberId]);

  // Unique filter options for current view
  const availablePriorities = useMemo(() => {
    const set = new Set(rawActiveIssues.map(i => i.fields?.priority?.name).filter(Boolean));
    return Array.from(set).sort();
  }, [rawActiveIssues]);

  const availableStatuses = useMemo(() => {
    const set = new Set(rawActiveIssues.map(i => i.fields?.status?.name).filter(Boolean));
    return Array.from(set).sort();
  }, [rawActiveIssues]);

  const availableFixVersions = useMemo(() => {
    const set = new Set();
    rawActiveIssues.forEach(i => {
      i.fields?.fixVersions?.forEach(v => {
        if (v.name) set.add(v.name);
      });
    });
    return Array.from(set).sort();
  }, [rawActiveIssues]);

  // Count tickets strictly per active team member
  const memberTicketCounts = useMemo(() => {
    const counts = {};
    if (activeTab === 'team' && activeTeam.members) {
      activeTeam.members.forEach(m => {
        counts[m.accountId] = 0;
      });
      teamIssues.forEach(i => {
        const accId = i.fields?.assignee?.accountId;
        if (accId && counts[accId] !== undefined) {
          counts[accId] += 1;
        }
      });
    }
    return counts;
  }, [activeTab, activeTeam, teamIssues]);

  const currentLoading = activeTab === 'my' ? loadingMy : loadingTeam;

  if (error && myIssues.length === 0 && teamIssues.length === 0) {
    return (
      <div className="glass" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--danger-color)' }}>
        <h3 style={{ color: 'var(--danger-color)' }}>Error Loading Jira Issues</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-col gap-5" style={{ marginTop: '0.5rem' }}>
      {/* Top Main Tab Selector */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="glass flex" style={{ padding: '0.25rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)' }}>
          <button 
            className="btn" 
            style={{ 
              border: 'none', 
              background: activeTab === 'my' ? 'var(--surface-color-light)' : 'transparent', 
              color: activeTab === 'my' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'my' ? 600 : 500
            }}
            onClick={() => setActiveTab('my')}
          >
            <User size={16} /> My Issues
            <span className="tag" style={{ background: activeTab === 'my' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)', color: activeTab === 'my' ? 'var(--accent-color)' : 'var(--text-secondary)', marginLeft: '4px' }}>
              {myIssues.length}
            </span>
          </button>

          <button 
            className="btn" 
            style={{ 
              border: 'none', 
              background: activeTab === 'team' ? 'var(--surface-color-light)' : 'transparent', 
              color: activeTab === 'team' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'team' ? 600 : 500
            }}
            onClick={() => setActiveTab('team')}
          >
            <Users size={16} /> My Team Issues
            <span className="tag" style={{ background: activeTab === 'team' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)', color: activeTab === 'team' ? 'var(--accent-color)' : 'var(--text-secondary)', marginLeft: '4px' }}>
              {rawActiveIssues.length}
            </span>
          </button>
        </div>

        <button 
          className="btn" 
          onClick={activeTab === 'my' ? loadMyIssues : loadTeamIssues} 
          disabled={currentLoading}
        >
          <RefreshCcw size={15} className={currentLoading ? 'spinner' : ''} />
          {currentLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Multiple Teams & Team Member Management (Visible on 'My Team Issues' tab) */}
      {activeTab === 'team' && (
        <div className="glass flex-col gap-4" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.25)', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))' }}>
          
          {/* Row 1: Team Tabs & Create Team Action */}
          <div className="flex justify-between items-center flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '4px' }}>
                Teams:
              </span>

              {teams.map(t => {
                const isSelected = t.id === activeTeam.id;
                return (
                  <div key={t.id} className="flex items-center">
                    <button
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.82rem',
                        background: isSelected ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                        borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                        fontWeight: isSelected ? 600 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onClick={() => setActiveTeamId(t.id)}
                    >
                      <Users size={13} />
                      <span>{t.name}</span>
                      <span className="tag" style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', background: isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)', color: '#fff' }}>
                        {t.members?.length || 0}
                      </span>
                    </button>
                  </div>
                );
              })}

              {/* Create New Team Inline Form / Button */}
              {isCreatingTeam ? (
                <form onSubmit={handleCreateTeam} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter team name..."
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    autoFocus
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--accent-color)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '160px'
                    }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>
                    <Check size={13} /> Add
                  </button>
                  <button type="button" className="btn" onClick={() => setIsCreatingTeam(false)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}>
                    <X size={13} />
                  </button>
                </form>
              ) : (
                <button 
                  className="btn" 
                  onClick={() => setIsCreatingTeam(true)}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.04)', borderStyle: 'dashed' }}
                  title="Create a new team"
                >
                  <Plus size={13} /> New Team
                </button>
              )}
            </div>

            {/* Active Team Edit Actions */}
            <div className="flex items-center gap-2">
              {isEditingTeamName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editingTeamNameText}
                    onChange={e => setEditingTeamNameText(e.target.value)}
                    autoFocus
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--accent-color)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '5px',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                  <button onClick={handleSaveTeamName} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                    Save
                  </button>
                  <button onClick={() => setIsEditingTeamName(false)} className="btn" style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button 
                  className="btn" 
                  onClick={() => {
                    setEditingTeamNameText(activeTeam.name);
                    setIsEditingTeamName(true);
                  }}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'transparent' }}
                  title="Rename active team"
                >
                  <Edit2 size={12} /> Rename
                </button>
              )}

              {teams.length > 1 && (
                <button 
                  className="btn" 
                  onClick={(e) => handleDeleteTeam(activeTeam.id, e)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'transparent', color: 'var(--danger-color)' }}
                  title="Delete this team"
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Add Team Member Search Box */}
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {activeTeam.name} Members ({activeTeam.members?.length || 0})
              </h4>
            </div>

            {/* Add Team Member Search Box */}
            <div style={{ position: 'relative' }} ref={searchDropdownRef}>
              <div className="flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.06)', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder={`Add member to ${activeTeam.name}...`} 
                  value={userSearchQuery}
                  onChange={e => {
                    setUserSearchQuery(e.target.value);
                    setIsUserSearchOpen(true);
                  }}
                  onFocus={() => setIsUserSearchOpen(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '220px', fontSize: '0.82rem' }}
                />
                {isSearchingUsers ? (
                  <Loader2 size={14} className="spinner" style={{ color: 'var(--accent-color)' }} />
                ) : userSearchQuery ? (
                  <button onClick={() => setUserSearchQuery('')} style={{ background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={13} />
                  </button>
                ) : null}
              </div>

              {/* User Search Dropdown Menu */}
              {isUserSearchOpen && userSearchQuery.trim().length >= 2 && (
                <div className="user-search-dropdown-menu glass">
                  {isSearchingUsers ? (
                    <div className="flex justify-center items-center" style={{ padding: '1.5rem' }}>
                      <Loader2 size={20} className="spinner" style={{ color: 'var(--accent-color)' }} />
                    </div>
                  ) : userSearchResults.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      No Jira users found matching "{userSearchQuery}".
                    </div>
                  ) : (
                    userSearchResults.map(user => {
                      const isAdded = activeTeam.members.some(m => m.accountId === user.accountId);
                      return (
                        <div 
                          key={user.accountId}
                          className={`user-search-item ${isAdded ? 'disabled' : ''}`}
                          onClick={() => !isAdded && handleAddTeamMember(user)}
                        >
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="team-chip-avatar" style={{ width: '24px', height: '24px' }} />
                          ) : (
                            <User size={18} style={{ color: 'var(--accent-color)' }} />
                          )}
                          <div className="flex-col" style={{ flexGrow: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.displayName}</span>
                            {user.emailAddress && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.emailAddress}
                              </span>
                            )}
                          </div>
                          {isAdded ? (
                            <span className="tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)', fontSize: '0.7rem' }}>
                              In Team
                            </span>
                          ) : (
                            <span className="tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-color)', fontSize: '0.7rem' }}>
                              + Add
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Member Chips and Active Filtering */}
          <div className="team-members-bar">
            <button 
              type="button" 
              className={`team-chip ${selectedTeamMemberId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedTeamMemberId('all')}
            >
              <Users size={13} />
              <span>All {activeTeam.name} Members ({rawActiveIssues.length})</span>
            </button>

            {activeTeam.members.map(member => {
              const isSelected = selectedTeamMemberId === member.accountId;
              const count = memberTicketCounts[member.accountId] || 0;

              return (
                <div 
                  key={member.accountId}
                  className={`team-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedTeamMemberId(isSelected ? 'all' : member.accountId)}
                  title={`Click to filter issues for ${member.displayName}`}
                >
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="team-chip-avatar" />
                  ) : (
                    <User size={13} style={{ color: 'var(--accent-color)' }} />
                  )}
                  <span>{member.displayName}</span>
                  <span className="tag" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)' }}>
                    {count}
                  </span>
                  <button 
                    type="button" 
                    className="team-chip-remove"
                    onClick={(e) => handleRemoveTeamMember(member.accountId, e)}
                    title={`Remove ${member.displayName} from ${activeTeam.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {activeTeam.members.length === 0 && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No members in "{activeTeam.name}" yet. Search and add team members above.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Shared Filter Bar */}
      <div className="glass flex justify-between items-center" style={{ padding: '0.85rem 1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Search */}
          <div className="flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.04)', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <Search size={14} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search issues..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: '150px', outline: 'none' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Timeframe Filter */}
          <div className="flex gap-1 items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            <Calendar size={14} />
            <select className="btn" value={daysFilter} onChange={(e) => setDaysFilter(Number(e.target.value))} style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>

          {/* Status Filter */}
          {availableStatuses.length > 1 && (
            <select className="btn" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}>
              <option value="all">All Statuses</option>
              {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Priority Filter */}
          {availablePriorities.length > 1 && (
            <select className="btn" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}>
              <option value="all">All Priorities</option>
              {availablePriorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {/* Fix Version Filter */}
          {availableFixVersions.length > 0 && (
            <select className="btn" value={fixVersionFilter} onChange={(e) => setFixVersionFilter(e.target.value)} style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}>
              <option value="all">All Versions</option>
              <option value="none">No Version</option>
              {availableFixVersions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}

          <label className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={includeClosed} 
              onChange={e => setIncludeClosed(e.target.checked)} 
            />
            Include Closed
          </label>
        </div>

        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredIssues.length}</strong> of {rawActiveIssues.length} issues
        </span>
      </div>

      {/* Content: Table View */}
      {currentLoading && rawActiveIssues.length === 0 ? (
        <div className="flex justify-center items-center" style={{ padding: '4rem' }}>
          <Loader2 className="spinner" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : activeTab === 'team' && (!activeTeam.members || activeTeam.members.length === 0) ? (
        <div className="glass" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Users size={38} style={{ color: 'var(--accent-color)', opacity: 0.5, marginBottom: '0.75rem' }} />
          <h3>No Members in "{activeTeam.name}"</h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '450px', margin: '0.5rem auto 1rem auto' }}>
            Search and add team members using the search bar above to track their assigned Jira tickets and workload.
          </p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="glass" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No issues found matching the selected filter criteria for {activeTab === 'team' ? activeTeam.name : 'your assigned issues'}.
        </div>
      ) : (
        <div className="jira-issues-table-wrap">
          <table className="jira-issues-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Key</th>
                <th style={{ width: '100px' }}>Type</th>
                <th>Summary</th>
                {activeTab === 'team' && <th style={{ width: '170px' }}>Assignee</th>}
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '110px' }}>Priority</th>
                <th style={{ width: '130px' }}>Fix Version</th>
                <th style={{ width: '110px' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map(issue => {
                const statusName = issue.fields?.status?.name || 'Unknown';
                const statusCategory = issue.fields?.status?.statusCategory?.key || 'indeterminate';
                const statusBadgeCls = getStatusBadgeClass(statusName, statusCategory);
                const priorityName = issue.fields?.priority?.name;
                const assigneeName = issue.fields?.assignee?.displayName || 'Unassigned';
                const assigneeAvatar = issue.fields?.assignee?.avatarUrls?.['24x24'] || issue.fields?.assignee?.avatarUrls?.['48x48'];
                const fixVersions = issue.fields?.fixVersions || [];

                return (
                  <tr key={issue.key}>
                    {/* Key */}
                    <td>
                      <a 
                        href={`https://omantel-om.atlassian.net/browse/${issue.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="jira-ticket-key-link"
                        title="Open in Jira"
                      >
                        {issue.key} <ExternalLink size={12} />
                      </a>
                    </td>

                    {/* Type */}
                    <td>
                      <span className="tag" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}>
                        {issue.fields?.issuetype?.name || 'Task'}
                      </span>
                    </td>

                    {/* Summary */}
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={issue.fields?.summary}>
                        {issue.fields?.summary}
                      </div>
                    </td>

                    {/* Assignee (on team view) */}
                    {activeTab === 'team' && (
                      <td>
                        <div className="flex items-center gap-2">
                          {assigneeAvatar ? (
                            <img src={assigneeAvatar} alt="" className="team-chip-avatar" />
                          ) : (
                            <User size={14} style={{ color: 'var(--accent-color)' }} />
                          )}
                          <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {assigneeName}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Status */}
                    <td>
                      <span className={`jira-status-badge ${statusBadgeCls}`}>
                        {statusName}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>
                      {priorityName ? (
                        <span 
                          className="tag"
                          style={{ 
                            background: 'rgba(255,255,255,0.04)', 
                            border: `1px solid ${getPriorityColor(priorityName)}`, 
                            color: getPriorityColor(priorityName) 
                          }}
                        >
                          {priorityName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* Fix Versions */}
                    <td>
                      {fixVersions.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {fixVersions.map(v => (
                            <span key={v.id || v.name} className="tag" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                              {v.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>

                    {/* Updated */}
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {issue.fields?.updated ? new Date(issue.fields.updated).toLocaleDateString() : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
