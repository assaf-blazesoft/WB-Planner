import React, { useState, useEffect } from 'react';
import { useStore } from '../store/tasks';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { sendEmail } from '../lib/email';
import { weekRangeLabel } from '../utils/dates';
import { TRACKS, STATUSES, PRIORITIES } from '../lib/constants';
import TaskComments from './TaskComments';
import StatusBadge from './StatusBadge';

export default function TaskDetailPanel({ taskId, onClose, onDuplicate }) {
  const task         = useStore(s => s.tasks.find(t => t.id === taskId));
  const updateTask   = useStore(s => s.updateTask);
  const deleteTask   = useStore(s => s.deleteTask);
  const project      = useStore(s => s.project);
  const { user, profile, isAdmin } = useAuth();

  const [form,          setForm]          = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignees,     setAssignees]     = useState([]);
  const [allUsers,      setAllUsers]      = useState([]);

  useEffect(() => {
    if (task) setForm({ ...task });
  }, [taskId]);

  useEffect(() => {
    if (isSupabaseEnabled && taskId) {
      fetchAssignees();
      if (isAdmin) fetchAllUsers();
    }
  }, [taskId, isAdmin]);

  async function fetchAssignees() {
    const { data } = await supabase
      .from('task_assignments')
      .select('user_id, profiles(id, full_name, email)')
      .eq('task_id', taskId);
    if (data) setAssignees(data.map(d => d.profiles).filter(Boolean));
  }

  async function fetchAllUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name, email');
    if (data) setAllUsers(data);
  }

  async function assignUser(userId) {
    const { error } = await supabase
      .from('task_assignments')
      .insert({ task_id: taskId, user_id: userId, assigned_by: user.id });
    if (!error) {
      fetchAssignees();
      const assignedUser = allUsers.find(u => u.id === userId);
      if (assignedUser?.email) {
        sendEmail('task_assigned', assignedUser.email, {
          assignerName: profile?.full_name || user.email,
          taskTitle: task.title,
          appUrl: window.location.origin,
        });
      }
    }
  }

  async function unassignUser(userId) {
    await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);
    fetchAssignees();
  }

  if (!task || !form) return null;

  function field(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function save(patch) {
    const update = patch ?? form;
    updateTask(taskId, update);
  }

  function handleBlur() { save(); }

  function suggestStatus() {
    if (form.progress_percent === 100 && form.status !== 'done') return 'done';
    if (form.progress_percent > 0 && form.status === 'not_started') return 'in_progress';
    return null;
  }

  function handleStatusChange(newStatus) {
    field('status', newStatus);
    updateTask(taskId, { ...form, status: newStatus });
    // Notify assignees of status change
    if (isSupabaseEnabled) {
      supabase
        .from('task_assignments')
        .select('profiles(email)')
        .eq('task_id', taskId)
        .then(({ data }) => {
          data?.forEach(a => {
            if (a.profiles?.email && a.profiles.email !== user?.email) {
              sendEmail('status_update', a.profiles.email, {
                updaterName: profile?.full_name || user?.email,
                taskTitle: task.title,
                newStatus,
              });
            }
          });
        });
    }
  }

  const suggestion     = suggestStatus();
  const weekOptions    = Array.from({ length: project.total_weeks }, (_, i) => i + 1);
  const unassignedUsers = allUsers.filter(u => !assignees.find(a => a.id === u.id));

  return (
    <div
      className="fixed top-0 right-0 h-full w-96 shadow-2xl z-40 flex flex-col overflow-hidden"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-none"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Task Detail</span>
          <StatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={() => onDuplicate(taskId)}
                className="text-xs px-2 py-1 rounded hover:bg-[var(--surface2)] transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                Duplicate
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="text-xs px-2 py-1 rounded hover:bg-red-500/10 text-red-400 transition-colors">
                Delete
              </button>
            </>
          )}
          <button onClick={onClose}
            className="text-lg leading-none hover:text-[var(--text)] px-1 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Title */}
        <div>
          <label className="label">Title</label>
          {isAdmin ? (
            <input className="input w-full" value={form.title}
              onChange={e => field('title', e.target.value)} onBlur={handleBlur} />
          ) : (
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{task.title}</p>
          )}
        </div>

        {/* Track + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Track</label>
            {isAdmin ? (
              <select className="input w-full" value={form.track}
                onChange={e => { field('track', e.target.value); save({ ...form, track: e.target.value }); }}>
                {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text)' }}>{form.track}</p>
            )}
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input w-full" value={form.status}
              onChange={e => handleStatusChange(e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {suggestion && (
          <div className="text-xs px-3 py-2 rounded bg-amber-500/10 text-amber-400 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              Suggest: <StatusBadge status={suggestion} />
            </span>
            <button className="underline shrink-0" onClick={() => handleStatusChange(suggestion)}>
              Apply
            </button>
          </div>
        )}

        {/* Priority + Owner (admin only) */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input w-full" value={form.priority}
                onChange={e => { field('priority', e.target.value); save({ ...form, priority: e.target.value }); }}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Owner</label>
              <input className="input w-full" value={form.owner}
                onChange={e => field('owner', e.target.value)} onBlur={handleBlur} />
            </div>
          </div>
        )}

        {/* Weeks (admin only) */}
        {isAdmin && (
          <div>
            <label className="label">Weeks ({weekRangeLabel(project.start_date, form.weeks)})</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {weekOptions.map(w => {
                const active = form.weeks.includes(w);
                return (
                  <button key={w}
                    onClick={() => {
                      const next = active
                        ? form.weeks.filter(x => x !== w)
                        : [...form.weeks, w].sort((a, b) => a - b);
                      const weeks = next.length ? next : [w];
                      field('weeks', weeks);
                      updateTask(taskId, { ...form, weeks });
                    }}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                      active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface2)] text-[var(--text-muted)]'
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress */}
        <div>
          <label className="label">Progress — {form.progress_percent}%</label>
          <div className="flex items-center gap-2">
            <input type="range" min="0" max="100" step="5"
              value={form.progress_percent}
              onChange={e => field('progress_percent', Number(e.target.value))}
              onMouseUp={handleBlur}
              className="flex-1" />
            <div className="flex gap-1">
              <button
                onClick={() => { const v = Math.max(0, form.progress_percent - 10); field('progress_percent', v); updateTask(taskId, { ...form, progress_percent: v }); }}
                className="w-6 h-6 rounded bg-[var(--surface2)] text-xs" style={{ color: 'var(--text-muted)' }}>−</button>
              <button
                onClick={() => { const v = Math.min(100, form.progress_percent + 10); field('progress_percent', v); updateTask(taskId, { ...form, progress_percent: v }); }}
                className="w-6 h-6 rounded bg-[var(--surface2)] text-xs" style={{ color: 'var(--text-muted)' }}>+</button>
            </div>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--surface2)] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${form.progress_percent}%`, background: 'var(--accent)' }} />
          </div>
        </div>

        {/* Description */}
        {isAdmin && (
          <div>
            <label className="label">Description</label>
            <textarea className="input w-full resize-none" rows={3}
              value={form.description}
              onChange={e => field('description', e.target.value)}
              onBlur={handleBlur} />
          </div>
        )}
        {!isAdmin && task.description && (
          <div>
            <label className="label">Description</label>
            <p className="text-xs" style={{ color: 'var(--text)' }}>{task.description}</p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea className="input w-full resize-none mono" rows={4}
            value={form.notes}
            onChange={e => field('notes', e.target.value)}
            onBlur={handleBlur} />
        </div>

        {/* Assignments */}
        {isSupabaseEnabled && (
          <div>
            <label className="label">Assigned to</label>
            {assignees.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Not assigned</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {assignees.map(a => (
                  <div key={a.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{ background: 'var(--surface2)', color: 'var(--text)' }}>
                    {a.full_name || a.email}
                    {isAdmin && (
                      <button onClick={() => unassignUser(a.id)}
                        className="text-red-400 hover:text-red-300 leading-none">×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isAdmin && unassignedUsers.length > 0 && (
              <select className="input w-full" defaultValue=""
                onChange={e => { if (e.target.value) { assignUser(e.target.value); e.target.value = ''; } }}>
                <option value="" disabled>Assign user…</option>
                {unassignedUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Admin-only: tags + dependencies */}
        {isAdmin && (
          <>
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input className="input w-full"
                value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
                onChange={e => field('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                onBlur={handleBlur} />
            </div>
            <div>
              <label className="label">Dependencies (task IDs)</label>
              <input className="input w-full"
                value={Array.isArray(form.dependencies) ? form.dependencies.join(', ') : ''}
                onChange={e => field('dependencies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                onBlur={handleBlur} />
            </div>
          </>
        )}

        {/* Comments */}
        <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <label className="label mb-3 block">Comments</label>
          <TaskComments taskId={taskId} taskTitle={task.title} />
        </div>

        <p className="mono opacity-40">ID: {task.id}</p>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="border-t p-4 space-y-2 flex-none" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text)' }}>Delete this task?</p>
          <div className="flex gap-2">
            <button onClick={() => { deleteTask(taskId); onClose(); }}
              className="flex-1 py-1.5 rounded bg-red-500 text-white text-xs font-medium">
              Delete
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 py-1.5 rounded bg-[var(--surface2)] text-xs"
              style={{ color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
