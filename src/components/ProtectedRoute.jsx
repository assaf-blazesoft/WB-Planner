import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseEnabled } from '../lib/supabase';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-5 h-5 border-2 border-[#7F77DD] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If Supabase is not configured, skip auth entirely (dev mode)
  if (!isSupabaseEnabled) return children;

  if (!user) return <Navigate to="/login" replace />;

  if (adminOnly && profile?.role !== 'owner' && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
