import React from 'react';
import { Search, Filter, GitBranch, User, Server, UserCheck, Calendar, RotateCcw } from 'lucide-react';

export default function FilterPanel({ filters, setFilters, services, timeframe, setTimeframe, onSearch, onReset }) {
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const selectStyle = {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1em',
    paddingRight: '2.5rem'
  };

  return (
    <div className="glass flex-col gap-4" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex items-center gap-2">
          <Filter size={20} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ margin: 0 }}>Filters</h3>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              style={selectStyle}
              className="btn"
            >
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <button className="btn" onClick={onReset} title="Reset Filters">
            <RotateCcw size={16} /> Reset
          </button>
          <button className="btn btn-primary" onClick={onSearch}>
            <Search size={16} /> Deep Search
          </button>
        </div>
      </div>
      
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Name / Author Filter */}
        <div className="flex-col gap-2">
          <label className="flex items-center gap-2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <User size={16} /> Author Name
          </label>
          <input 
            type="text" 
            placeholder="e.g. John Doe"
            value={filters.author}
            onChange={(e) => handleFilterChange('author', e.target.value)}
          />
        </div>

        {/* Merged By Filter */}
        <div className="flex-col gap-2">
          <label className="flex items-center gap-2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <UserCheck size={16} /> Merged By
          </label>
          <input 
            type="text" 
            placeholder="e.g. Jane Doe"
            value={filters.mergedBy || ''}
            onChange={(e) => handleFilterChange('mergedBy', e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="flex-col gap-2">
          <label className="flex items-center gap-2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Search size={16} /> Status
          </label>
          <select 
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="opened">Open</option>
            <option value="closed">Closed</option>
            <option value="merged">Merged</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Service / Repository Filter */}
        <div className="flex-col gap-2">
          <label className="flex items-center gap-2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Server size={16} /> Repository
          </label>
          <select 
            value={filters.service}
            onChange={(e) => handleFilterChange('service', e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Repositories</option>
            {services.map(srv => (
              <option key={srv.id} value={srv.name}>{srv.name}</option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div className="flex-col gap-2">
          <label className="flex items-center gap-2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <GitBranch size={16} /> Branch Name
          </label>
          <input 
            type="text" 
            placeholder="e.g. feature/login"
            value={filters.branch}
            onChange={(e) => handleFilterChange('branch', e.target.value)}
          />
        </div>

      </div>
    </div>
  );
}
