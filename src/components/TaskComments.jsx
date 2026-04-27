import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { sendEmail } from '../lib/email';

export default function TaskComments({ taskId, taskTitle }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [text,     setText]     = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!isSupabaseEnabled || !taskId) return;
    fetchComments();
  }, [taskId]);

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name, email)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);

    if (isSupabaseEnabled) {
      const { data } = await supabase
        .from('comments')
        .insert({ task_id: taskId, user_id: user.id, content: text.trim() })
        .select('*, profiles(full_name, email)')
        .single();
      if (data) {
        setComments(prev => [...prev, data]);
        // Notify task assignees
        const { data: assignments } = await supabase
          .from('task_assignments')
          .select('profiles(email)')
          .eq('task_id', taskId);
        assignments?.forEach(a => {
          if (a.profiles?.email && a.profiles.email !== user.email) {
            sendEmail('new_comment', a.profiles.email, {
              commenterName: profile?.full_name || user.email,
              taskTitle,
              comment: text.trim(),
            });
          }
        });
      }
    } else {
      // Offline mode: local only
      setComments(prev => [...prev, {
        id: crypto.randomUUID(),
        content: text.trim(),
        created_at: new Date().toISOString(),
        profiles: { full_name: profile?.full_name || 'You', email: '' },
      }]);
    }

    setText('');
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] py-2">No comments yet.</p>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-[#7F77DD]/20 flex items-center justify-center flex-none text-xs text-[#7F77DD] font-bold">
                {(c.profiles?.full_name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                    {c.profiles?.full_name || c.profiles?.email || 'Unknown'}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs mt-0.5 break-words" style={{ color: 'var(--text)' }}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="input flex-1 text-xs"
          placeholder="Add a comment…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="px-3 py-1 rounded text-xs bg-[#7F77DD] text-white disabled:opacity-40 hover:bg-[#6b63cc] transition-colors"
        >
          Post
        </button>
      </form>
    </div>
  );
}
