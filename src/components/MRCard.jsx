import React from 'react';
import { GitPullRequest, GitMerge, XCircle, Clock, MessageSquare, GitBranch, ExternalLink, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { extractJiraKeysFromMR, getJiraBrowseUrl } from '../jiraUtils';

export default function MRCard({ mr }) {
  const jiraKeys = extractJiraKeysFromMR(mr);

  const getStatusIcon = () => {
    switch(mr.state) {
      case 'merged': return <GitMerge size={16} />;
      case 'closed': return <XCircle size={16} />;
      case 'opened': return <GitPullRequest size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusClass = () => {
    switch(mr.state) {
      case 'merged': return 'status-merged';
      case 'closed': return 'status-closed';
      case 'opened': return 'status-opened';
      default: return 'status-draft';
    }
  };

  return (
    <div className="glass mr-card flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`status-tag ${getStatusClass()}`}>
            {getStatusIcon()} {mr.state}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
            {mr.project_name} <span style={{ opacity: 0.7 }}>#{mr.iid}</span>
          </span>
        </div>
        <a href={mr.web_url} target="_blank" rel="noreferrer" title="Open in Browser" style={{ color: 'var(--text-secondary)' }}>
          <ExternalLink size={18} />
        </a>
      </div>

      <div>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>
          <a href={mr.web_url} target="_blank" rel="noreferrer">{mr.title}</a>
        </h4>
        
        {mr.source_branch !== 'unknown' && (
          <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
            <GitBranch size={14} /> 
            <span style={{ wordBreak: 'break-all' }}>{mr.source_branch}</span>
            <span>→</span>
            <span style={{ wordBreak: 'break-all' }}>{mr.target_branch}</span>
          </div>
        )}

        {jiraKeys.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: '0.65rem' }}>
            {jiraKeys.map(key => (
              <a
                key={key}
                href={getJiraBrowseUrl(key)}
                target="_blank"
                rel="noreferrer"
                className="tag"
                style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  padding: '2px 7px'
                }}
                title={`Open Jira issue ${key}`}
              >
                <Tag size={11} /> {key}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          {mr.author.avatar_url ? (
            <img src={mr.author.avatar_url} alt={mr.author.name} className="avatar" />
          ) : (
            <div className="avatar flex justify-center items-center" style={{ background: 'var(--surface-color-light)' }}>
              <span style={{ fontSize: '0.75rem' }}>{mr.author.name?.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-col">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{mr.author.name || mr.author.username}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Updated {formatDistanceToNow(new Date(mr.updated_at))} ago
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-1" title="Comments">
            <MessageSquare size={16} />
            <span style={{ fontSize: '0.875rem' }}>{mr.comments_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
