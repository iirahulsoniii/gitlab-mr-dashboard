import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchJiraAnalyticsIssues } from '../jiraApi';
import MultiSelectDropdown from './MultiSelectDropdown';
import { 
  RefreshCcw, 
  Loader2, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Tag, 
  User, 
  Download, 
  ExternalLink, 
  Search, 
  X, 
  Clock, 
  Flame, 
  BarChart3, 
  PieChart, 
  Filter,
  CheckCircle,
  HelpCircle,
  Bookmark,
  Save,
  Star,
  Trash2,
  Plus,
  ChevronDown,
  Check,
  RotateCcw
} from 'lucide-react';
import '../jira.css';

export default function JiraAnalyticsDashboard({ config }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Saved Filter Profiles
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const stored = localStorage.getItem('jira_analytics_saved_filters');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load saved filters:', e);
    }
    return [];
  });

  // Active saved filter profile ID (null if custom/unsaved)
  const [activeFilterId, setActiveFilterId] = useState(() => {
    try {
      const stored = localStorage.getItem('jira_analytics_saved_filters');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const defaultFilter = parsed.find(f => f.isDefault);
          if (defaultFilter) return defaultFilter.id;
        }
      }
    } catch (e) {}
    return null;
  });

  // Default settings from active default filter
  const initialSettings = useMemo(() => {
    try {
      const stored = localStorage.getItem('jira_analytics_saved_filters');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const defaultFilter = parsed.find(f => f.isDefault);
          if (defaultFilter && defaultFilter.settings) {
            return defaultFilter.settings;
          }
        }
      }
    } catch (e) {}
    return null;
  }, []);

  // Timeframe Filter (Days)
  const [daysFilter, setDaysFilter] = useState(() => initialSettings?.daysFilter ?? 30);

  // Optional Project Key Filter (e.g. 'CS' or '' for All)
  const detectedProject = useMemo(() => {
    if (config?.bauTicket) {
      const match = config.bauTicket.match(/^([A-Z]+)-/);
      if (match) return match[1];
    }
    return '';
  }, [config?.bauTicket]);

  const [projectKey, setProjectKey] = useState(() => initialSettings?.projectKey ?? '');

  // Multi-Select Filters (null = All selected)
  const [selectedComponents, setSelectedComponents] = useState(() => initialSettings?.selectedComponents ?? null);
  const [selectedLabels, setSelectedLabels] = useState(() => initialSettings?.selectedLabels ?? null);
  const [selectedAssignees, setSelectedAssignees] = useState(() => initialSettings?.selectedAssignees ?? null);
  const [selectedWorkedBy, setSelectedWorkedBy] = useState(() => initialSettings?.selectedWorkedBy ?? null);
  const [selectedIssueTypes, setSelectedIssueTypes] = useState(() => initialSettings?.selectedIssueTypes ?? null);
  const [selectedStatuses, setSelectedStatuses] = useState(() => initialSettings?.selectedStatuses ?? null);

  // Graph Metric Dimension: 'created_vs_resolved', 'created', 'resolved', 'hours', 'updated', 'by_status', 'by_issuetype', 'by_priority', 'by_component', 'by_worker'
  const [graphMetric, setGraphMetric] = useState(() => initialSettings?.graphMetric ?? 'created_vs_resolved');

  // Chart Visual Type: 'spline' (Smooth Spline Area), 'stepped' (Stepped Lines), 'bars' (Grouped Bars)
  const [chartType, setChartType] = useState(() => initialSettings?.chartType ?? 'spline');

  // Chart Mode: 'flow' (Per Day/Interval) or 'cumulative' (Burnup)
  const [chartMode, setChartMode] = useState(() => initialSettings?.chartMode ?? 'flow');
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);

  // Set of disabled series IDs for interactive legend toggles
  const [disabledSeries, setDisabledSeries] = useState(new Set());

  // Table Tab: 'all', 'created', 'resolved', 'unresolved'
  const [tableTab, setTableTab] = useState(() => initialSettings?.tableTab ?? 'all');
  const [tableSearch, setTableSearch] = useState('');

  // UI state for Saved Views Dropdown & Save Filter Modal
  const [showSavedViewsMenu, setShowSavedViewsMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [isDefaultCheckbox, setIsDefaultCheckbox] = useState(false);
  const savedViewsDropdownRef = useRef(null);

  // Close saved views dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (savedViewsDropdownRef.current && !savedViewsDropdownRef.current.contains(e.target)) {
        setShowSavedViewsMenu(false);
      }
    };
    if (showSavedViewsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSavedViewsMenu]);

  // Check if current filter configuration differs from the active saved filter
  const isFilterModified = useMemo(() => {
    if (!activeFilterId) return false;
    const active = savedFilters.find(f => f.id === activeFilterId);
    if (!active || !active.settings) return false;
    const s = active.settings;
    return (
      daysFilter !== s.daysFilter ||
      projectKey !== s.projectKey ||
      JSON.stringify(selectedComponents) !== JSON.stringify(s.selectedComponents) ||
      JSON.stringify(selectedLabels) !== JSON.stringify(s.selectedLabels) ||
      JSON.stringify(selectedAssignees) !== JSON.stringify(s.selectedAssignees) ||
      JSON.stringify(selectedWorkedBy) !== JSON.stringify(s.selectedWorkedBy) ||
      JSON.stringify(selectedIssueTypes) !== JSON.stringify(s.selectedIssueTypes) ||
      JSON.stringify(selectedStatuses) !== JSON.stringify(s.selectedStatuses) ||
      (graphMetric !== (s.graphMetric ?? 'created_vs_resolved')) ||
      (chartType !== (s.chartType ?? 'spline')) ||
      chartMode !== s.chartMode ||
      tableTab !== s.tableTab
    );
  }, [
    activeFilterId,
    savedFilters,
    daysFilter,
    projectKey,
    selectedComponents,
    selectedLabels,
    selectedAssignees,
    selectedWorkedBy,
    selectedIssueTypes,
    selectedStatuses,
    graphMetric,
    chartType,
    chartMode,
    tableTab
  ]);

  const activeFilterName = useMemo(() => {
    if (!activeFilterId) return null;
    const found = savedFilters.find(f => f.id === activeFilterId);
    return found ? found.name : null;
  }, [activeFilterId, savedFilters]);

  // Save current settings to localStorage helper
  const persistSavedFilters = (updated) => {
    setSavedFilters(updated);
    try {
      localStorage.setItem('jira_analytics_saved_filters', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save Jira filters to localStorage:', e);
    }
  };

  // Apply a saved filter
  const handleApplySavedFilter = (filter) => {
    if (!filter || !filter.settings) return;
    const s = filter.settings;
    setDaysFilter(s.daysFilter ?? 30);
    setProjectKey(s.projectKey ?? '');
    setSelectedComponents(s.selectedComponents ?? null);
    setSelectedLabels(s.selectedLabels ?? null);
    setSelectedAssignees(s.selectedAssignees ?? null);
    setSelectedWorkedBy(s.selectedWorkedBy ?? null);
    setSelectedIssueTypes(s.selectedIssueTypes ?? null);
    setSelectedStatuses(s.selectedStatuses ?? null);
    if (s.graphMetric) setGraphMetric(s.graphMetric);
    if (s.chartType) setChartType(s.chartType);
    if (s.chartMode) setChartMode(s.chartMode);
    if (s.tableTab) setTableTab(s.tableTab);
    setDisabledSeries(new Set());
    setActiveFilterId(filter.id);
    setShowSavedViewsMenu(false);
  };

  // Save current view as a new preset
  const handleSaveCurrentFilter = (e) => {
    if (e) e.preventDefault();
    const name = newFilterName.trim();
    if (!name) return;

    const currentSettings = {
      daysFilter,
      projectKey,
      selectedComponents,
      selectedLabels,
      selectedAssignees,
      selectedWorkedBy,
      selectedIssueTypes,
      selectedStatuses,
      graphMetric,
      chartType,
      chartMode,
      tableTab
    };

    const newId = 'filter_' + Date.now();
    let updated = savedFilters.map(f => isDefaultCheckbox ? { ...f, isDefault: false } : f);

    const newFilter = {
      id: newId,
      name,
      isDefault: isDefaultCheckbox,
      createdAt: new Date().toISOString(),
      settings: currentSettings
    };

    updated.push(newFilter);
    persistSavedFilters(updated);
    setActiveFilterId(newId);
    setNewFilterName('');
    setIsDefaultCheckbox(false);
    setShowSaveModal(false);
  };

  // Update existing active saved filter with current settings
  const handleUpdateActiveFilter = () => {
    if (!activeFilterId) return;
    const currentSettings = {
      daysFilter,
      projectKey,
      selectedComponents,
      selectedLabels,
      selectedAssignees,
      selectedWorkedBy,
      selectedIssueTypes,
      selectedStatuses,
      graphMetric,
      chartType,
      chartMode,
      tableTab
    };

    const updated = savedFilters.map(f => {
      if (f.id === activeFilterId) {
        return {
          ...f,
          settings: currentSettings,
          updatedAt: new Date().toISOString()
        };
      }
      return f;
    });

    persistSavedFilters(updated);
  };

  // Delete a saved filter
  const handleDeleteSavedFilter = (id, e) => {
    if (e) e.stopPropagation();
    const updated = savedFilters.filter(f => f.id !== id);
    persistSavedFilters(updated);
    if (activeFilterId === id) {
      setActiveFilterId(null);
    }
  };

  // Toggle default state of a saved filter
  const handleToggleDefault = (id, e) => {
    if (e) e.stopPropagation();
    const updated = savedFilters.map(f => ({
      ...f,
      isDefault: f.id === id ? !f.isDefault : false
    }));
    persistSavedFilters(updated);
  };

  // Load issues from Jira
  useEffect(() => {
    if (config.email && config.token) {
      loadData();
    } else {
      setError('Please configure Jira Email and Token in Settings to view Analytics.');
    }
  }, [config, daysFilter, projectKey]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJiraAnalyticsIssues(config, { days: daysFilter, projectKey });
      setIssues(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Jira Analytics data.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to categorize status
  const getStatusCategory = (statusName, statusCategoryKey) => {
    const s = (statusName || '').toLowerCase();
    const cat = (statusCategoryKey || '').toLowerCase();

    if (cat === 'done' || s.includes('done') || s.includes('closed') || s.includes('resolved') || s.includes('production') || s.includes('released')) {
      return 'done';
    }
    if (s.includes('qa') || s.includes('test') || s.includes('review') || s.includes('staging') || s.includes('validation')) {
      return 'qa';
    }
    if (cat === 'indeterminate' || s.includes('progress') || s.includes('development') || s.includes('building') || s.includes('analysis')) {
      return 'in-progress';
    }
    return 'todo';
  };

  // Helper to check if an issue is resolved
  const isIssueResolved = (issue) => {
    if (issue.fields?.resolutiondate) return true;
    const cat = getStatusCategory(issue.fields?.status?.name, issue.fields?.status?.statusCategory?.key);
    return cat === 'done';
  };

  // Extract all available Filter Options from raw issues
  const availableComponents = useMemo(() => {
    const compMap = new Map();
    let unassignedCount = 0;
    
    issues.forEach(i => {
      const comps = i.fields?.components || [];
      if (comps.length === 0) {
        unassignedCount++;
      } else {
        comps.forEach(c => {
          const name = c.name || 'Unnamed';
          compMap.set(name, (compMap.get(name) || 0) + 1);
        });
      }
    });

    const list = Array.from(compMap.entries()).map(([name, count]) => ({
      id: name,
      label: name,
      count
    })).sort((a, b) => b.count - a.count);

    if (unassignedCount > 0) {
      list.push({ id: '__none__', label: 'No Component', count: unassignedCount });
    }
    return list;
  }, [issues]);

  const availableLabels = useMemo(() => {
    const labelMap = new Map();
    let noLabelCount = 0;

    issues.forEach(i => {
      const lbls = i.fields?.labels || [];
      if (lbls.length === 0) {
        noLabelCount++;
      } else {
        lbls.forEach(l => {
          labelMap.set(l, (labelMap.get(l) || 0) + 1);
        });
      }
    });

    const list = Array.from(labelMap.entries()).map(([label, count]) => ({
      id: label,
      label,
      count
    })).sort((a, b) => b.count - a.count);

    if (noLabelCount > 0) {
      list.push({ id: '__none__', label: 'No Label', count: noLabelCount });
    }
    return list;
  }, [issues]);

  // 1. Available Assignees (strictly assigned owners)
  const availableAssignees = useMemo(() => {
    const userMap = new Map();
    let unassignedCount = 0;

    issues.forEach(i => {
      const a = i.fields?.assignee;
      if (!a || !a.accountId) {
        unassignedCount++;
      } else {
        const id = a.accountId;
        if (!userMap.has(id)) {
          userMap.set(id, {
            id,
            label: a.displayName || a.emailAddress || 'Unnamed',
            avatarUrl: a.avatarUrls?.['24x24'] || a.avatarUrls?.['48x48'],
            count: 0
          });
        }
        userMap.get(id).count += 1;
      }
    });

    const list = Array.from(userMap.values()).sort((a, b) => b.count - a.count);
    if (unassignedCount > 0) {
      list.push({ id: '__unassigned__', label: 'Unassigned', count: unassignedCount });
    }
    return list;
  }, [issues]);

  // 2. Available Worked By (all contributors: logged work, comments, changelogs, assignee)
  const availableWorkedBy = useMemo(() => {
    const userMap = new Map();
    let unassignedCount = 0;

    issues.forEach(i => {
      const contributors = i.contributors && i.contributors.length > 0 ? i.contributors : (i.fields?.assignee ? [i.fields.assignee] : []);
      if (contributors.length === 0) {
        unassignedCount++;
      } else {
        contributors.forEach(c => {
          const id = c.accountId;
          if (id) {
            if (!userMap.has(id)) {
              userMap.set(id, {
                id,
                label: c.displayName || c.emailAddress || 'Unnamed',
                avatarUrl: c.avatarUrl || c.avatarUrls?.['24x24'] || c.avatarUrls?.['48x48'],
                count: 0
              });
            }
            userMap.get(id).count += 1;
          }
        });
      }
    });

    const list = Array.from(userMap.values()).sort((a, b) => b.count - a.count);
    if (unassignedCount > 0) {
      list.push({ id: '__unassigned__', label: 'No Contributors', count: unassignedCount });
    }
    return list;
  }, [issues]);

  const availableIssueTypes = useMemo(() => {
    const typeMap = new Map();
    issues.forEach(i => {
      const t = i.fields?.issuetype?.name || 'Task';
      typeMap.set(t, (typeMap.get(t) || 0) + 1);
    });
    return Array.from(typeMap.entries()).map(([name, count]) => ({
      id: name,
      label: name,
      count
    })).sort((a, b) => b.count - a.count);
  }, [issues]);

  const availableStatuses = useMemo(() => {
    const statMap = new Map();
    issues.forEach(i => {
      const s = i.fields?.status?.name || 'Unknown';
      statMap.set(s, (statMap.get(s) || 0) + 1);
    });
    return Array.from(statMap.entries()).map(([name, count]) => ({
      id: name,
      label: name,
      count
    })).sort((a, b) => b.count - a.count);
  }, [issues]);

  // Apply Multi-Select Filters to get Filtered Issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // 1. Component Filter
      if (selectedComponents !== null) {
        const comps = issue.fields?.components || [];
        if (comps.length === 0) {
          if (!selectedComponents.includes('__none__')) return false;
        } else {
          const hasMatch = comps.some(c => selectedComponents.includes(c.name));
          if (!hasMatch) return false;
        }
      }

      // 2. Label Filter
      if (selectedLabels !== null) {
        const lbls = issue.fields?.labels || [];
        if (lbls.length === 0) {
          if (!selectedLabels.includes('__none__')) return false;
        } else {
          const hasMatch = lbls.some(l => selectedLabels.includes(l));
          if (!hasMatch) return false;
        }
      }

      // 3. Assignee Filter
      if (selectedAssignees !== null) {
        const accId = issue.fields?.assignee?.accountId;
        if (!accId) {
          if (!selectedAssignees.includes('__unassigned__')) return false;
        } else {
          if (!selectedAssignees.includes(accId)) return false;
        }
      }

      // 4. Worked By Filter
      if (selectedWorkedBy !== null) {
        const contributors = issue.contributors || [];
        if (contributors.length === 0) {
          if (!selectedWorkedBy.includes('__unassigned__')) return false;
        } else {
          const hasMatch = contributors.some(c => 
            selectedWorkedBy.includes(c.accountId) ||
            (c.emailAddress && selectedWorkedBy.includes(c.emailAddress)) ||
            (c.displayName && selectedWorkedBy.includes(c.displayName))
          );
          if (!hasMatch) return false;
        }
      }

      // 4. Issue Type Filter
      if (selectedIssueTypes !== null) {
        const t = issue.fields?.issuetype?.name || 'Task';
        if (!selectedIssueTypes.includes(t)) return false;
      }

      // 5. Status Filter
      if (selectedStatuses !== null) {
        const s = issue.fields?.status?.name || 'Unknown';
        if (!selectedStatuses.includes(s)) return false;
      }

      return true;
    });
  }, [issues, selectedComponents, selectedLabels, selectedAssignees, selectedWorkedBy, selectedIssueTypes, selectedStatuses]);

  // Determine active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedComponents !== null) count++;
    if (selectedLabels !== null) count++;
    if (selectedAssignees !== null) count++;
    if (selectedWorkedBy !== null) count++;
    if (selectedIssueTypes !== null) count++;
    if (selectedStatuses !== null) count++;
    return count;
  }, [selectedComponents, selectedLabels, selectedAssignees, selectedWorkedBy, selectedIssueTypes, selectedStatuses]);

  const handleResetFilters = () => {
    setSelectedComponents(null);
    setSelectedLabels(null);
    setSelectedAssignees(null);
    setSelectedWorkedBy(null);
    setSelectedIssueTypes(null);
    setSelectedStatuses(null);
    setTableSearch('');
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = filteredIssues.length;
    let resolvedCount = 0;
    let createdInPeriodCount = 0;
    let totalCycleTimeDays = 0;
    let cycleTimeCount = 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysFilter);

    filteredIssues.forEach(i => {
      const resolved = isIssueResolved(i);
      if (resolved) {
        resolvedCount++;
      }

      // Check if created within current daysFilter window
      if (i.fields?.created) {
        const createdDate = new Date(i.fields.created);
        if (createdDate >= cutoffDate) {
          createdInPeriodCount++;
        }
      }

      // Cycle time
      if (i.fields?.created && i.fields?.resolutiondate) {
        const cDate = new Date(i.fields.created);
        const rDate = new Date(i.fields.resolutiondate);
        const diffDays = (rDate - cDate) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0) {
          totalCycleTimeDays += diffDays;
          cycleTimeCount++;
        }
      }
    });

    const openCount = total - resolvedCount;
    const resolutionRate = total > 0 ? ((resolvedCount / total) * 100).toFixed(1) : '0.0';
    const velocityRatio = createdInPeriodCount > 0 
      ? (resolvedCount / createdInPeriodCount).toFixed(2) 
      : (resolvedCount > 0 ? '1.00' : '0.00');
    const avgCycleTime = cycleTimeCount > 0 
      ? (totalCycleTimeDays / cycleTimeCount).toFixed(1) 
      : null;

    return {
      total,
      resolvedCount,
      openCount,
      createdInPeriodCount,
      resolutionRate,
      velocityRatio,
      avgCycleTime
    };
  }, [filteredIssues, daysFilter]);

  // Breakdown by Status Category
  const statusCategoryBreakdown = useMemo(() => {
    const counts = { done: 0, 'in-progress': 0, qa: 0, todo: 0 };
    filteredIssues.forEach(i => {
      const cat = getStatusCategory(i.fields?.status?.name, i.fields?.status?.statusCategory?.key);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return [
      { id: 'done', label: 'Resolved / Closed', count: counts.done, color: '#10b981' },
      { id: 'in-progress', label: 'In Progress / Dev', count: counts['in-progress'], color: '#3b82f6' },
      { id: 'qa', label: 'In QA / Review', count: counts.qa, color: '#f59e0b' },
      { id: 'todo', label: 'To Do / Open', count: counts.todo, color: '#94a3b8' }
    ];
  }, [filteredIssues]);

  // Breakdown by Issue Type with Resolution Rate
  const issueTypeBreakdown = useMemo(() => {
    const map = new Map();
    filteredIssues.forEach(i => {
      const type = i.fields?.issuetype?.name || 'Task';
      if (!map.has(type)) {
        map.set(type, { type, total: 0, resolved: 0 });
      }
      const entry = map.get(type);
      entry.total += 1;
      if (isIssueResolved(i)) {
        entry.resolved += 1;
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map(entry => ({
        ...entry,
        rate: entry.total > 0 ? Math.round((entry.resolved / entry.total) * 100) : 0
      }));
  }, [filteredIssues]);

  // Breakdown by Component with Resolution Rate
  const componentBreakdown = useMemo(() => {
    const map = new Map();
    filteredIssues.forEach(i => {
      const comps = i.fields?.components || [];
      const resolved = isIssueResolved(i);
      const compNames = comps.length > 0 ? comps.map(c => c.name || 'Unnamed') : ['No Component'];
      
      compNames.forEach(name => {
        if (!map.has(name)) {
          map.set(name, { name, total: 0, resolved: 0 });
        }
        const e = map.get(name);
        e.total += 1;
        if (resolved) e.resolved += 1;
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8); // Top 8 components
  }, [filteredIssues]);

  // Define dynamic series based on chosen graphMetric dimension
  const seriesDefinitions = useMemo(() => {
    switch (graphMetric) {
      case 'created':
        return [{ id: 'created', label: 'Created Issues', color: '#f97316', key: 'created' }];
      case 'resolved':
        return [{ id: 'resolved', label: 'Resolved / Closed', color: '#10b981', key: 'resolved' }];
      case 'hours':
        return [{ id: 'hours', label: 'Logged Hours (hrs)', color: '#06b6d4', key: 'hours' }];
      case 'updated':
        return [{ id: 'updated', label: 'Updated / Active', color: '#8b5cf6', key: 'updated' }];
      case 'by_status':
        return [
          { id: 'done', label: 'Done / Resolved', color: '#10b981', key: 'status_done' },
          { id: 'in_progress', label: 'In Progress', color: '#3b82f6', key: 'status_in_progress' },
          { id: 'qa', label: 'QA / Review', color: '#f59e0b', key: 'status_qa' },
          { id: 'todo', label: 'To Do / Open', color: '#94a3b8', key: 'status_todo' }
        ];
      case 'by_issuetype': {
        const topTypes = issueTypeBreakdown.slice(0, 5);
        const palette = ['#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
        if (topTypes.length === 0) return [{ id: 'Task', label: 'Tasks', color: '#3b82f6', key: 'type_Task' }];
        return topTypes.map((t, idx) => ({
          id: t.type,
          label: t.type,
          color: palette[idx % palette.length],
          key: `type_${t.type}`
        }));
      }
      case 'by_priority':
        return [
          { id: 'Highest', label: 'Highest / Blocker', color: '#ef4444', key: 'prio_Highest' },
          { id: 'High', label: 'High', color: '#f97316', key: 'prio_High' },
          { id: 'Medium', label: 'Medium', color: '#eab308', key: 'prio_Medium' },
          { id: 'Low', label: 'Low', color: '#3b82f6', key: 'prio_Low' }
        ];
      case 'by_component': {
        const topComps = componentBreakdown.slice(0, 5);
        const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
        if (topComps.length === 0) return [{ id: 'No Component', label: 'All Components', color: '#3b82f6', key: 'comp_none' }];
        return topComps.map((c, idx) => ({
          id: c.name,
          label: c.name,
          color: palette[idx % palette.length],
          key: `comp_${c.name}`
        }));
      }
      case 'by_worker': {
        const topWorkers = availableWorkedBy.filter(u => u.id !== '__unassigned__').slice(0, 5);
        const palette = ['#6366f1', '#10b981', '#f97316', '#06b6d4', '#ec4899'];
        if (topWorkers.length === 0) return [{ id: 'all', label: 'All Contributors', color: '#6366f1', key: 'worker_all' }];
        return topWorkers.map((w, idx) => ({
          id: w.id,
          label: w.label,
          color: palette[idx % palette.length],
          key: `worker_${w.id}`
        }));
      }
      case 'created_vs_resolved':
      default:
        return [
          { id: 'created', label: 'Created', color: '#f97316', key: 'created' },
          { id: 'resolved', label: 'Resolved', color: '#10b981', key: 'resolved' }
        ];
    }
  }, [graphMetric, issueTypeBreakdown, componentBreakdown, availableWorkedBy]);

  // Active (non-disabled) series list
  const activeSeriesList = useMemo(() => {
    return seriesDefinitions.filter(s => !disabledSeries.has(s.id));
  }, [seriesDefinitions, disabledSeries]);

  const toggleSeries = (id) => {
    setDisabledSeries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Keep at least 1 series enabled
        if (seriesDefinitions.length - next.size > 1) {
          next.add(id);
        }
      }
      return next;
    });
  };

  // Timeline / Time-series Aggregation for all Dynamic Dimensions
  const timelineData = useMemo(() => {
    const dayMap = {};

    // Initialize all dates in range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = daysFilter - 1; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const key = date.toISOString().slice(0, 10);
      dayMap[key] = {
        dateStr: key,
        displayDate: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        created: 0,
        resolved: 0,
        hours: 0,
        updated: 0,
        values: {}
      };
    }

    filteredIssues.forEach(i => {
      const statusCat = getStatusCategory(i.fields?.status?.name, i.fields?.status?.statusCategory?.key);
      const isResolved = isIssueResolved(i);
      const typeName = i.fields?.issuetype?.name || 'Task';
      const prioName = i.fields?.priority?.name || 'Medium';
      const comps = (i.fields?.components || []).map(c => c.name);
      const contributors = i.contributors || [];

      // 1. Created date
      if (i.fields?.created) {
        const cKey = i.fields.created.slice(0, 10);
        if (dayMap[cKey]) {
          dayMap[cKey].created += 1;
          dayMap[cKey].values[`type_${typeName}`] = (dayMap[cKey].values[`type_${typeName}`] || 0) + 1;
          dayMap[cKey].values[`prio_${prioName}`] = (dayMap[cKey].values[`prio_${prioName}`] || 0) + 1;
          comps.forEach(cn => {
            dayMap[cKey].values[`comp_${cn}`] = (dayMap[cKey].values[`comp_${cn}`] || 0) + 1;
          });
        }
      }

      // 2. Resolved date
      if (i.fields?.resolutiondate) {
        const rKey = i.fields.resolutiondate.slice(0, 10);
        if (dayMap[rKey]) {
          dayMap[rKey].resolved += 1;
        }
      } else if (isResolved && i.fields?.updated) {
        const uKey = i.fields.updated.slice(0, 10);
        if (dayMap[uKey]) {
          dayMap[uKey].resolved += 1;
        }
      }

      // 3. Updated / Activity date
      if (i.fields?.updated) {
        const uKey = i.fields.updated.slice(0, 10);
        if (dayMap[uKey]) {
          dayMap[uKey].updated += 1;
          const statusKey = statusCat === 'in-progress' ? 'status_in_progress' : `status_${statusCat}`;
          dayMap[uKey].values[statusKey] = (dayMap[uKey].values[statusKey] || 0) + 1;
        }
      }

      // 4. Worklogs / Hours Logged
      const worklogs = i.fields?.worklog?.worklogs || [];
      worklogs.forEach(wl => {
        if (wl.started) {
          const wlKey = wl.started.slice(0, 10);
          if (dayMap[wlKey]) {
            const h = (wl.timeSpentSeconds || 0) / 3600;
            dayMap[wlKey].hours += h;
            if (wl.author?.accountId) {
              dayMap[wlKey].values[`worker_${wl.author.accountId}`] = (dayMap[wlKey].values[`worker_${wl.author.accountId}`] || 0) + h;
            }
          }
        }
      });

      // Contributors touchpoints
      contributors.forEach(c => {
        if (i.fields?.updated) {
          const uKey = i.fields.updated.slice(0, 10);
          if (dayMap[uKey]) {
            dayMap[uKey].values[`worker_${c.accountId}`] = (dayMap[uKey].values[`worker_${c.accountId}`] || 0) + 1;
          }
        }
      });
    });

    let rawList = Object.values(dayMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    // If timeframe is large (>45 days), group by week for smooth rendering
    if (daysFilter > 45) {
      const weekly = [];
      let currentChunk = null;
      rawList.forEach((item, idx) => {
        if (idx % 7 === 0 || !currentChunk) {
          if (currentChunk) weekly.push(currentChunk);
          currentChunk = {
            dateStr: item.dateStr,
            displayDate: item.displayDate,
            created: 0,
            resolved: 0,
            hours: 0,
            updated: 0,
            values: {}
          };
        }
        currentChunk.created += item.created;
        currentChunk.resolved += item.resolved;
        currentChunk.hours += item.hours;
        currentChunk.updated += item.updated;
        Object.entries(item.values).forEach(([k, v]) => {
          currentChunk.values[k] = (currentChunk.values[k] || 0) + v;
        });
      });
      if (currentChunk) weekly.push(currentChunk);
      rawList = weekly;
    }

    // Calculate cumulative values for every series
    const cumTracker = {};

    return rawList.map(item => {
      const pointValues = {
        created: item.created,
        resolved: item.resolved,
        hours: Number(item.hours.toFixed(1)),
        updated: item.updated,
        ...item.values
      };

      const cumValues = {};
      Object.entries(pointValues).forEach(([k, v]) => {
        cumTracker[k] = (cumTracker[k] || 0) + v;
        cumValues[k] = Number((cumTracker[k]).toFixed(1));
      });

      return {
        ...item,
        pointValues,
        cumValues,
        netChange: item.created - item.resolved
      };
    });
  }, [filteredIssues, daysFilter]);

  // Table Data Filtering
  const tableData = useMemo(() => {
    let list = filteredIssues;

    if (tableTab === 'resolved') {
      list = list.filter(i => isIssueResolved(i));
    } else if (tableTab === 'unresolved') {
      list = list.filter(i => !isIssueResolved(i));
    } else if (tableTab === 'created') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
      list = list.filter(i => i.fields?.created && new Date(i.fields.created) >= cutoffDate);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(i => {
        const matchKey = (i.key || '').toLowerCase().includes(q);
        const matchSummary = (i.fields?.summary || '').toLowerCase().includes(q);
        const matchAssignee = (i.fields?.assignee?.displayName || '').toLowerCase().includes(q);
        const matchStatus = (i.fields?.status?.name || '').toLowerCase().includes(q);
        return matchKey || matchSummary || matchAssignee || matchStatus;
      });
    }

    return list;
  }, [filteredIssues, tableTab, tableSearch, daysFilter]);

  // Export Table Data to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Key', 'Type', 'Summary', 'Status', 'Priority', 'Assignee', 'Components', 'Labels', 'Created', 'Resolved'];
      const rows = tableData.map(i => [
        i.key,
        i.fields?.issuetype?.name || '',
        `"${(i.fields?.summary || '').replace(/"/g, '""')}"`,
        i.fields?.status?.name || '',
        i.fields?.priority?.name || '',
        i.fields?.assignee?.displayName || 'Unassigned',
        `"${(i.fields?.components || []).map(c => c.name).join(', ')}"`,
        `"${(i.fields?.labels || []).join(', ')}"`,
        i.fields?.created ? i.fields.created.slice(0, 10) : '',
        i.fields?.resolutiondate ? i.fields.resolutiondate.slice(0, 10) : ''
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jira-analytics-${daysFilter}d-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export CSV:', e);
    }
  };

  // SVG Chart Geometry calculations
  const chartHeight = 250;
  const chartWidth = 720;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Maximum value across all active series
  const maxVal = useMemo(() => {
    if (timelineData.length === 0 || activeSeriesList.length === 0) return 10;
    let max = 0;

    timelineData.forEach(d => {
      const source = chartMode === 'cumulative' ? d.cumValues : d.pointValues;
      activeSeriesList.forEach(s => {
        const val = source[s.key] || source[s.id] || 0;
        if (val > max) max = val;
      });
    });

    return Math.max(max * 1.15, 5); // 15% headroom
  }, [timelineData, activeSeriesList, chartMode]);

  // Points calculation for all active series
  const points = useMemo(() => {
    if (timelineData.length === 0) return [];
    const len = timelineData.length;
    const xStep = len > 1 ? innerWidth / (len - 1) : innerWidth;

    return timelineData.map((d, i) => {
      const x = padding.left + (len > 1 ? i * xStep : innerWidth / 2);
      const source = chartMode === 'cumulative' ? d.cumValues : d.pointValues;
      
      const seriesValues = {};
      const seriesY = {};

      activeSeriesList.forEach(s => {
        const val = source[s.key] ?? source[s.id] ?? 0;
        seriesValues[s.id] = val;
        const y = padding.top + innerHeight - (val / maxVal) * innerHeight;
        seriesY[s.id] = isNaN(y) ? padding.top + innerHeight : y;
      });

      return {
        ...d,
        x,
        seriesValues,
        seriesY
      };
    });
  }, [timelineData, activeSeriesList, chartMode, maxVal, innerWidth, innerHeight]);

  // Create smooth bezier path string
  const createSplinePath = (pts, seriesId) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].seriesY[seriesId]}`;

    let path = `M ${pts[0].x} ${pts[0].seriesY[seriesId]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.seriesY[seriesId] + (p2.seriesY[seriesId] - p0.seriesY[seriesId]) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.seriesY[seriesId] - (p3.seriesY[seriesId] - p1.seriesY[seriesId]) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.seriesY[seriesId]}`;
    }
    return path;
  };

  // Create stepped staircase path
  const createSteppedPath = (pts, seriesId) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].seriesY[seriesId]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      path += ` H ${p2.x} V ${p2.seriesY[seriesId]}`;
    }
    return path;
  };

  return (
    <div className="flex-col gap-6" style={{ marginTop: '0.5rem' }}>
      {/* Top Header Controls Bar */}
      <div className="glass flex justify-between items-center" style={{ padding: '1rem 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex items-center gap-3">
          <TrendingUp size={22} style={{ color: 'var(--accent-color)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Jira Flow & Trend Analytics</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Created vs. Resolved velocity, resolution distribution, and workload insights
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Saved Views / Presets Dropdown */}
          <div ref={savedViewsDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setShowSavedViewsMenu(!showSavedViewsMenu)}
              style={{
                fontSize: '0.82rem',
                padding: '0.35rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeFilterId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: activeFilterId ? 'var(--accent-color)' : 'var(--border-color)',
                color: activeFilterId ? '#60a5fa' : 'var(--text-primary)',
                fontWeight: activeFilterId ? 600 : 400
              }}
            >
              <Bookmark size={14} style={{ color: activeFilterId ? 'var(--accent-color)' : 'var(--text-secondary)' }} />
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeFilterName ? `View: ${activeFilterName}` : `Saved Views (${savedFilters.length})`}
              </span>
              {isFilterModified && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} title="Filters modified from saved view"></span>}
              <ChevronDown size={13} style={{ opacity: 0.7, transform: showSavedViewsMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Saved Views Menu Popover */}
            {showSavedViewsMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: '280px',
                  maxWidth: '340px',
                  zIndex: 99999,
                  boxShadow: '0 20px 45px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.18)'
                }}
              >
                <div className="flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Saved Filter Presets
                  </span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setShowSavedViewsMenu(false);
                      setShowSaveModal(true);
                    }}
                    style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'var(--accent-color)' }}
                  >
                    <Plus size={12} /> Save Current
                  </button>
                </div>

                {/* Preset List */}
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {savedFilters.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      No saved views yet. Click "Save Current" to bookmark this filter configuration.
                    </div>
                  ) : (
                    savedFilters.map(filter => {
                      const isActive = filter.id === activeFilterId;
                      return (
                        <div
                          key={filter.id}
                          onClick={() => handleApplySavedFilter(filter)}
                          className="flex justify-between items-center"
                          style={{
                            padding: '0.45rem 0.55rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: isActive ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleDefault(filter.id, e)}
                              title={filter.isDefault ? "Default startup view (click to unset)" : "Set as default startup view"}
                              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: filter.isDefault ? '#eab308' : 'var(--text-muted)' }}
                            >
                              <Star size={13} fill={filter.isDefault ? '#eab308' : 'none'} />
                            </button>
                            <span style={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#60a5fa' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {filter.name}
                            </span>
                            {isActive && <Check size={12} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSavedFilter(filter.id, e)}
                              title="Delete preset"
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Project:</span>
            <select
              value={projectKey}
              onChange={e => setProjectKey(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <option value="">All Projects</option>
              {detectedProject && <option value={detectedProject}>{detectedProject} Project</option>}
              <option value="CS">CS</option>
              <option value="OMAN">OMAN</option>
              <option value="DIG">DIG</option>
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={daysFilter}
              onChange={e => setDaysFilter(Number(e.target.value))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={180}>Last 6 Months</option>
              <option value={365}>Last 1 Year</option>
            </select>
          </div>

          <button 
            type="button" 
            className="btn" 
            onClick={loadData} 
            disabled={loading}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
          >
            <RefreshCcw size={14} className={loading ? 'spinner' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Multi-Select Filters Bar */}
      <div className="glass flex justify-between items-center" style={{ padding: '0.85rem 1.25rem', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.75)', position: 'relative', zIndex: 100, overflow: 'visible' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '4px' }}>
            <Filter size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
            Filters:
          </span>

          {/* 1. Components Multi-Select */}
          <MultiSelectDropdown
            title="Components"
            allLabel="All Components"
            options={availableComponents}
            selected={selectedComponents}
            onChange={setSelectedComponents}
            icon={Layers}
            searchPlaceholder="Search components..."
          />

          {/* 2. Labels Multi-Select */}
          <MultiSelectDropdown
            title="Labels"
            allLabel="All Labels"
            options={availableLabels}
            selected={selectedLabels}
            onChange={setSelectedLabels}
            icon={Tag}
            searchPlaceholder="Search labels..."
          />

          {/* 3. Assignees Multi-Select */}
          <MultiSelectDropdown
            title="Assignees"
            allLabel="All Assignees"
            options={availableAssignees}
            selected={selectedAssignees}
            onChange={setSelectedAssignees}
            icon={User}
            searchPlaceholder="Search assignees..."
            renderOption={(opt, isChecked) => (
              <div className="flex items-center gap-2" style={{ flexGrow: 1, minWidth: 0 }}>
                {opt.avatarUrl ? (
                  <img src={opt.avatarUrl} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                ) : (
                  <User size={14} style={{ color: 'var(--accent-color)' }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
              </div>
            )}
          />

          {/* 4. Worked By (Contributors) Multi-Select */}
          <MultiSelectDropdown
            title="Worked By"
            allLabel="All Contributors"
            options={availableWorkedBy}
            selected={selectedWorkedBy}
            onChange={setSelectedWorkedBy}
            icon={User}
            searchPlaceholder="Search contributors..."
            renderOption={(opt, isChecked) => (
              <div className="flex items-center gap-2" style={{ flexGrow: 1, minWidth: 0 }}>
                {opt.avatarUrl ? (
                  <img src={opt.avatarUrl} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                ) : (
                  <User size={14} style={{ color: '#34d399' }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
              </div>
            )}
          />

          {/* 4. Issue Types Multi-Select */}
          <MultiSelectDropdown
            title="Issue Types"
            allLabel="All Types"
            options={availableIssueTypes}
            selected={selectedIssueTypes}
            onChange={setSelectedIssueTypes}
            searchPlaceholder="Search types..."
          />

          {/* 5. Statuses Multi-Select */}
          <MultiSelectDropdown
            title="Statuses"
            allLabel="All Statuses"
            options={availableStatuses}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
            searchPlaceholder="Search statuses..."
          />

          {/* Save / Update View Actions */}
          {activeFilterId && isFilterModified ? (
            <div className="flex items-center gap-1.5" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 500 }}>
                ● {activeFilterName} (modified)
              </span>
              <button
                type="button"
                className="btn"
                onClick={handleUpdateActiveFilter}
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', background: '#f59e0b', color: '#000', border: 'none', fontWeight: 600 }}
                title="Update active preset with current filters"
              >
                <Save size={11} /> Update
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setShowSaveModal(true)}
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)' }}
                title="Save as a new preset"
              >
                Save As New
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => setShowSaveModal(true)}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                background: 'rgba(59, 130, 246, 0.12)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                color: '#60a5fa'
              }}
              title="Bookmark current filter configuration as a saved view"
            >
              <Bookmark size={12} /> Save View
            </button>
          )}

          {/* Reset Filters Shortcut */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              className="btn"
              onClick={handleResetFilters}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'var(--danger-color)'
              }}
            >
              <X size={12} /> Reset Filters ({activeFiltersCount})
            </button>
          )}
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Matching <strong>{filteredIssues.length}</strong> of {issues.length} total issues
        </span>
      </div>

      {/* Save Filter View Modal Dialog */}
      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '1rem'
          }}
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="glass"
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div className="flex items-center gap-2">
                <Bookmark size={18} style={{ color: 'var(--accent-color)' }} />
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Save Filter View</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentFilter} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex-col gap-1.5">
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  View Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Core Team CS (30d), Production Bugs..."
                  value={newFilterName}
                  onChange={e => setNewFilterName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '0.6rem 0.8rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Set as Default View Checkbox */}
              <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={isDefaultCheckbox}
                  onChange={e => setIsDefaultCheckbox(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                />
                <span className="flex items-center gap-1.5">
                  <Star size={13} style={{ color: isDefaultCheckbox ? '#eab308' : 'var(--text-secondary)' }} fill={isDefaultCheckbox ? '#eab308' : 'none'} />
                  Set as default view on startup
                </span>
              </label>

              {/* Preview Configuration Tags */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Filters Included in this View:
                </span>
                <div className="flex gap-1.5 flex-wrap" style={{ fontSize: '0.74rem' }}>
                  <span className="tag" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>Timeframe: {daysFilter}d</span>
                  <span className="tag" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>Project: {projectKey || 'All'}</span>
                  <span className="tag" style={{ background: 'rgba(255,255,255,0.08)' }}>Graph: {graphMetric}</span>
                  <span className="tag" style={{ background: 'rgba(255,255,255,0.08)' }}>Components: {selectedComponents ? `${selectedComponents.length} selected` : 'All'}</span>
                  <span className="tag" style={{ background: 'rgba(255,255,255,0.08)' }}>Assignees: {selectedAssignees ? `${selectedAssignees.length} selected` : 'All'}</span>
                  <span className="tag" style={{ background: 'rgba(255,255,255,0.08)' }}>Worked By: {selectedWorkedBy ? `${selectedWorkedBy.length} selected` : 'All'}</span>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowSaveModal(false)}
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={!newFilterName.trim()}
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.82rem',
                    background: 'var(--accent-color)',
                    color: '#fff',
                    borderColor: 'var(--accent-color)',
                    fontWeight: 600
                  }}
                >
                  <Save size={13} /> Save View
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Message Display */}
      {error && (
        <div className="glass flex items-center gap-3" style={{ padding: '1rem 1.25rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px' }}>
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {/* Total Issues */}
        <div className="glass flex-col gap-1" style={{ padding: '1.25rem', borderRadius: '10px' }}>
          <div className="flex justify-between items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            <span>Total In Scope</span>
            <Layers size={16} style={{ color: 'var(--accent-color)' }} />
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.total}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Active & resolved matching filters
          </span>
        </div>

        {/* Resolved / Closed */}
        <div className="glass flex-col gap-1" style={{ padding: '1.25rem', borderRadius: '10px', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), transparent)' }}>
          <div className="flex justify-between items-center" style={{ color: '#34d399', fontSize: '0.82rem' }}>
            <span>Resolved / Closed</span>
            <CheckCircle2 size={16} />
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
            {metrics.resolvedCount}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <strong>{metrics.resolutionRate}%</strong> resolution rate
          </span>
        </div>

        {/* Created in Period */}
        <div className="glass flex-col gap-1" style={{ padding: '1.25rem', borderRadius: '10px', borderColor: 'rgba(249, 115, 22, 0.3)', background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08), transparent)' }}>
          <div className="flex justify-between items-center" style={{ color: '#fb923c', fontSize: '0.82rem' }}>
            <span>Created in Period</span>
            <Flame size={16} />
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f97316' }}>
            {metrics.createdInPeriodCount}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            New tickets in last {daysFilter}d
          </span>
        </div>

        {/* Open Backlog */}
        <div className="glass flex-col gap-1" style={{ padding: '1.25rem', borderRadius: '10px' }}>
          <div className="flex justify-between items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            <span>Open Backlog</span>
            <Clock size={16} style={{ color: '#60a5fa' }} />
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#60a5fa' }}>
            {metrics.openCount}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            To Do, In Progress, In QA
          </span>
        </div>

        {/* Velocity Ratio */}
        <div className="glass flex-col gap-1" style={{ padding: '1.25rem', borderRadius: '10px' }}>
          <div className="flex justify-between items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            <span>Velocity Ratio</span>
            <BarChart3 size={16} style={{ color: Number(metrics.velocityRatio) >= 1 ? 'var(--success-color)' : 'var(--warning-color)' }} />
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: Number(metrics.velocityRatio) >= 1 ? 'var(--success-color)' : '#f59e0b' }}>
            {metrics.velocityRatio}x
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {Number(metrics.velocityRatio) >= 1 ? '🟢 Reducing backlog' : '🟡 Backlog growing'}
          </span>
        </div>

        {/* Cycle Time */}
        <div className="glass flex-col gap-1" style={{ padding: '1.25rem', borderRadius: '10px' }}>
          <div className="flex justify-between items-center" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            <span>Avg Resolution Time</span>
            <Clock size={16} style={{ color: 'var(--accent-color)' }} />
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.avgCycleTime ? `${metrics.avgCycleTime}d` : '-'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Average cycle days to resolve
          </span>
        </div>
      </div>

      {/* SECTION 1: Configurable & Multi-Dimensional Trend Chart */}
      <div className="glass flex-col gap-4" style={{ padding: '1.5rem', borderRadius: '12px' }}>
        <div className="flex justify-between items-center flex-wrap gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
          
          {/* Left: Metric Dimension Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <BarChart3 size={18} style={{ color: 'var(--accent-color)' }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Graph Field / Dimension:</span>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <select
                value={graphMetric}
                onChange={e => {
                  setGraphMetric(e.target.value);
                  setDisabledSeries(new Set());
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="created_vs_resolved">📈 Created vs. Resolved Flow</option>
                <option value="created">🔴 Created Issues Trend</option>
                <option value="resolved">🟢 Resolved / Closed Trend</option>
                <option value="hours">⏱️ Logged Work Hours (Time Spent)</option>
                <option value="updated">⚡ Updated / Touchpoint Activity</option>
                <option value="by_status">📊 By Status Breakdown</option>
                <option value="by_issuetype">🏷️ By Issue Type (Bug/Story/Task)</option>
                <option value="by_priority">🔥 By Priority (Highest to Low)</option>
                <option value="by_component">📦 By Top Components</option>
                <option value="by_worker">👥 By Top Contributors / Worked By</option>
              </select>
            </div>
          </div>

          {/* Right: Chart Type & Mode Toggles */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Visual Style Toggle (Spline, Stepped, Bars) */}
            <div className="flex" style={{ background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setChartType('spline')}
                title="Smooth Spline Curves"
                style={{
                  padding: '0.2rem 0.55rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  background: chartType === 'spline' ? 'var(--accent-color)' : 'transparent',
                  color: chartType === 'spline' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: chartType === 'spline' ? 600 : 400,
                  borderRadius: '4px'
                }}
              >
                Spline
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setChartType('stepped')}
                title="Stepped Lines"
                style={{
                  padding: '0.2rem 0.55rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  background: chartType === 'stepped' ? 'var(--accent-color)' : 'transparent',
                  color: chartType === 'stepped' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: chartType === 'stepped' ? 600 : 400,
                  borderRadius: '4px'
                }}
              >
                Stepped
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setChartType('bars')}
                title="Vertical Grouped Bars"
                style={{
                  padding: '0.2rem 0.55rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  background: chartType === 'bars' ? 'var(--accent-color)' : 'transparent',
                  color: chartType === 'bars' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: chartType === 'bars' ? 600 : 400,
                  borderRadius: '4px'
                }}
              >
                Bars
              </button>
            </div>

            {/* Daily Flow vs Cumulative Toggle */}
            <div className="flex" style={{ background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setChartMode('flow')}
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  background: chartMode === 'flow' ? 'var(--accent-color)' : 'transparent',
                  color: chartMode === 'flow' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: chartMode === 'flow' ? 600 : 400,
                  borderRadius: '4px'
                }}
              >
                Daily Flow
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setChartMode('cumulative')}
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  background: chartMode === 'cumulative' ? 'var(--accent-color)' : 'transparent',
                  color: chartMode === 'cumulative' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: chartMode === 'cumulative' ? 600 : 400,
                  borderRadius: '4px'
                }}
              >
                Cumulative Burnup
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Legend with click-to-toggle series badges */}
        <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Series:
          </span>
          {seriesDefinitions.map(s => {
            const isVisible = !disabledSeries.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSeries(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: isVisible ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isVisible ? s.color : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '12px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  opacity: isVisible ? 1 : 0.45,
                  transition: 'all 0.15s ease'
                }}
                title={isVisible ? `Click to hide ${s.label}` : `Click to show ${s.label}`}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }}></span>
                <span style={{ color: isVisible ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isVisible ? 500 : 400 }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* SVG Chart Render */}
        {loading && issues.length === 0 ? (
          <div className="flex justify-center items-center" style={{ height: `${chartHeight}px` }}>
            <Loader2 className="spinner" size={30} style={{ color: 'var(--accent-color)' }} />
          </div>
        ) : points.length === 0 ? (
          <div className="flex justify-center items-center" style={{ height: `${chartHeight}px`, color: 'var(--text-secondary)' }}>
            No issue activity recorded in the selected period.
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', height: 'auto', minWidth: '550px', overflow: 'visible' }}
            >
              <defs>
                {/* Dynamic Series Gradients */}
                {activeSeriesList.map(s => (
                  <linearGradient key={s.id} id={`grad_${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
                  </linearGradient>
                ))}
              </defs>

              {/* Grid Lines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = padding.top + innerHeight * ratio;
                const valueLabel = Math.round(maxVal * (1 - ratio));
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + innerWidth}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.07)"
                      strokeDasharray={ratio === 1 ? undefined : "3,3"}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      fill="var(--text-secondary)"
                      fontSize="10"
                      textAnchor="end"
                    >
                      {valueLabel}
                    </text>
                  </g>
                );
              })}

              {/* Render Chart Based on Visual Type (Bars vs Lines/Splines) */}
              {chartType === 'bars' ? (
                // Grouped Bar Columns
                points.map((pt, pIdx) => {
                  const numSeries = activeSeriesList.length;
                  const totalGroupWidth = Math.max(innerWidth / points.length - 4, 4);
                  const barWidth = Math.max(totalGroupWidth / numSeries - 1, 2);
                  const groupStartX = pt.x - totalGroupWidth / 2;

                  return (
                    <g key={pIdx}>
                      {activeSeriesList.map((s, sIdx) => {
                        const val = pt.seriesValues[s.id] || 0;
                        const barHeight = Math.max((val / maxVal) * innerHeight, 0);
                        const bx = groupStartX + sIdx * (barWidth + 1);
                        const by = padding.top + innerHeight - barHeight;

                        return (
                          <rect
                            key={s.id}
                            x={bx}
                            y={by}
                            width={barWidth}
                            height={barHeight}
                            fill={s.color}
                            opacity={hoveredDataPoint?.dateStr === pt.dateStr ? 1 : 0.85}
                            rx="2"
                          />
                        );
                      })}
                    </g>
                  );
                })
              ) : (
                // Spline or Stepped Line Render
                <>
                  {/* Area Fills for top 2 series if spline */}
                  {chartType === 'spline' && activeSeriesList.slice(0, 2).map(s => {
                    const linePath = createSplinePath(points, s.id);
                    if (!linePath || points.length < 2) return null;
                    const bottomY = padding.top + innerHeight;
                    const areaPath = `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
                    return (
                      <path
                        key={`area_${s.id}`}
                        d={areaPath}
                        fill={`url(#grad_${s.id})`}
                      />
                    );
                  })}

                  {/* Lines for each active series */}
                  {activeSeriesList.map(s => {
                    const linePath = chartType === 'stepped'
                      ? createSteppedPath(points, s.id)
                      : createSplinePath(points, s.id);

                    return (
                      <path
                        key={`line_${s.id}`}
                        d={linePath}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  {/* Data Point Circles */}
                  {points.map((pt, pIdx) => {
                    const isHovered = hoveredDataPoint?.dateStr === pt.dateStr;
                    return (
                      <g key={pIdx}>
                        {activeSeriesList.map(s => (
                          <circle
                            key={s.id}
                            cx={pt.x}
                            cy={pt.seriesY[s.id]}
                            r={isHovered ? 4.5 : 2.5}
                            fill={s.color}
                            stroke="#0f172a"
                            strokeWidth="1.5"
                          />
                        ))}
                      </g>
                    );
                  })}
                </>
              )}

              {/* Invisible Hover Rectangles */}
              {points.map((pt, idx) => (
                <rect
                  key={idx}
                  x={pt.x - innerWidth / (points.length * 2)}
                  y={padding.top}
                  width={innerWidth / points.length}
                  height={innerHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredDataPoint(pt)}
                  onMouseLeave={() => setHoveredDataPoint(null)}
                />
              ))}

              {/* X-Axis Date Labels */}
              {points.map((pt, idx) => {
                const step = Math.ceil(points.length / 8);
                if (idx % step !== 0 && idx !== points.length - 1) return null;
                return (
                  <text
                    key={idx}
                    x={pt.x}
                    y={padding.top + innerHeight + 20}
                    fill="var(--text-secondary)"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {pt.displayDate}
                  </text>
                );
              })}
            </svg>

            {/* Dynamic Multi-Series Hover Tooltip Card */}
            {hoveredDataPoint && (
              <div
                className="glass"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '20px',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  background: 'rgba(15, 23, 42, 0.94)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 20,
                  minWidth: '160px'
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '3px' }}>
                  {hoveredDataPoint.displayDate} ({hoveredDataPoint.dateStr})
                </span>

                {activeSeriesList.map(s => {
                  const val = hoveredDataPoint.seriesValues[s.id] ?? 0;
                  return (
                    <div key={s.id} className="flex justify-between items-center gap-3">
                      <span style={{ color: s.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }}></span>
                        {s.label}:
                      </span>
                      <strong>{val}</strong>
                    </div>
                  );
                })}

                {graphMetric === 'created_vs_resolved' && chartMode === 'flow' && (
                  <div className="flex justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '3px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Net Velocity:</span>
                    <strong style={{ color: hoveredDataPoint.netChange > 0 ? '#f97316' : '#10b981' }}>
                      {hoveredDataPoint.netChange > 0 ? `+${hoveredDataPoint.netChange}` : hoveredDataPoint.netChange}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Total Issues vs. Closed/Resolved & Distributions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Distribution 1: Status Category Breakdown */}
        <div className="glass flex-col gap-3" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div className="flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <PieChart size={16} style={{ color: 'var(--accent-color)' }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Status & Resolution Distribution</h4>
          </div>

          <div className="flex-col gap-3" style={{ marginTop: '0.25rem' }}>
            {statusCategoryBreakdown.map(cat => {
              const pct = metrics.total > 0 ? Math.round((cat.count / metrics.total) * 100) : 0;
              return (
                <div key={cat.id} className="flex-col gap-1">
                  <div className="flex justify-between items-center" style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }}></span>
                      {cat.label}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{cat.count}</strong> ({pct}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: cat.color, borderRadius: '3px', transition: 'width 0.4s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribution 2: Issue Type Resolution Rate */}
        <div className="glass flex-col gap-3" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div className="flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <Layers size={16} style={{ color: 'var(--accent-color)' }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Resolution Rate by Issue Type</h4>
          </div>

          <div className="flex-col gap-2.5" style={{ marginTop: '0.25rem' }}>
            {issueTypeBreakdown.slice(0, 5).map(item => (
              <div key={item.type} className="flex-col gap-1">
                <div className="flex justify-between items-center" style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {item.type}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {item.resolved} / {item.total} resolved (<strong>{item.rate}%</strong>)
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${item.rate}%`, 
                      height: '100%', 
                      background: item.rate >= 75 ? '#10b981' : item.rate >= 40 ? '#3b82f6' : '#f59e0b', 
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
              </div>
            ))}
            {issueTypeBreakdown.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '1rem' }}>
                No issues match filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Distribution 3: Top Components Volume */}
        <div className="glass flex-col gap-3" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <div className="flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <Tag size={16} style={{ color: 'var(--accent-color)' }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Component Volume & Completion</h4>
          </div>

          <div className="flex-col gap-2.5" style={{ marginTop: '0.25rem' }}>
            {componentBreakdown.slice(0, 5).map(item => {
              const compRate = item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0;
              return (
                <div key={item.name} className="flex-col gap-1">
                  <div className="flex justify-between items-center" style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {item.resolved}/{item.total} (<strong>{compRate}%</strong>)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${compRate}%`, height: '100%', background: 'var(--accent-color)', borderRadius: '3px' }}></div>
                  </div>
                </div>
              );
            })}
            {componentBreakdown.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '1rem' }}>
                No component data available.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: Detailed Issues Drill-Down Table */}
      <div className="glass flex-col gap-4" style={{ padding: '1.5rem', borderRadius: '12px' }}>
        <div className="flex justify-between items-center flex-wrap gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
          
          {/* Table Tab Selector */}
          <div className="flex items-center gap-1" style={{ background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setTableTab('all')}
              style={{
                border: 'none',
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                background: tableTab === 'all' ? 'var(--surface-color-light)' : 'transparent',
                color: tableTab === 'all' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: tableTab === 'all' ? 600 : 400,
                borderRadius: '6px'
              }}
            >
              All Issues ({filteredIssues.length})
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => setTableTab('created')}
              style={{
                border: 'none',
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                background: tableTab === 'created' ? 'var(--surface-color-light)' : 'transparent',
                color: tableTab === 'created' ? '#f97316' : 'var(--text-secondary)',
                fontWeight: tableTab === 'created' ? 600 : 400,
                borderRadius: '6px'
              }}
            >
              🔴 Created in Period ({metrics.createdInPeriodCount})
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => setTableTab('resolved')}
              style={{
                border: 'none',
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                background: tableTab === 'resolved' ? 'var(--surface-color-light)' : 'transparent',
                color: tableTab === 'resolved' ? '#10b981' : 'var(--text-secondary)',
                fontWeight: tableTab === 'resolved' ? 600 : 400,
                borderRadius: '6px'
              }}
            >
              🟢 Resolved ({metrics.resolvedCount})
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => setTableTab('unresolved')}
              style={{
                border: 'none',
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                background: tableTab === 'unresolved' ? 'var(--surface-color-light)' : 'transparent',
                color: tableTab === 'unresolved' ? '#60a5fa' : 'var(--text-secondary)',
                fontWeight: tableTab === 'unresolved' ? 600 : 400,
                borderRadius: '6px'
              }}
            >
              🟡 Open / Backlog ({metrics.openCount})
            </button>
          </div>

          {/* Table Search & Export Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <Search size={13} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Filter table..."
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', width: '130px' }}
              />
              {tableSearch && (
                <button onClick={() => setTableSearch('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn"
              onClick={handleExportCSV}
              disabled={tableData.length === 0}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.04)' }}
              title="Export filtered issues to CSV"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Table View */}
        {tableData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            No issues found matching this filter view.
          </div>
        ) : (
          <div className="jira-issues-table-wrap">
            <table className="jira-issues-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Key</th>
                  <th style={{ width: '90px' }}>Type</th>
                  <th>Summary</th>
                  <th style={{ width: '140px' }}>Assignee</th>
                  <th style={{ minWidth: '160px' }}>Worked By (Contributors)</th>
                  <th style={{ width: '130px' }}>Component</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th style={{ width: '90px' }}>Priority</th>
                  <th style={{ width: '100px' }}>Created</th>
                  <th style={{ width: '100px' }}>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(issue => {
                  const statusName = issue.fields?.status?.name || 'Unknown';
                  const cat = getStatusCategory(statusName, issue.fields?.status?.statusCategory?.key);
                  const isResolved = isIssueResolved(issue);
                  const assigneeName = issue.fields?.assignee?.displayName || 'Unassigned';
                  const assigneeAvatar = issue.fields?.assignee?.avatarUrls?.['24x24'];
                  const components = issue.fields?.components || [];
                  const priorityName = issue.fields?.priority?.name;
                  const contributors = issue.contributors || [];

                  return (
                    <tr key={issue.key}>
                      {/* Key */}
                      <td>
                        <a
                          href={`https://omantel-om.atlassian.net/browse/${issue.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jira-ticket-key-link"
                          title="Open ticket in Jira Cloud"
                        >
                          {issue.key} <ExternalLink size={11} />
                        </a>
                      </td>

                      {/* Type */}
                      <td>
                        <span className="tag" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '0.72rem' }}>
                          {issue.fields?.issuetype?.name || 'Task'}
                        </span>
                      </td>

                      {/* Summary */}
                      <td>
                        <div style={{ maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={issue.fields?.summary}>
                          {issue.fields?.summary}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          {assigneeAvatar ? (
                            <img src={assigneeAvatar} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                          ) : (
                            <User size={13} style={{ color: 'var(--accent-color)' }} />
                          )}
                          <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                            {assigneeName}
                          </span>
                        </div>
                      </td>

                      {/* Worked By (Contributors) */}
                      <td>
                        {contributors.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {contributors.map(c => {
                              const rolesStr = (c.roles || []).join(', ');
                              const hoursStr = c.hoursLogged > 0 ? ` • ${c.hoursLogged.toFixed(1)}h logged` : '';
                              const tooltip = `${c.displayName} (${rolesStr}${hoursStr})`;

                              return (
                                <div
                                  key={c.accountId}
                                  className="flex items-center gap-1"
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    borderRadius: '12px',
                                    padding: '2px 6px',
                                    fontSize: '0.72rem',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                  }}
                                  title={tooltip}
                                >
                                  {c.avatarUrl ? (
                                    <img src={c.avatarUrl} alt="" style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
                                  ) : (
                                    <User size={10} style={{ color: 'var(--accent-color)' }} />
                                  )}
                                  <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.displayName.split(' ')[0]}
                                  </span>
                                  {c.hoursLogged > 0 && (
                                    <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.68rem' }}>
                                      {c.hoursLogged.toFixed(1)}h
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>-</span>
                        )}
                      </td>

                      {/* Components */}
                      <td>
                        {components.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {components.map(c => (
                              <span key={c.name} className="tag" style={{ fontSize: '0.7rem', padding: '0.05rem 0.35rem', background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
                                {c.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`jira-status-badge ${cat}`}>
                          {statusName}
                        </span>
                      </td>

                      {/* Priority */}
                      <td>
                        {priorityName ? (
                          <span className="tag" style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)' }}>
                            {priorityName}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>

                      {/* Created */}
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {issue.fields?.created ? issue.fields.created.slice(0, 10) : '-'}
                        </span>
                      </td>

                      {/* Resolved */}
                      <td>
                        <span style={{ fontSize: '0.78rem', color: isResolved ? '#10b981' : 'var(--text-muted)' }}>
                          {issue.fields?.resolutiondate 
                            ? issue.fields.resolutiondate.slice(0, 10) 
                            : (isResolved ? 'Resolved' : '-')}
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
    </div>
  );
}
