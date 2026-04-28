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
      className="flex items-center justify-between px-4 py-2.5 border-b flex-none"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Left: project name + nav */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="font-bold text-sm tracking-tight hover:opacity-80 transition-opacity focus-ring rounded"
          style={{ color: 'var(--text)' }}
        >
          {project.name}
        </button>

        {!isAdminPage && (
          <nav className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--surface2)' }}>
            {VIEWS.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 focus-ring ${
                  activeView === v.id
                    ? 'shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
                style={activeView === v.id ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' } : {}}
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
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus-ring"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            + New task
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => navigate(isAdminPage ? '/' : '/admin')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--surface2)] transition-colors focus-ring"
            style={{ color: 'var(--text-muted)' }}
          >
            {isAdminPage ? '← Back' : 'Admin'}
          </button>
        )}

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface2)] transition-colors focus-ring"
          style={{ color: 'var(--text-muted)' }}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1"  x2="12" y2="3"  />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"  />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1"  y1="12" x2="3"  y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        {profile && (
          <div className="flex items-center gap-2 pl-2.5 border-l" style={{ borderColor: 'var(--border)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}>
              {(profile.full_name || profile.email || '?')[0].toUpperCase()}
            </div>
            <button
              onClick={signOut}
              className="text-xs hover:text-[var(--text)] transition-colors focus-ring rounded"
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
