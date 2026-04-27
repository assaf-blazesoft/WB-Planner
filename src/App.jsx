import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useStore } from './store/tasks';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import GanttView from './components/GanttView';
import TableView from './components/TableView';
import DashboardView from './components/DashboardView';
import TaskDetailPanel from './components/TaskDetailPanel';
import TaskModal from './components/TaskModal';
import LoginPage from './pages/LoginPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import AdminPanel from './components/admin/AdminPanel';

export default function App() {
  const activeView    = useStore(s => s.activeView);
  const setActiveView = useStore(s => s.setActiveView);
  const darkMode      = useStore(s => s.darkMode);
  const loadTasks     = useStore(s => s.loadTasks);
  const undo          = useStore(s => s.undo);
  const redo          = useStore(s => s.redo);
  const duplicateTask = useStore(s => s.duplicateTask);
  const deleteTask    = useStore(s => s.deleteTask);
  const { user, loading } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [detailId,  setDetailId]  = useState(null);
  const searchRef = useRef(null);

  // Dark is default; add .light class when toggled off
  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  // Load tasks once auth is ready
  useEffect(() => {
    if (!loading) loadTasks();
  }, [loading]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return; }
      if (isInput) return;

      if (e.key === 'n') { e.preventDefault(); setShowModal(true); return; }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === '1') { setActiveView('gantt');     return; }
      if (e.key === '2') { setActiveView('table');     return; }
      if (e.key === '3') { setActiveView('dashboard'); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && detailId) {
        if (confirm('Delete this task?')) { deleteTask(detailId); setDetailId(null); }
        return;
      }
      if (e.key === 'Escape') { setDetailId(null); return; }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, detailId, setActiveView, deleteTask]);

  function openTask(id) { setDetailId(id); }
  function closeDetail() { setDetailId(null); }
  function handleDuplicate(id) {
    const newId = duplicateTask(id);
    if (newId) setDetailId(newId);
  }

  const viewProps = { onSelectTask: openTask };

  return (
    <Routes>
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/accept-invite"  element={<AcceptInvitePage />} />

      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
            <Header onNewTask={() => setShowModal(true)} />
            <div className="flex-1 overflow-auto">
              <AdminPanel />
            </div>
          </div>
        </ProtectedRoute>
      } />

      <Route path="/" element={
        <ProtectedRoute>
          <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
            <Header onNewTask={() => setShowModal(true)} />
            <FilterBar searchRef={searchRef} />

            <main className="flex-1 overflow-hidden relative">
              {activeView === 'gantt'     && <GanttView     {...viewProps} />}
              {activeView === 'table'     && <TableView     {...viewProps} />}
              {activeView === 'dashboard' && <DashboardView {...viewProps} />}
            </main>

            {detailId && (
              <TaskDetailPanel
                taskId={detailId}
                onClose={closeDetail}
                onDuplicate={handleDuplicate}
              />
            )}

            {showModal && (
              <TaskModal
                initialValues={{}}
                onClose={() => setShowModal(false)}
                onSaved={id => setDetailId(id)}
              />
            )}
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
