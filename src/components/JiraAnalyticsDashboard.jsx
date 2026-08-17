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
  HelpCircle
} from 'lucide-react';
import '../jira.css';

export default function JiraAnalyticsDashboard({ config }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Timeframe Filter (Days)
  const [daysFilter, setDaysFilter] = useState(30);

  // Optional Project Key Filter (e.g. 'CS' or '' for All)
  const detectedProject = useMemo(() => {
    if (config?.bauTicket) {
      const match = config.bauTicket.match(/^([A-Z]+)-/);
      if (match) return match[1];
    }
    return '';
  }, [config?.bauTicket]);

  const [projectKey, setProjectKey] = useState('');

  // Multi-Select Filters (null = All selected)
  const [selectedComponents, setSelectedComponents] = useState(null);
  const [selectedLabels, setSelectedLabels] = useState(null);
  const [selectedAssignees, setSelectedAssignees] = useState(null);
  const [selectedIssueTypes, setSelectedIssueTypes] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState(null);

  // Chart Mode: 'flow' (Per Day/Interval) or 'cumulative' (Burnup)
  const [chartMode, setChartMode] = useState('flow');
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);

  // Table Tab: 'all', 'created', 'resolved', 'unresolved'
  const [tableTab, setTableTab] = useState('all');
  const [tableSearch, setTableSearch] = useState('');

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
  }, [issues, selectedComponents, selectedLabels, selectedAssignees, selectedIssueTypes, selectedStatuses]);

  // Determine active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedComponents !== null) count++;
    if (selectedLabels !== null) count++;
    if (selectedAssignees !== null) count++;
    if (selectedIssueTypes !== null) count++;
    if (selectedStatuses !== null) count++;
    return count;
  }, [selectedComponents, selectedLabels, selectedAssignees, selectedIssueTypes, selectedStatuses]);

  const handleResetFilters = () => {
    setSelectedComponents(null);
    setSelectedLabels(null);
    setSelectedAssignees(null);
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

  // Timeline / Time-series Aggregation for Created vs. Resolved
  const timelineData = useMemo(() => {
    const intervals = Math.min(daysFilter, 90);
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
        createdTickets: [],
        resolvedTickets: []
      };
    }

    filteredIssues.forEach(i => {
      // Created date
      if (i.fields?.created) {
        const cKey = i.fields.created.slice(0, 10);
        if (dayMap[cKey]) {
          dayMap[cKey].created += 1;
          dayMap[cKey].createdTickets.push(i.key);
        }
      }

      // Resolved date
      if (i.fields?.resolutiondate) {
        const rKey = i.fields.resolutiondate.slice(0, 10);
        if (dayMap[rKey]) {
          dayMap[rKey].resolved += 1;
          dayMap[rKey].resolvedTickets.push(i.key);
        }
      } else if (isIssueResolved(i) && i.fields?.updated) {
        const uKey = i.fields.updated.slice(0, 10);
        if (dayMap[uKey]) {
          dayMap[uKey].resolved += 1;
          dayMap[uKey].resolvedTickets.push(i.key);
        }
      }
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
            createdTickets: [],
            resolvedTickets: []
          };
        }
        currentChunk.created += item.created;
        currentChunk.resolved += item.resolved;
        currentChunk.createdTickets.push(...item.createdTickets);
        currentChunk.resolvedTickets.push(...item.resolvedTickets);
      });
      if (currentChunk) weekly.push(currentChunk);
      rawList = weekly;
    }

    // Calculate cumulative if needed
    let cumCreated = 0;
    let cumResolved = 0;

    return rawList.map(item => {
      cumCreated += item.created;
      cumResolved += item.resolved;
      return {
        ...item,
        cumCreated,
        cumResolved,
        netChange: item.created - item.resolved
      };
    });
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
  const chartHeight = 240;
  const chartWidth = 720;
  const padding = { top: 20, right: 30, bottom: 35, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxVal = useMemo(() => {
    if (timelineData.length === 0) return 10;
    const keyCreated = chartMode === 'cumulative' ? 'cumCreated' : 'created';
    const keyResolved = chartMode === 'cumulative' ? 'cumResolved' : 'resolved';
    const max = Math.max(...timelineData.map(d => Math.max(d[keyCreated], d[keyResolved])));
    return Math.max(max * 1.15, 5); // 15% headroom
  }, [timelineData, chartMode]);

  const points = useMemo(() => {
    if (timelineData.length === 0) return [];
    const len = timelineData.length;
    const xStep = len > 1 ? innerWidth / (len - 1) : innerWidth;

    return timelineData.map((d, i) => {
      const x = padding.left + (len > 1 ? i * xStep : innerWidth / 2);
      const valCreated = chartMode === 'cumulative' ? d.cumCreated : d.created;
      const valResolved = chartMode === 'cumulative' ? d.cumResolved : d.resolved;
      
      const yCreated = padding.top + innerHeight - (valCreated / maxVal) * innerHeight;
      const yResolved = padding.top + innerHeight - (valResolved / maxVal) * innerHeight;

      return {
        ...d,
        x,
        yCreated: isNaN(yCreated) ? padding.top + innerHeight : yCreated,
        yResolved: isNaN(yResolved) ? padding.top + innerHeight : yResolved,
        valCreated,
        valResolved
      };
    });
  }, [timelineData, chartMode, maxVal, innerWidth, innerHeight]);

  // Create smooth bezier path string
  const createSplinePath = (pts, keyY) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0][keyY]}`;

    let path = `M ${pts[0].x} ${pts[0][keyY]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1[keyY] + (p2[keyY] - p0[keyY]) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2[keyY] - (p3[keyY] - p1[keyY]) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2[keyY]}`;
    }
    return path;
  };

  const createdPath = useMemo(() => createSplinePath(points, 'yCreated'), [points]);
  const resolvedPath = useMemo(() => createSplinePath(points, 'yResolved'), [points]);

  const createdAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const bottomY = padding.top + innerHeight;
    return `${createdPath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [createdPath, points, innerHeight]);

  const resolvedAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const bottomY = padding.top + innerHeight;
    return `${resolvedPath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [resolvedPath, points, innerHeight]);

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

        <div className="flex items-center gap-2">
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
      <div className="glass flex justify-between items-center" style={{ padding: '0.85rem 1.25rem', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.6)' }}>
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

      {/* SECTION 1: Created vs. Resolved Trend Chart */}
      <div className="glass flex-col gap-4" style={{ padding: '1.5rem', borderRadius: '12px' }}>
        <div className="flex justify-between items-center flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: 'var(--accent-color)' }} />
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              Created vs. Resolved Trend
            </h4>
          </div>

          {/* Mode Switcher & Legend */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Legend */}
            <div className="flex items-center gap-3" style={{ fontSize: '0.8rem' }}>
              <div className="flex items-center gap-1.5">
                <span style={{ width: '12px', height: '3px', background: '#f97316', borderRadius: '2px' }}></span>
                <span style={{ color: '#fb923c' }}>Created</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ width: '12px', height: '3px', background: '#10b981', borderRadius: '2px' }}></span>
                <span style={{ color: '#34d399' }}>Resolved</span>
              </div>
            </div>

            {/* Mode Toggle */}
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
                {/* Created Gradient */}
                <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>

                {/* Resolved Gradient */}
                <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
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

              {/* Area Fills */}
              <path d={createdAreaPath} fill="url(#createdGrad)" />
              <path d={resolvedAreaPath} fill="url(#resolvedGrad)" />

              {/* Spline Lines */}
              <path d={createdPath} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
              <path d={resolvedPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

              {/* Data Point Circles & Hover Trigger */}
              {points.map((pt, idx) => {
                const isHovered = hoveredDataPoint?.dateStr === pt.dateStr;
                return (
                  <g key={idx}>
                    {/* Created Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.yCreated}
                      r={isHovered ? 5 : 3}
                      fill="#f97316"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />

                    {/* Resolved Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.yResolved}
                      r={isHovered ? 5 : 3}
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />

                    {/* Invisible hover area */}
                    <rect
                      x={pt.x - innerWidth / (points.length * 2)}
                      y={padding.top}
                      width={innerWidth / points.length}
                      height={innerHeight}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredDataPoint(pt)}
                      onMouseLeave={() => setHoveredDataPoint(null)}
                    />
                  </g>
                );
              })}

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

            {/* Hover Tooltip Card */}
            {hoveredDataPoint && (
              <div
                className="glass"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '20px',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 20
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
                  {hoveredDataPoint.displayDate} ({hoveredDataPoint.dateStr})
                </span>
                <div className="flex justify-between gap-3">
                  <span style={{ color: '#fb923c' }}>🔴 Created:</span>
                  <strong>{hoveredDataPoint.valCreated}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span style={{ color: '#34d399' }}>🟢 Resolved:</span>
                  <strong>{hoveredDataPoint.valResolved}</strong>
                </div>
                {chartMode === 'flow' && (
                  <div className="flex justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '2px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Net Change:</span>
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
                  <th style={{ width: '150px' }}>Assignee</th>
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
                        <div style={{ maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={issue.fields?.summary}>
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
                          <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                            {assigneeName}
                          </span>
                        </div>
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
