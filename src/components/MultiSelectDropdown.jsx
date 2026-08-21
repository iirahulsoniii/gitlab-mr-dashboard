import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export default function MultiSelectDropdown({ 
  title, 
  allLabel = 'All', 
  options = [], 
  selected = null, 
  onChange,
  icon: Icon = null,
  renderOption = null,
  showSearch = true,
  searchPlaceholder = 'Search...',
  width = 'auto'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alignRight, setAlignRight] = useState(false);
  const searchInputRef = useRef(null);

  // Close on click outside and auto-detect screen edge for right alignment
  useEffect(() => {
    const checkAlignment = () => {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const projectedRight = rect.left + 330;
        if (projectedRight > window.innerWidth - 12) {
          setAlignRight(true);
        } else {
          setAlignRight(false);
        }
      }
    };

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      checkAlignment();
      setTimeout(() => searchInputRef.current?.focus(), 50);
      window.addEventListener('resize', checkAlignment);
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      setSearchQuery('');
    }
    return () => {
      window.removeEventListener('resize', checkAlignment);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allIds = useMemo(() => options.map(o => (typeof o === 'string' ? o : o.id)), [options]);
  const isAllSelected = selected === null || (Array.isArray(selected) && selected.length === allIds.length);
  const isNoneSelected = selected !== null && Array.isArray(selected) && selected.length === 0;

  const currentSelectedList = useMemo(() => {
    if (selected === null) return allIds;
    return Array.isArray(selected) ? selected : [];
  }, [selected, allIds]);

  const handleToggle = (id) => {
    if (isAllSelected) {
      onChange(allIds.filter(x => x !== id));
    } else if (currentSelectedList.includes(id)) {
      onChange(currentSelectedList.filter(x => x !== id));
    } else {
      const next = [...currentSelectedList, id];
      if (next.length === allIds.length) {
        onChange(null); // All selected
      } else {
        onChange(next);
      }
    }
  };

  const handleSelectAll = () => {
    onChange(null); // null represents all selected by default
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(o => {
      const label = typeof o === 'string' ? o : (o.label || o.name || o.id || '');
      return String(label).toLowerCase().includes(q);
    });
  }, [options, searchQuery]);

  // Label display on button
  const displayLabel = useMemo(() => {
    if (isAllSelected) {
      return allLabel || `All ${title} (${options.length})`;
    }
    if (isNoneSelected) {
      return `No ${title} (0)`;
    }
    if (currentSelectedList.length === 1) {
      const found = options.find(o => (typeof o === 'string' ? o : o.id) === currentSelectedList[0]);
      if (found) {
        return typeof found === 'string' ? found : (found.label || found.name || found.id);
      }
    }
    return `${title} (${currentSelectedList.length}/${options.length})`;
  }, [isAllSelected, isNoneSelected, currentSelectedList, allLabel, title, options]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', width, zIndex: isOpen ? 99999 : 'auto' }}>
      <button
        type="button"
        className="btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          fontSize: '0.82rem',
          padding: '0.35rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isAllSelected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.15)',
          borderColor: isAllSelected ? 'var(--border-color)' : 'var(--accent-color)',
          color: isAllSelected ? 'var(--text-primary)' : '#60a5fa',
          fontWeight: isAllSelected ? 500 : 600,
          whiteSpace: 'nowrap'
        }}
      >
        {Icon && <Icon size={14} style={{ opacity: 0.8 }} />}
        <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLabel}</span>
        <ChevronDown size={13} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: alignRight ? 'auto' : 0,
            right: alignRight ? 0 : 'auto',
            minWidth: '240px',
            maxWidth: 'min(320px, calc(100vw - 32px))',
            maxHeight: '360px',
            zIndex: 100000,
            boxShadow: '0 20px 45px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '0.65rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.18)'
          }}
        >
          {/* Search box - Always visible */}
          {showSearch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.95)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.4)', boxShadow: '0 0 10px rgba(59, 130, 246, 0.1)' }}>
              <Search size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder || `Search ${title}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.82rem', width: '100%' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', padding: '0 2px' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Quick actions row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', padding: '0.1rem 0.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {isAllSelected ? `All ${options.length} selected` : `${currentSelectedList.length} of ${options.length} selected`}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={isAllSelected}
                style={{ background: 'transparent', border: 'none', color: isAllSelected ? 'var(--text-muted)' : 'var(--accent-color)', cursor: isAllSelected ? 'default' : 'pointer', fontSize: '0.74rem', fontWeight: 600, padding: 0 }}
              >
                Select All
              </button>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isNoneSelected}
                style={{ background: 'transparent', border: 'none', color: isNoneSelected ? 'var(--text-muted)' : 'var(--danger-color)', cursor: isNoneSelected ? 'default' : 'pointer', fontSize: '0.74rem', fontWeight: 600, padding: 0 }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Option list */}
          <div style={{ overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                No matches found
              </div>
            ) : (
              filteredOptions.map(option => {
                const id = typeof option === 'string' ? option : option.id;
                const isChecked = currentSelectedList.includes(id);

                return (
                  <label
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                      color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'background 0.1s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = isChecked ? 'rgba(59, 130, 246, 0.08)' : 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                    />

                    {renderOption ? (
                      renderOption(option, isChecked)
                    ) : (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typeof option === 'string' ? option : (option.label || option.name || option.id)}
                      </span>
                    )}

                    {option.count !== undefined && (
                      <span className="tag" style={{ marginLeft: 'auto', fontSize: '0.68rem', padding: '0.05rem 0.35rem', background: 'rgba(255,255,255,0.08)' }}>
                        {option.count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
