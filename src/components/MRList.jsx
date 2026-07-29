import React from 'react';
import MRCard from './MRCard';

export default function MRList({ mrs, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (mrs.length === 0) {
    return (
      <div className="glass flex justify-center items-center" style={{ padding: '4rem', color: 'var(--text-secondary)' }}>
        <p>No Merge Requests found matching the current filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2">
      {mrs.map(mr => (
        <MRCard key={mr.id} mr={mr} />
      ))}
    </div>
  );
}
