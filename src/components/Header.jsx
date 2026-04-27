import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/tasks';
import { useAuth } from '../contexts/AuthContext';

const VIEWS = [
  { id: 'gantt',     label: 'Gantt',     key: '1' },
  { id: 'table',     label: 'Table',     key: '2' },
  { id: 'dashboard', label: 'Dashboard', key: '3' },
];

export default function Header({ onNewTask }) {
  const activeView    = useStore(s => s.activeView);
  const setActiveView = useStore(s => s.setActiveView);
  const darkMode      = useStore(s => s.darkMode);
  const setDarkMode   = useStore(s => s.setDarkMode);
  const project       = useStore(s => s.project);
  const { profile, isAdmin, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isAdminPage = location.pathname === '/admin';

  return (
    <header
      className="flex items-center justify-between px-4 py-2 border-b flex-none"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Left: project name + nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="font-bold text-sm tracking-wide hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text)' }}
        >
          {project.name}
        </button>

        {!isAdminPage && (
          <nav className="flex gap-1">
            {VIEWS.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeView === v.id
                    ? 'bg-[#7F77DD] text-white'
                    : 'hover:bg-[var(--surface2)] text-[var(--text-muted)]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {!isAdminPage && isAdmin && (
          <button
            onClick={() => onNewTask()}
            className="px-3 py-1 rounded text-xs font-medium bg-[#7F77DD] text-white hover:bg-[#6b63cc] transition-colors"
          >
            + New task
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => navigate(isAdminPage ? '/' : '/admin')}
            className="px-3 py-1 rounded text-xs font-medium hover:bg-[var(--surface2)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {isAdminPage ? 'Back' : 'Admin'}
          </button>
        )}

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded hover:bg-[var(--surface2)] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Toggle theme"
        >
          {darkMode ? '☀' : '◑'}
        </button>

        {profile && (
          <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: 'var(--border)' }}>
            <div className="w-6 h-6 rounded-full bg-[#7F77DD]/20 flex items-center justify-center text-[#7F77DD] text-xs font-bold">
              {(profile.full_name || profile.email || '?')[0].toUpperCase()}
            </div>
            <button
              onClick={signOut}
              className="text-xs hover:text-[var(--text)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
