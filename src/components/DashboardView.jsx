import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import { useStore, useFilteredTasks } from '../store/tasks';
import { weekToEndDate, elapsedFraction } from '../utils/dates';
import { TRACK_COLORS, STATUS_COLORS } from '../lib/constants';

export default function DashboardView({ onSelectTask }) {
  const tasks = useFilteredTasks();
  const project = useStore(s => s.project);
  const totalWeeks = project.total_weeks;

  const total = tasks.length;
  const avgProgress = total ? Math.round(tasks.reduce((s, t) => s + t.progress_percent, 0) / total) : 0;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const blockedCount = tasks.filter(t => t.status === 'blocked').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  // By-track pie data
  const trackData = project.tracks.map(tr => ({
    name: tr.name.split(' ')[0],
    value: tasks.filter(t => t.track === tr.id).length,
    color: tr.color,
  })).filter(d => d.value > 0);

  // By-status bar data
  const statusData = Object.entries(STATUS_COLORS).map(([k, color]) => ({
    name: k.replace('_', ' '),
    count: tasks.filter(t => t.status === k).length,
    color,
  }));

  // Burndown: planned vs actual by week
  const burndownData = Array.from({ length: totalWeeks }, (_, i) => {
    const w = i + 1;
    const weekTasks = tasks.filter(t => t.weeks.includes(w));
    const planned = weekTasks.length > 0 ? 100 : 0;
    const actual = weekTasks.length > 0
      ? Math.round(weekTasks.reduce((s, t) => s + t.progress_percent, 0) / weekTasks.length)
      : 0;
    return { week: `W${w}`, planned, actual };
  });

  // At-risk: in_progress with low progress near end
  const elapsed = elapsedFraction(project.start_date, totalWeeks);
  const atRisk = tasks.filter(t =>
    t.status === 'in_progress' && t.progress_percent < Math.max(20, elapsed * 100 - 20)
  );

  // Upcoming deadlines: end date within 7 days
  const today = new Date();
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 7);
  const upcoming = tasks.filter(t => {
    if (t.status === 'done') return false;
    const endDate = weekToEndDate(project.start_date, Math.max(...t.weeks));
    return endDate >= today && endDate <= soon;
  });

  return (
    <div className="overflow-auto p-4 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={total} />
        <StatCard label="Avg Progress" value={`${avgProgress}%`} color="#7F77DD" />
        <StatCard label="Done" value={doneCount} color="#22c55e" />
        <StatCard label="Blocked" value={blockedCount} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By track pie */}
        <ChartCard title="Tasks by Track">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={trackData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                {trackData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* By status bar */}
        <ChartCard title="Tasks by Status">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Burndown */}
        <ChartCard title="Sprint Progress (Avg % per Week)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={burndownData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="actual" stroke="#7F77DD" strokeWidth={2} dot={{ r: 3 }} name="Actual %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* At risk + upcoming */}
        <div className="space-y-4">
          <ChartCard title={`At Risk (${atRisk.length})`}>
            {atRisk.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No tasks at risk.</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-auto">
                {atRisk.map(t => (
                  <div key={t.id} className="flex items-center justify-between cursor-pointer hover:bg-[var(--surface2)] px-1 py-0.5 rounded"
                    onClick={() => onSelectTask(t.id)}>
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--text)' }}>{t.title}</span>
                    <span className="text-xs text-red-400 ml-2">{t.progress_percent}%</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <ChartCard title={`Upcoming Deadlines (${upcoming.length})`}>
            {upcoming.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No deadlines in next 7 days.</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-auto">
                {upcoming.map(t => (
                  <div key={t.id} className="flex items-center justify-between cursor-pointer hover:bg-[var(--surface2)] px-1 py-0.5 rounded"
                    onClick={() => onSelectTask(t.id)}>
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--text)' }}>{t.title}</span>
                    <span className="text-xs text-amber-400 ml-2">Wk {Math.max(...t.weeks)}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || 'var(--text)' }}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <h3 className="text-xs font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}
