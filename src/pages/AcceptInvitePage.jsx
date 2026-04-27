import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AcceptInvitePage() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const token       = params.get('token');

  const [invite,   setInvite]   = useState(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid invite link.'); setLoading(false); return; }
    validateToken();
  }, [token]);

  async function validateToken() {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      setError('This invite link is invalid or has expired.');
    } else {
      setInvite(data);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSaving(false);
      return;
    }

    // Mark invite accepted
    await supabase.from('invites').update({ accepted: true }).eq('token', token);

    navigate('/', { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-5 h-5 border-2 border-[#7F77DD] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <a href="/login" className="text-xs underline" style={{ color: 'var(--text-muted)' }}>
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Accept Invite
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Set up your account for <strong>{invite?.email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="rounded-xl p-6 space-y-4 border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

          <div>
            <label className="label">Full name</label>
            <input
              className="input w-full"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input w-full"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded text-sm font-medium bg-[#7F77DD] text-white hover:bg-[#6b63cc] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
