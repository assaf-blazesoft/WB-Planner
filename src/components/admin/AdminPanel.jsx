import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sendEmail } from '../../lib/email';

export default function AdminPanel() {
  const { profile } = useAuth();
  const [invites,  setInvites]  = useState([]);
  const [users,    setUsers]    = useState([]);
  const [email,    setEmail]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [message,  setMessage]  = useState('');

  useEffect(() => {
    if (isSupabaseEnabled) {
      fetchData();
    }
  }, []);

  async function fetchData() {
    const [{ data: inv }, { data: usr }] = await Promise.all([
      supabase.from('invites').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ]);
    if (inv) setInvites(inv);
    if (usr) setUsers(usr);
  }

  async function sendInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMessage('');

    if (!isSupabaseEnabled) {
      setMessage('Supabase is not configured. Cannot send invites in offline mode.');
      setSending(false);
      return;
    }

    // Check if already invited or a user
    const existing = invites.find(i => i.email === email);
    const existingUser = users.find(u => u.email === email);
    if (existing || existingUser) {
      setMessage(`${email} is already ${existingUser ? 'a user' : 'invited'}.`);
      setSending(false);
      return;
    }

    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('invites').insert({
      email,
      token,
      invited_by: profile?.id,
      expires_at: expiresAt,
    });

    if (error) {
      setMessage('Failed to create invite: ' + error.message);
      setSending(false);
      return;
    }

    await sendEmail('invite', email, {
      inviterName: profile?.full_name || profile?.email,
      token,
      appUrl: window.location.origin,
    });

    setMessage(`Invite sent to ${email}`);
    setEmail('');
    fetchData();
    setSending(false);
  }

  async function revokeInvite(id) {
    await supabase.from('invites').delete().eq('id', id);
    setInvites(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Admin Panel</h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Manage users and invites</p>
      </div>

      {/* Invite form */}
      <section className="rounded-xl p-4 border space-y-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Invite a user
        </h2>
        <form onSubmit={sendInvite} className="flex gap-2">
          <input
            type="email"
            className="input flex-1"
            placeholder="user@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {message && (
          <p className="text-xs" style={{ color: message.startsWith('Invite sent') ? 'var(--status-done)' : 'var(--status-blocked)' }}>
            {message}
          </p>
        )}
      </section>

      {/* Pending invites */}
      <section className="rounded-xl p-4 border space-y-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Pending invites ({invites.filter(i => !i.accepted).length})
        </h2>
        {invites.filter(i => !i.accepted).length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No pending invites.</p>
        ) : (
          <div className="space-y-2">
            {invites.filter(i => !i.accepted).map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-xs">
                <div>
                  <span style={{ color: 'var(--text)' }}>{inv.email}</span>
                  <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => revokeInvite(inv.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users */}
      <section className="rounded-xl p-4 border space-y-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Users ({users.length})
        </h2>
        {users.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No users yet.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-xs">
                    {(u.full_name || u.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text)' }}>{u.full_name || '—'}</span>
                    <span className="ml-2" style={{ color: 'var(--text-muted)' }}>{u.email}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    background: u.role === 'owner' ? 'color-mix(in srgb, var(--accent) 13%, transparent)' : u.role === 'admin' ? 'color-mix(in srgb, var(--status-in-progress) 13%, transparent)' : 'var(--surface2)',
                    color: u.role === 'owner' ? 'var(--accent)' : u.role === 'admin' ? 'var(--status-in-progress)' : 'var(--text-muted)',
                  }}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
