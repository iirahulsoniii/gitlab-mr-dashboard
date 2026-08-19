import React, { useState, useMemo } from 'react';
import { ExternalLink, Search, Tag, GitPullRequest, GitMerge, XCircle, Clock } from 'lucide-react';
import { getJiraBrowseUrl } from '../jiraUtils';

export default function JiraList({ tickets }) {
  const [search, setSearch] = useState('');

  const filteredTickets = useMemo(() => {
    if (!search.trim()) return tickets;
    const q = search.toLowerCase().trim();
    return tickets.filter(t => {
      const matchKey = t.id.toLowerCase().includes(q);
      const matchMR = t.mrs.some(m => 
        m.title.toLowerCase().includes(q) || 
        m.project_name.toLowerCase().includes(q) ||
        (m.source_branch && m.source_branch.toLowerCase().includes(q))
      );
      return matchKey || matchMR;
    });
  }, [tickets, search]);

  const getStatusIcon = (state) => {
    switch (state) {
      case 'merged': return <GitMerge size={12} />;
      case 'closed': return <XCircle size={12} />;
      case 'opened': return <GitPullRequest size={12} />;
      default: return <Clock size={12} />;
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="glass flex justify-center items-center" style={{ padding: '4rem', color: 'var(--text-secondary)' }}>
        <p>No Jira tickets found in the filtered Merge Requests.</p>
      </div>
    );
  }

  return (
    <div className="flex-col gap-4">
      {/* Search Header Bar */}
      <div className="glass flex justify-between items-center" style={{ padding: '0.75rem 1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="flex items-center gap-2" style={{ flexGrow: 1, maxWidth: '400px', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '0.35rem 0.65rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Search size={15} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search Jira tickets (e.g. CS-34744) or MR title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>

        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredTickets.length}</strong> of {tickets.length} Jira tickets
        </span>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="glass flex justify-center items-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
          No Jira tickets matching "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
          {filteredTickets.map(ticket => (
            <div key={ticket.id} className="glass mr-card flex-col gap-3" style={{ padding: '1.25rem' }}>
              <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
                <div className="flex items-center gap-2">
                  <Tag size={16} style={{ color: 'var(--accent-color)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                    {ticket.id}
                  </h3>
                </div>
                <a
                  href={getJiraBrowseUrl(ticket.id)}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in Jira"
                  className="btn btn-primary"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Open in Jira <ExternalLink size={13} />
                </a>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Associated Merge Requests ({ticket.mrs.length})
                </span>
                <ul style={{ listStyleType: 'none', padding: 0, margin: '0.5rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ticket.mrs.map(mr => (
                    <li
                      key={mr.id}
                      className="flex items-center gap-2"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <span className={`status-tag status-${mr.state}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {getStatusIcon(mr.state)} {mr.state}
                      </span>
                      <a
                        href={mr.web_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1, textDecoration: 'none', color: 'var(--text-primary)' }}
                        title={mr.title}
                      >
                        <strong>{mr.project_name} #{mr.iid}</strong>: {mr.title}
                      </a>
                      <a href={mr.web_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', display: 'flex', padding: '2px' }} title="View Merge Request">
                        <ExternalLink size={13} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
