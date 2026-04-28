import React, { useState, useRef } from 'react';
import { useStore, useFilteredTasks } from '../store/tasks';
import { useAuth } from '../contexts/AuthContext';
import { weekRangeLabel } from '../utils/dates';
import { downloadCSV, downloadJSON, csvToTasks } from '../utils/csv';
import { TRACK_COLORS, PRIORITY_COLORS, STATUSES, TRACKS, PRIORITIES, OWNERS } from '../lib/constants';
import StatusBadge from './StatusBadge';

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
  const tasksLoading = useStore(s => s.tasksLoading);
  const totalTasks = useStore(s => s.tasks.length);
  const clearFilters = useStore(s => s.clearFilters);
  const { isAdmin } = useAuth();

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
          {isAdmin && selected.size > 0 && (
            <>
              <span className="text-[var(--text-muted)]">{selected.size} selected</span>
              <select
                value={bulkOwner}
                onChange={e => setBulkOwner(e.target.value)}
                className="input"
              >
                <option value="">Set owner…</option>
                {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button onClick={applyBulkOwner} className="btn-sm bg-[var(--accent)] text-white">Apply</button>
              <button onClick={deleteSelected} className="btn-sm text-red-400 hover:bg-red-500/10">Delete</button>
            </>
          )}
          <input type="file" accept=".csv" ref={fileRef} onChange={handleImport} className="hidden" />
          {isAdmin && <button onClick={() => fileRef.current?.click()} className="btn-sm text-[var(--text-muted)] hover:text-[var(--text)]">Import CSV</button>}
          <button onClick={() => downloadCSV(tasks)} className="btn-sm text-[var(--text-muted)] hover:text-[var(--text)]">Export CSV</button>
          <button onClick={() => downloadJSON(tasks, project)} className="btn-sm text-[var(--text-muted)] hover:text-[var(--text)]">Export JSON</button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: 'var(--surface2)' }}>
            <tr>
              {isAdmin && (
                <th className="th w-8">
                  <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
              )}
              {COLUMNS.map(col => (
                <th key={col.key} className="th cursor-pointer select-none" onClick={() => toggleSort(col.key)}>
                  {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasksLoading && Array.from({ length: 7 }, (_, i) => (
              <tr key={i} className="border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
                {isAdmin && <td className="td"><div className="w-4 h-4 rounded bg-[var(--surface2)]" /></td>}
                {COLUMNS.map(col => (
                  <td key={col.key} className="td">
                    <div className="h-3 rounded bg-[var(--surface2)]"
                      style={{ width: col.key === 'title' ? '75%' : col.key === 'weeks' ? '55%' : '45%' }} />
                  </td>
                ))}
                <td className="td" />
              </tr>
            ))}
            {!tasksLoading && sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="py-16">
                  <div className="flex flex-col items-center gap-4 text-center px-8">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
                      stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {totalTasks > 0 ? 'No tasks match your filters' : 'No tasks yet'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {totalTasks > 0
                          ? 'Try adjusting or clearing the active filters.'
                          : 'Create your first task using the + button above.'}
                      </p>
                    </div>
                    {totalTasks > 0 && (
                      <button onClick={clearFilters}
                        className="btn-sm bg-[var(--accent)] text-white text-xs px-4 py-1.5">
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {!tasksLoading && sorted.map(task => (
              <tr key={task.id} className="border-b hover:bg-[var(--surface2)] transition-colors group"
                style={{ borderColor: 'var(--border)' }}>
                {isAdmin && (
                  <td className="td text-center">
                    <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)} className="rounded" />
                  </td>
                )}
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
                      isAdmin={isAdmin}
                    />
                  </td>
                ))}
                <td className="td">
                  <button onClick={() => onSelectTask(task.id)}
                    className="px-2 py-0.5 rounded text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 opacity-0 group-hover:opacity-100 transition-opacity focus-ring focus:opacity-100">
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


function Cell({ task, col, editing, editVal, setEditVal, onStart, onCommit, onCancel, project, isAdmin }) {
  const isEditing = isAdmin && editing?.id === task.id && editing?.key === col.key;

  if (col.key === 'weeks') {
    return <span className="text-[var(--text-muted)]">{weekRangeLabel(project.start_date, task.weeks)}</span>;
  }

  if (col.key === 'progress_percent') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 rounded-full bg-[var(--surface2)] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${task.progress_percent}%`, background: 'var(--accent)' }} />
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
          {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      );
    }
    return (
      <span className={`px-1.5 py-0.5 rounded-full text-white text-xs ${isAdmin ? 'cursor-pointer' : ''}`}
        style={{ background: TRACK_COLORS[task.track] || '#888' }}
        onClick={isAdmin ? () => onStart(task.id, col.key, task[col.key]) : undefined}>
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
          {STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <StatusBadge
        status={task.status}
        onClick={isAdmin ? () => onStart(task.id, col.key, task[col.key]) : undefined}
      />
    );
  }

  if (col.key === 'priority') {
    if (isEditing) {
      return (
        <select autoFocus className="input w-full" value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      );
    }
    return (
      <span style={{ color: PRIORITY_COLORS[task.priority] }}
        className={`font-medium ${isAdmin ? 'cursor-pointer' : ''}`}
        onClick={isAdmin ? () => onStart(task.id, col.key, task[col.key]) : undefined}>
        {task.priority}
      </span>
    );
  }

  if (col.key === 'owner') {
    if (isEditing) {
      return (
        <select autoFocus className="input w-full" value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}>
          <option value="">— unassigned —</option>
          {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <span
        className={`px-1 py-0.5 rounded block truncate ${isAdmin ? 'cursor-pointer hover:bg-[var(--surface2)]' : ''}`}
        style={{ color: task.owner ? 'var(--text)' : 'var(--text-muted)' }}
        onClick={isAdmin ? () => onStart(task.id, col.key, task[col.key]) : undefined}
      >
        {task.owner || <span className="italic">—</span>}
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
      className={`px-1 py-0.5 rounded block truncate max-w-[200px] ${isAdmin ? 'cursor-text hover:bg-[var(--surface2)]' : ''}`}
      style={{ color: 'var(--text)' }}
      onClick={isAdmin ? () => onStart(task.id, col.key, task[col.key]) : undefined}
      title={String(task[col.key] ?? '')}
    >
      {String(task[col.key] ?? '') || <span className="text-[var(--text-muted)] italic">—</span>}
    </span>
  );
}
