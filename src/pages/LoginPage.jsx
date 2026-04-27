import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await signIn(email, password);
    if (err) {
      setError(err.message || 'Login failed. Check your credentials.');
      setLoading(false);
    } else {
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Winbonanza Planner
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="rounded-xl p-6 space-y-4 border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input w-full"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Access is invite-only. Contact your admin to get access.
        </p>
      </div>
    </div>
  );
}
