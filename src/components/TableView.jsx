import React, { useState, useRef } from 'react';
import { useStore, useFilteredTasks } from '../store/tasks';
import { weekRangeLabel } from '../utils/dates';
import { downloadCSV, downloadJSON, csvToTasks } from '../utils/csv';

const STATUS_COLORS = {
  not_started: '#6b7280',
  in_progress: '#378ADD',
  blocked: '#ef4444',
  done: '#22c55e',
  conditional: '#EF9F27',
};

const TRACK_COLORS = {
  ops: '#378ADD',
  economy: '#1D9E75',
  feature: '#7F77DD',
  ongoing: '#888780',
};

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#EF9F27',
  low: '#22c55e',
};

const COLUMNS = [
  { key: 'title',           label: 'Title',      editable: true },
  { key: 'track',           label: 'Track',      editable: true, type: 'track' },
  { key: 'status',          label: 'Status',     editable: true, type: 'status' },
  { key: 'priority',        label: 'Priority',   editable: true, type: 'priority' },
  { key: 'weeks',           label: 'Weeks',      editable: false },
  { key: 'owner',           label: 'Owner',      editable: true },
  { key: 'progress_percent',label: 'Progress',   editable: true, type: 'number' },
];

export default function TableView({ onSelectTask }) {
  const tasks = useFilteredTasks();
  const updateTask = useStore(s => s.updateTask);
  const deleteTask = useStore(s => s.deleteTask);
  const importTasks = useStore(s => s.importTasks);
  const project = useStore(s => s.project);

  const [sortKey, setSortKey] = useState('title');
  const [sortDir, setSortDir] = useState('asc');
  const [editing, setEditing] = useState(null); // { id, key }
  const [editVal, setEditVal] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkOwner, setBulkOwner] = useState('');
  const fileRef = useRef(null);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = [...tasks].sort((a, b) => {
    const av = Array.isArray(a[sortKey]) ? a[sortKey].join(',') : String(a[sortKey] ?? '');
    const bv = Array.isArray(b[sortKey]) ? b[sortKey].join(',') : String(b[sortKey] ?? '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function startEdit(id, key, val) {
    setEditing({ id, key });
    setEditVal(Array.isArray(val) ? val.join(', ') : String(val ?? ''));
  }

  function commitEdit() {
    if (!editing) return;
    const { id, key } = editing;
    let val = editVal;
    if (key === 'progress_percent') val = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
    updateTask(id, { [key]: val });
    setEditing(null);
  }

  function toggleSelect(id) {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(t => t.id)));
  }

  function applyBulkOwner() {
    selected.forEach(id => updateTask(id, { owner: bulkOwner }));
    setSelected(new Set());
    setBulkOwner('');
  }

  function deleteSelected() {
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    selected.forEach(id => deleteTask(id));
    setSelected(new Set());
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const imported = csvToTasks(ev.target.result);
      if (imported.length > 0) importTasks(imported);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[var(--text-muted)]">{sorted.length} tasks</span>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-[var(--text-muted)]">{selected.size} selected</span>
              <input
                placeholder="Set owner..."
                value={bulkOwner}
                onChange={e => setBulkOwner(e.target.value)}
                className="input w-28"
              />
              <button onClick={applyBulkOwner} className="btn-sm bg-[#7F77DD] text-white">Apply</button>
              <button onClick={deleteSelected} className="btn-sm text-red-400 hover:bg-red-500/10">Delete</button>
            </>
          )}
          <input type="file" accept=".csv" ref={fileRef} onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-sm text-[var(--text-muted)] hover:text-[var(--text)]">Import CSV</button>
          <button onClick={() => downloadCSV(tasks)} className="btn-sm text-[var(--text-muted)] hover:text-[var(--text)]">Export CSV</button>
          <button onClick={() => downloadJSON(tasks, project)} className="btn-sm text-[var(--text-muted)] hover:text-[var(--text)]">Export JSON</button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: 'var(--surface2)' }}>
            <tr>
              <th className="th w-8">
                <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0}
                  onChange={toggleAll} className="rounded" />
              </th>
              {COLUMNS.map(col => (
                <th key={col.key} className="th cursor-pointer select-none" onClick={() => toggleSort(col.key)}>
                  {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="text-center py-12 text-[var(--text-muted)]">
                  No tasks match the current filters.
                </td>
              </tr>
            )}
            {sorted.map(task => (
              <tr key={task.id} className="border-b hover:bg-[var(--surface2)] transition-colors group"
                style={{ borderColor: 'var(--border)' }}>
                <td className="td text-center">
                  <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)} className="rounded" />
                </td>
                {COLUMNS.map(col => (
                  <td key={col.key} className="td">
                    <Cell
                      task={task}
                      col={col}
                      editing={editing}
                      editVal={editVal}
                      setEditVal={setEditVal}
                      onStart={startEdit}
                      onCommit={commitEdit}
                      onCancel={() => setEditing(null)}
                      project={project}
                    />
                  </td>
                ))}
                <td className="td">
                  <button onClick={() => onSelectTask(task.id)}
                    className="px-2 py-0.5 rounded text-xs text-[#7F77DD] hover:bg-[#7F77DD]/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TRACK_OPTIONS = ['ops', 'economy', 'feature', 'ongoing'];
const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'conditional', label: 'Conditional' },
];
const PRIORITY_OPTIONS = ['high', 'medium', 'low'];

function Cell({ task, col, editing, editVal, setEditVal, onStart, onCommit, onCancel, project }) {
  const isEditing = editing?.id === task.id && editing?.key === col.key;

  if (col.key === 'weeks') {
    return <span className="text-[var(--text-muted)]">{weekRangeLabel(project.start_date, task.weeks)}</span>;
  }

  if (col.key === 'progress_percent') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 rounded-full bg-[var(--surface2)] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${task.progress_percent}%`, background: '#7F77DD' }} />
        </div>
        <span className="text-[var(--text-muted)]">{task.progress_percent}%</span>
      </div>
    );
  }

  if (col.key === 'track') {
    if (isEditing) {
      return (
        <select autoFocus className="input w-full" value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}>
          {TRACK_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded-full text-white text-xs cursor-pointer"
        style={{ background: TRACK_COLORS[task.track] || '#888' }}
        onClick={() => onStart(task.id, col.key, task[col.key])}>
        {task.track}
      </span>
    );
  }

  if (col.key === 'status') {
    if (isEditing) {
      return (
        <select autoFocus className="input w-full" value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded-full text-xs font-medium cursor-pointer"
        style={{ background: STATUS_COLORS[task.status] + '22', color: STATUS_COLORS[task.status] }}
        onClick={() => onStart(task.id, col.key, task[col.key])}>
        {task.status.replace('_', ' ')}
      </span>
    );
  }

  if (col.key === 'priority') {
    if (isEditing) {
      return (
        <select autoFocus className="input w-full" value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}>
          {PRIORITY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      );
    }
    return (
      <span style={{ color: PRIORITY_COLORS[task.priority] }} className="font-medium cursor-pointer"
        onClick={() => onStart(task.id, col.key, task[col.key])}>
        {task.priority}
      </span>
    );
  }

  if (!col.editable) {
    return <span style={{ color: 'var(--text)' }}>{String(task[col.key] ?? '')}</span>;
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        className="input w-full"
        value={editVal}
        onChange={e => setEditVal(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}
      />
    );
  }

  return (
    <span
      className="cursor-text hover:bg-[var(--surface2)] px-1 py-0.5 rounded block truncate max-w-[200px]"
      style={{ color: 'var(--text)' }}
      onClick={() => onStart(task.id, col.key, task[col.key])}
      title={String(task[col.key] ?? '')}
    >
      {String(task[col.key] ?? '') || <span className="text-[var(--text-muted)] italic">—</span>}
    </span>
  );
}
