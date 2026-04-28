import React, { useState, useEffect } from 'react';
import { useStore } from '../store/tasks';
import { TRACKS, STATUSES, PRIORITIES, OWNERS } from '../lib/constants';
import { weekRangeLabel, formatDateFull } from '../utils/dates';

const DEFAULT_FORM = {
  title: '',
  description: '',
  track: 'feature',
  status: 'not_started',
  priority: 'medium',
  weeks: [1],
  progress_percent: 0,
  owner: '',
  due_date: null,
  tags: '',
  notes: '',
};

export default function TaskModal({ initialValues, onClose, onSaved }) {
  const addTask = useStore(s => s.addTask);
  const project = useStore(s => s.project);
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...initialValues });
  const [weekStr, setWeekStr] = useState((initialValues?.weeks || [1]).join(', '));

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function field(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleSubmit(e) {
    e.preventDefault();
    const weeks = weekStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1);
    const id = addTask({
      ...form,
      weeks: weeks.length ? weeks : [1],
      tags: typeof form.tags === 'string'
        ? form.tags.split(',').map(s => s.trim()).filter(Boolean)
        : form.tags,
    });
    onSaved(id);
    onClose();
  }

  const weekOptions = Array.from({ length: project.total_weeks }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 mx-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide" style={{ color: 'var(--text)' }}>New Task</h2>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors focus-ring"
            style={{ color: 'var(--text-muted)', background: 'var(--surface2)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >×</button>
        </div>

        <div>
          <label className="label">Title *</label>
          <input
            autoFocus
            className="input w-full"
            value={form.title}
            onChange={e => field('title', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Track</label>
            <select className="input w-full" value={form.track} onChange={e => field('track', e.target.value)}>
              {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input w-full" value={form.status} onChange={e => field('status', e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priority</label>
            <select className="input w-full" value={form.priority} onChange={e => field('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Owner</label>
            <select className="input w-full" value={form.owner} onChange={e => field('owner', e.target.value)}>
              <option value="">— unassigned —</option>
              {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Due Date</label>
          <input type="date" className="input w-full"
            value={form.due_date || ''}
            onChange={e => field('due_date', e.target.value || null)} />
        </div>

        <div>
          <label className="label">Weeks (e.g. 1, 2, 3)</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {weekOptions.map(w => {
              const parsed = weekStr.split(',').map(s => parseInt(s.trim(), 10));
              const active = parsed.includes(w);
              return (
                <button
                  key={w} type="button"
                  title={weekRangeLabel(project.start_date, [w])}
                  onClick={() => {
                    const current = weekStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                    const next = active ? current.filter(x => x !== w) : [...current, w].sort((a,b) => a-b);
                    setWeekStr(next.join(', '));
                  }}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors focus-ring ${active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface2)] text-[var(--text-muted)]'}`}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input w-full resize-none"
            rows={2}
            value={form.description}
            onChange={e => field('description', e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring"
            style={{ color: 'var(--text-muted)', background: 'var(--surface2)' }}>
            Cancel
          </button>
          <button type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors focus-ring"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Create Task
          </button>
        </div>
      </form>
    </div>
  );
}
