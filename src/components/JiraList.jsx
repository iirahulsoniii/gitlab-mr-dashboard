import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function JiraList({ tickets }) {
  if (tickets.length === 0) {
    return (
      <div className="glass flex justify-center items-center" style={{ padding: '4rem', color: 'var(--text-secondary)' }}>
        <p>No Jira tickets found in the filtered Merge Requests.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2">
      {tickets.map(ticket => (
        <div key={ticket.id} className="glass mr-card flex-col gap-2">
          <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-color)' }}>{ticket.id}</h3>
            <a href={`https://omantel-om.atlassian.net/browse/${ticket.id}`} target="_blank" rel="noreferrer" title="Open in Jira" className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
              Open <ExternalLink size={14} style={{ marginLeft: '0.25rem' }} />
            </a>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Associated MRs ({ticket.mrs.length})</span>
            <ul style={{ listStyleType: 'none', padding: 0, margin: '0.5rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ticket.mrs.map(mr => (
                <li key={mr.id} className="flex items-center gap-2">
                  <span className={`status-tag status-${mr.state}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{mr.state}</span>
                  <a href={mr.web_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={mr.title}>
                    <strong>{mr.project_name} #{mr.iid}</strong>: {mr.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
