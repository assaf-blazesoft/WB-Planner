import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

const PROJECT_CONFIG = {
  name: 'Winbonanza Weekly Planning',
  description: 'Weekly sprint planning across Operations Automation, Economy Automation, and New Features',
  start_date: '2026-04-27',
  sprint_length_days: 7,
  total_weeks: 6,
  tracks: [
    { id: 'ops',     name: 'Operations Automation', color: '#378ADD' },
    { id: 'economy', name: 'Economy Automation',    color: '#1D9E75' },
    { id: 'feature', name: 'New Features',          color: '#7F77DD' },
    { id: 'ongoing', name: 'Ongoing / Foundation',  color: '#888780' },
  ],
};

const MAX_HISTORY = 10;

function snapshot(state) {
  return { tasks: JSON.parse(JSON.stringify(state.tasks)) };
}

function withHistory(set, get, updater) {
  const prev = snapshot(get());
  set(state => {
    const next = updater(state);
    const history = [prev, ...state.history].slice(0, MAX_HISTORY);
    return { ...next, history, future: [] };
  });
}

// Write task to Supabase in background (fire-and-forget)
async function syncTask(action, id, data) {
  if (!isSupabaseEnabled) return;
  try {
    if (action === 'insert') await supabase.from('tasks').insert(data);
    if (action === 'update') await supabase.from('tasks').update(data).eq('id', id);
    if (action === 'delete') await supabase.from('tasks').delete().eq('id', id);
  } catch (err) {
    console.error('Supabase sync error:', err);
  }
}

export const useStore = create(
  persist(
    (set, get) => ({
      project: PROJECT_CONFIG,
      tasks: [],
      tasksLoading: false,
      filters: { track: '', status: '', owner: '', week: '', search: '' },
      activeView: 'gantt',
      darkMode: true,
      selectedTaskId: null,
      history: [],
      future: [],

      async loadTasks() {
        if (!isSupabaseEnabled) return;
        set({ tasksLoading: true });
        const { data, error } = await supabase.from('tasks').select('*');
        if (!error && data) set({ tasks: data, history: [], future: [] });
        set({ tasksLoading: false });
      },

      setActiveView(view) { set({ activeView: view }); },
      setDarkMode(val)   { set({ darkMode: val }); },
      setFilter(key, val) { set(s => ({ filters: { ...s.filters, [key]: val } })); },
      clearFilters() { set({ filters: { track: '', status: '', owner: '', week: '', search: '' } }); },
      setSelectedTaskId(id) { set({ selectedTaskId: id }); },

      addTask(task) {
        const newTask = {
          id: crypto.randomUUID(),
          title: '',
          description: '',
          track: 'feature',
          status: 'not_started',
          priority: 'medium',
          weeks: [1],
          progress_percent: 0,
          owner: '',
          dependencies: [],
          tags: [],
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...task,
        };
        withHistory(set, get, s => ({ tasks: [...s.tasks, newTask] }));
        syncTask('insert', newTask.id, newTask);
        return newTask.id;
      },

      updateTask(id, patch) {
        const updated = { ...patch, updated_at: new Date().toISOString() };
        withHistory(set, get, s => ({
          tasks: s.tasks.map(t => t.id === id ? { ...t, ...updated } : t),
        }));
        syncTask('update', id, updated);
      },

      deleteTask(id) {
        withHistory(set, get, s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
        syncTask('delete', id);
      },

      duplicateTask(id) {
        const src = get().tasks.find(t => t.id === id);
        if (!src) return;
        const dup = {
          ...src,
          id: crypto.randomUUID(),
          title: src.title + ' (copy)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        withHistory(set, get, s => ({ tasks: [...s.tasks, dup] }));
        syncTask('insert', dup.id, dup);
        return dup.id;
      },

      importTasks(newTasks) {
        withHistory(set, get, s => ({ tasks: [...s.tasks, ...newTasks] }));
        if (isSupabaseEnabled) {
          supabase.from('tasks').insert(newTasks).then(({ error }) => {
            if (error) console.error('Import sync error:', error);
          });
        }
      },

      replaceTasks(newTasks) {
        withHistory(set, get, s => ({ tasks: newTasks }));
      },

      undo() {
        const { history, future } = get();
        if (history.length === 0) return;
        const [prev, ...rest] = history;
        const curr = snapshot(get());
        set({ tasks: prev.tasks, history: rest, future: [curr, ...future].slice(0, MAX_HISTORY) });
      },

      redo() {
        const { history, future } = get();
        if (future.length === 0) return;
        const [next, ...rest] = future;
        const curr = snapshot(get());
        set({ tasks: next.tasks, future: rest, history: [curr, ...history].slice(0, MAX_HISTORY) });
      },

      getFilteredTasks() {
        const { tasks, filters } = get();
        return tasks.filter(t => {
          if (filters.track  && t.track !== filters.track) return false;
          if (filters.status && t.status !== filters.status) return false;
          if (filters.owner  && !t.owner?.toLowerCase().includes(filters.owner.toLowerCase())) return false;
          if (filters.week   && !t.weeks?.includes(Number(filters.week))) return false;
          if (filters.search) {
            const q = filters.search.toLowerCase();
            const hit = t.title?.toLowerCase().includes(q)
              || t.description?.toLowerCase().includes(q)
              || (t.notes || '').toLowerCase().includes(q);
            if (!hit) return false;
          }
          return true;
        });
      },
    }),
    {
      name: 'wb-ui',
      partialize: state => ({
        activeView: state.activeView,
        darkMode:   state.darkMode,
      }),
    }
  )
);

export function useFilteredTasks() {
  return useStore(useShallow(s => s.getFilteredTasks()));
}
