import React from 'react';
import { STATUS_COLORS, STATUSES } from '../lib/constants';

const LABELS = Object.fromEntries(STATUSES.map(s => [s.value, s.label]));

export default function StatusBadge({ status, onClick, className = '' }) {
  const color = STATUS_COLORS[status] || 'var(--text-muted)';
  const label = LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        color,
        background:   `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor:  `color-mix(in srgb, ${color} 25%, transparent)`,
      }}
      onClick={onClick}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: color }} />
      {label}
    </span>
  );
}
