import React, { useRef } from 'react';
import { useStore } from '../store/tasks';

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'conditional', label: 'Conditional' },
];

const PRIORITIES = [
  { value: '', label: 'All priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function FilterBar({ searchRef }) {
  const project = useStore(s => s.project);
  const filters = useStore(s => s.filters);
  const setFilter = useStore(s => s.setFilter);

  const tracks = [
    { value: '', label: 'All tracks' },
    ...project.tracks.map(t => ({ value: t.id, label: t.name, color: t.color })),
  ];

  const weeks = [
    { value: '', label: 'All weeks' },
    ...Array.from({ length: project.total_weeks }, (_, i) => ({
      value: String(i + 1),
      label: `Week ${i + 1}`,
    })),
  ];

  const hasFilters = filters.track || filters.status || filters.owner || filters.week || filters.search;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b text-xs"
      style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>

      <input
        ref={searchRef}
        type="text"
        placeholder="Search... (/)"
        value={filters.search}
        onChange={e => setFilter('search', e.target.value)}
        className="px-2 py-1 rounded border text-xs w-40 focus:outline-none focus:ring-1 focus:ring-[#7F77DD]"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
      />

      <Select
        value={filters.track}
        onChange={v => setFilter('track', v)}
        options={tracks}
      />

      <Select
        value={filters.status}
        onChange={v => setFilter('status', v)}
        options={STATUSES}
      />

      <input
        type="text"
        placeholder="Owner"
        value={filters.owner}
        onChange={e => setFilter('owner', e.target.value)}
        className="px-2 py-1 rounded border text-xs w-24 focus:outline-none focus:ring-1 focus:ring-[#7F77DD]"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
      />

      <Select
        value={filters.week}
        onChange={v => setFilter('week', v)}
        options={weeks}
      />

      {hasFilters && (
        <button
          onClick={() => {
            setFilter('track', '');
            setFilter('status', '');
            setFilter('owner', '');
            setFilter('week', '');
            setFilter('search', '');
          }}
          className="px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
        >
          Clear ✕
        </button>
      )}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-2 py-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-[#7F77DD]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
