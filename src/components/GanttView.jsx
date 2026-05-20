import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useStore, useFilteredTasks } from '../store/tasks';
import { weekToStartDate, weekToEndDate, formatDate } from '../utils/dates';
import { TRACK_COLORS, TRACKS } from '../lib/constants';
import { classifyChange, computeSummary, loadMockBaseline, CHANGE_BADGE } from '../utils/baseline';

const WEEK_W = 160;
const ROW_H  = 40;
const LANE_H = 34;
const HEADER_H = 52;
const LEFT_W = 220;
const HANDLE_W = 8;

function todayOffset(projectStartDate, totalWeeks) {
  const start = new Date(projectStartDate);
  const today = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = (today - start) / msPerWeek;
  if (elapsed < 0 || elapsed > totalWeeks) return null;
  return elapsed * WEEK_W;
}

function GanttSkeleton({ totalWeeks }) {
  const MOCK = [
    { lane: true },
    { lane: false, bw: 220, bx: 8 },
    { lane: false, bw: 170, bx: 175 },
    { lane: true },
    { lane: false, bw: 350, bx: 8 },
    { lane: false, bw: 160, bx: 190 },
    { lane: false, bw: 200, bx: 100 },
    { lane: true },
    { lane: false, bw: 300, bx: 8 },
    { lane: false, bw: 140, bx: 170 },
  ];
  const mockH = MOCK.reduce((s, r) => s + (r.lane ? LANE_H : ROW_H), 0);
  const svgW  = totalWeeks * WEEK_W;

  return (
    <div className="flex flex-col h-full overflow-hidden animate-pulse">
      <div className="flex-1 overflow-auto min-h-0">
        <div className="sticky top-0 z-30 flex flex-none" style={{ height: HEADER_H, background: 'var(--surface)' }}>
          <div className="flex-none sticky left-0 z-40 border-b"
            style={{ width: LEFT_W, height: HEADER_H, background: 'var(--surface)', borderColor: 'var(--border)', borderRight: '1px solid var(--border)' }} />
          <div className="flex border-b flex-none" style={{ borderColor: 'var(--border)' }}>
            {Array.from({ length: totalWeeks }, (_, i) => (
              <div key={i} className="border-r flex flex-col items-center justify-center gap-1.5 flex-none"
                style={{ width: WEEK_W, borderColor: 'var(--border)', background: i % 2 === 0 ? 'var(--surface2)' : 'var(--surface)' }}>
                <div className="h-3 w-12 rounded" style={{ background: 'var(--border)' }} />
                <div className="h-2 w-8 rounded" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex">
          <div className="flex-none sticky left-0 z-20" style={{ width: LEFT_W, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
            {MOCK.map((r, i) => (
              <div key={i} className="border-b flex items-center px-3"
                style={{ height: r.lane ? LANE_H : ROW_H, borderColor: 'var(--border)', background: r.lane ? 'var(--surface2)' : undefined }}>
                <div className="h-2.5 rounded" style={{ width: r.lane ? '42%' : '72%', background: 'var(--border)' }} />
              </div>
            ))}
          </div>
          <div className="flex-none">
            <svg width={svgW} height={mockH} style={{ display: 'block' }}>
              {MOCK.map((r, i) => {
                const ry = MOCK.slice(0, i).reduce((s, m) => s + (m.lane ? LANE_H : ROW_H), 0);
                const rh = r.lane ? LANE_H : ROW_H;
                return (
                  <g key={i}>
                    <rect x={0} y={ry} width={svgW} height={rh}
                      fill={r.lane ? 'var(--surface2)' : 'transparent'}
                      stroke="var(--border)" strokeWidth={0.5} />
                    {!r.lane && (
                      <rect x={r.bx} y={ry + 7} width={r.bw} height={rh - 14} rx={4}
                        fill="var(--surface2)" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Change badge ──────────────────────────────────────────────────────────────
function ChangeBadge({ change }) {
  if (!change) return null;
  const { label, color } = CHANGE_BADGE[change];
  return (
    <span className="text-[9px] font-bold px-1 py-0.5 rounded ml-auto flex-none"
      style={{ background: color + '25', color, border: `1px solid ${color}44`, lineHeight: 1.4 }}>
      {label}
    </span>
  );
}

export default function GanttView({ onSelectTask }) {
  const tasks        = useFilteredTasks();
  const project      = useStore(s => s.project);
  const updateTask   = useStore(s => s.updateTask);
  const tasksLoading = useStore(s => s.tasksLoading);
  const totalTasks   = useStore(s => s.tasks.length);
  const clearFilters = useStore(s => s.clearFilters);

  const totalWeeks = project.total_weeks;
  const svgWidth   = totalWeeks * WEEK_W;

  // ── Comparison mode state ────────────────────────────────────────────────
  const [comparisonMode, setComparisonMode] = useState(false);
  const [baselineTasks,  setBaselineTasks]  = useState([]);
  const [changeFilter,   setChangeFilter]   = useState('all');

  const baselineMap = useMemo(() => {
    if (!comparisonMode) return {};
    return Object.fromEntries(baselineTasks.map(t => [t.id, t]));
  }, [comparisonMode, baselineTasks]);

  const removedTasks = useMemo(() => {
    if (!comparisonMode) return [];
    const ids = new Set(tasks.map(t => t.id));
    return baselineTasks.filter(t => !ids.has(t.id));
  }, [comparisonMode, baselineTasks, tasks]);

  const summary = useMemo(() => {
    if (!comparisonMode || baselineTasks.length === 0) return null;
    return computeSummary(tasks, baselineMap, removedTasks);
  }, [comparisonMode, tasks, baselineMap, removedTasks, baselineTasks.length]);

  function toggleComparison() {
    if (comparisonMode) {
      setComparisonMode(false);
      setChangeFilter('all');
    } else {
      setComparisonMode(true);
      if (baselineTasks.length === 0) {
        setBaselineTasks(loadMockBaseline(tasks, totalWeeks));
      }
    }
  }

  // ── Group tasks by track ────────────────────────────────────────────────
  const grouped = TRACKS.map(track => ({
    track,
    tasks: tasks
      .filter(t => t.track === track.id)
      .slice()
      .sort((a, b) => Math.min(...a.weeks) - Math.min(...b.weeks)),
  }));

  // ── Build rows (with comparison mode support) ───────────────────────────
  let rows = [];
  let y = 0;
  grouped.forEach(({ track, tasks: allTrackTasks }) => {
    let trackTasks = allTrackTasks;
    const trackRemoved = comparisonMode
      ? removedTasks.filter(t => t.track === track.id)
      : [];

    if (comparisonMode && changeFilter === 'changed') {
      trackTasks = allTrackTasks.filter(t => classifyChange(t, baselineMap[t.id]) !== null);
    } else if (comparisonMode && changeFilter === 'new-removed') {
      trackTasks = allTrackTasks.filter(t => classifyChange(t, baselineMap[t.id]) === 'new');
    }

    // Hide lane header entirely if nothing to show in this track
    if (comparisonMode && changeFilter !== 'all' && trackTasks.length === 0 && trackRemoved.length === 0) {
      return;
    }

    rows.push({ type: 'lane', track, y });
    y += LANE_H;

    trackTasks.forEach(task => {
      rows.push({ type: 'task', task, track, y });
      y += ROW_H;
    });

    // Removed tasks appear after current tasks in same track
    if (comparisonMode && changeFilter !== 'changed') {
      trackRemoved.forEach(task => {
        rows.push({ type: 'removed', task, track, y });
        y += ROW_H;
      });
    }
  });
  const totalH = y;

  const todayX = todayOffset(project.start_date, totalWeeks);

  // ── Drag state ──────────────────────────────────────────────────────────
  const dragRef      = useRef(null);
  const containerRef = useRef(null);
  const [dragPreview, setDragPreview] = useState(null);

  const startDrag = useCallback((e, taskId, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    dragRef.current = { taskId, mode, startX: e.clientX, origWeeks: [...task.weeks] };

    function onMove(ev) {
      if (!dragRef.current) return;
      const { taskId, mode, startX, origWeeks } = dragRef.current;
      const deltaX    = ev.clientX - startX;
      const deltaWeeks = Math.round(deltaX / WEEK_W);
      const minW = Math.min(...origWeeks);
      const maxW = Math.max(...origWeeks);
      let newMin = minW, newMax = maxW;
      if (mode === 'move')       { newMin = minW + deltaWeeks; newMax = maxW + deltaWeeks; }
      else if (mode === 'left')  { newMin = minW + deltaWeeks; }
      else if (mode === 'right') { newMax = maxW + deltaWeeks; }
      newMin = Math.max(1, newMin);
      newMax = Math.max(newMin, Math.min(totalWeeks, newMax));
      const newWeeks = Array.from({ length: newMax - newMin + 1 }, (_, i) => newMin + i);
      dragRef.current.pendingWeeks = deltaWeeks !== 0 ? newWeeks : null;
      setDragPreview(deltaWeeks !== 0 ? { taskId, weeks: newWeeks } : null);
    }

    function onUp() {
      if (dragRef.current?.pendingWeeks) {
        updateTask(dragRef.current.taskId, { weeks: dragRef.current.pendingWeeks });
      }
      setDragPreview(null);
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [tasks, totalWeeks, updateTask]);

  // ── Loading / empty states ──────────────────────────────────────────────
  if (tasksLoading) return <GanttSkeleton totalWeeks={totalWeeks} />;

  if (tasks.length === 0) {
    const isFiltered = totalTasks > 0;
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
          </svg>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              {isFiltered ? 'No tasks match your filters' : 'No tasks yet'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {isFiltered
                ? 'Try adjusting or clearing the active filters.'
                : 'Create your first task using the + button above.'}
            </p>
          </div>
          {isFiltered && (
            <button onClick={clearFilters}
              className="btn-sm bg-[var(--accent)] text-white text-xs px-4 py-1.5">
              Clear Filters
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-[var(--text-muted)]"
          style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: 'var(--status-conditional)', border: '1.5px dashed var(--status-conditional)' }} />
            Conditional
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1 rounded" style={{ background: 'var(--status-blocked)' }} />
            Today
          </span>
          <span>Drag bars to move · Drag edges to resize</span>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Comparison toolbar ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b flex-none"
        style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
        <button
          onClick={toggleComparison}
          className="flex items-center gap-1.5 text-xs px-3 py-1 rounded font-medium transition-colors"
          style={{
            background: comparisonMode ? 'var(--accent)' : 'var(--surface)',
            color:      comparisonMode ? 'white' : 'var(--text-muted)',
            border:     '1px solid var(--border)',
          }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          {comparisonMode ? 'Exit Comparison' : 'Compare to Baseline'}
        </button>

        {comparisonMode && baselineTasks.length > 0 && (
          <>
            <button
              onClick={() => setBaselineTasks(loadMockBaseline(tasks, totalWeeks))}
              className="text-xs px-2 py-1 rounded"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              Reload sample data
            </button>

            {/* Filter tabs */}
            <div className="flex gap-1 ml-2">
              {[
                { id: 'all',         label: 'All items' },
                { id: 'changed',     label: 'Changed only' },
                { id: 'new-removed', label: 'New / Removed' },
              ].map(f => (
                <button key={f.id}
                  onClick={() => setChangeFilter(f.id)}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: changeFilter === f.id ? 'var(--accent)' : 'var(--surface)',
                    color:      changeFilter === f.id ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Summary bar (shown only in comparison mode with data) ─────── */}
      {comparisonMode && summary && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-1.5 border-b flex-none text-xs"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <span className="font-semibold mr-1" style={{ color: 'var(--text)' }}>
            {summary.total} change{summary.total !== 1 ? 's' : ''}:
          </span>
          {summary.moved > 0 && (
            <span className="px-2 py-0.5 rounded font-medium"
              style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' }}>
              ↔ {summary.moved} moved
            </span>
          )}
          {summary.extended > 0 && (
            <span className="px-2 py-0.5 rounded font-medium"
              style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640' }}>
              ⟶ {summary.extended} extended
            </span>
          )}
          {summary.shortened > 0 && (
            <span className="px-2 py-0.5 rounded font-medium"
              style={{ background: '#06b6d420', color: '#06b6d4', border: '1px solid #06b6d440' }}>
              ⟵ {summary.shortened} shortened
            </span>
          )}
          {summary.new > 0 && (
            <span className="px-2 py-0.5 rounded font-medium"
              style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>
              + {summary.new} new
            </span>
          )}
          {summary.removed > 0 && (
            <span className="px-2 py-0.5 rounded font-medium"
              style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
              − {summary.removed} removed
            </span>
          )}
          {summary.progressChanged > 0 && (
            <span className="px-2 py-0.5 rounded font-medium"
              style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640' }}>
              ◎ {summary.progressChanged} progress
            </span>
          )}
        </div>
      )}

      {/* ── Single scroll container ─────────────────────────────────────
          One overflow-auto here handles ALL scroll (horizontal + vertical).
          Sidebar uses sticky left-0 so it stays pinned on H-scroll.
          Header row uses sticky top-0 so it stays pinned on V-scroll. */}
      <div className="flex-1 overflow-auto min-h-0" ref={containerRef}>

        {/* Sticky header */}
        <div className="sticky top-0 z-30 flex flex-none"
          style={{ height: HEADER_H, background: 'var(--surface)' }}>
          <div className="flex-none sticky left-0 z-40 flex items-end px-3 pb-2 border-b"
            style={{ width: LEFT_W, height: HEADER_H, background: 'var(--surface)', borderColor: 'var(--border)', borderRight: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold text-[var(--text-muted)]">Tasks</span>
          </div>
          <div className="flex-none border-b" style={{ borderColor: 'var(--border)' }}>
            <svg width={svgWidth} height={HEADER_H} style={{ display: 'block' }}>
              {Array.from({ length: totalWeeks }, (_, i) => {
                const w = i + 1;
                const x = i * WEEK_W;
                const startD = weekToStartDate(project.start_date, w);
                const endD   = weekToEndDate(project.start_date, w);
                const isEven = i % 2 === 0;
                return (
                  <g key={w}>
                    <title>{`Week ${w}: ${formatDate(startD)} – ${formatDate(endD)}`}</title>
                    <rect x={x} y={0} width={WEEK_W} height={HEADER_H}
                      fill={isEven ? 'var(--surface2)' : 'var(--surface)'}
                      stroke="var(--border)" strokeWidth={0.5} />
                    <text x={x + WEEK_W / 2} y={22} textAnchor="middle"
                      fill="var(--text)" fontSize={15} fontWeight="700">
                      Week {w}
                    </text>
                    <text x={x + WEEK_W / 2} y={40} textAnchor="middle"
                      fill="var(--text-muted)" fontSize={11}>
                      {formatDate(startD)} – {formatDate(endD)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Body */}
        <div className="flex">

          {/* Sidebar */}
          <div className="flex-none sticky left-0 z-20"
            style={{ width: LEFT_W, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
            {rows.map((row) => {
              if (row.type === 'lane') {
                return (
                  <div key={`lane-${row.track.id}`}
                    className="flex items-center px-3 font-semibold text-xs border-b"
                    style={{ height: LANE_H, background: row.track.color + '22', borderColor: 'var(--border)', color: row.track.color }}>
                    {row.track.name}
                  </div>
                );
              }

              if (row.type === 'removed') {
                return (
                  <div key={`removed-${row.task.id}`}
                    className="flex items-center gap-2 px-3 border-b"
                    style={{ height: ROW_H, borderColor: 'var(--border)', opacity: 0.65 }}>
                    <span className="flex-none text-[10px] font-bold px-1 py-0.5 rounded"
                      style={{ background: '#ef444422', color: '#ef4444', minWidth: 24, textAlign: 'center' }}>
                      RM
                    </span>
                    <span className="text-xs truncate line-through" style={{ color: '#ef4444' }}>{row.task.title}</span>
                    <ChangeBadge change="removed" />
                  </div>
                );
              }

              // type === 'task'
              const change = comparisonMode ? classifyChange(row.task, baselineMap[row.task.id]) : null;
              const startWk = Math.min(...row.task.weeks);
              return (
                <div key={row.task.id}
                  className="flex items-center gap-2 px-3 border-b cursor-pointer hover:bg-[var(--surface2)] transition-colors"
                  style={{ height: ROW_H, borderColor: 'var(--border)', color: 'var(--text)' }}
                  onClick={() => onSelectTask(row.task.id)}>
                  <span className="flex-none text-[10px] font-bold px-1 py-0.5 rounded"
                    style={{ background: row.track.color + '22', color: row.track.color, minWidth: 24, textAlign: 'center' }}>
                    W{startWk}
                  </span>
                  <span className="text-xs truncate">{row.task.title}</span>
                  {comparisonMode && <ChangeBadge change={change} />}
                </div>
              );
            })}
          </div>

          {/* Timeline SVG */}
          <div className="flex-none">
            <svg width={svgWidth} height={totalH} style={{ display: 'block' }}>

              {/* Column stripes */}
              {Array.from({ length: totalWeeks }, (_, i) => (
                <rect key={i} x={i * WEEK_W} y={0} width={WEEK_W} height={totalH}
                  fill={i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.045)'}
                  stroke="var(--border)" strokeWidth={1} />
              ))}

              {/* Lane backgrounds */}
              {rows.map(row => {
                if (row.type !== 'lane') return null;
                return (
                  <rect key={`bg-lane-${row.track.id}`} x={0} y={row.y} width={svgWidth} height={LANE_H}
                    fill={row.track.color + '11'} />
                );
              })}

              {/* ── Baseline bars (grey, dashed) — rendered BEFORE current bars ── */}
              {comparisonMode && rows.filter(r => r.type === 'task').map(row => {
                const baseline = baselineMap[row.task.id];
                if (!baseline) return null;
                const bMinW = Math.min(...baseline.weeks);
                const bMaxW = Math.max(...baseline.weeks);
                const bbx = (bMinW - 1) * WEEK_W + 4;
                const bbw = (bMaxW - bMinW + 1) * WEEK_W - 8;
                const bby = row.y + 6;
                const bbh = ROW_H - 12;
                const bProgressW = ((baseline.progress_percent ?? 0) / 100) * bbw;
                return (
                  <g key={`baseline-${row.task.id}`} style={{ pointerEvents: 'none' }}>
                    {/* Baseline bar body */}
                    <rect x={bbx} y={bby} width={bbw} height={bbh} rx={4}
                      fill="#9ca3af" fillOpacity={0.18}
                      stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 3" />
                    {/* Baseline progress */}
                    {(baseline.progress_percent ?? 0) > 0 && (
                      <rect x={bbx} y={bby} width={bProgressW} height={bbh} rx={4}
                        fill="#9ca3af" fillOpacity={0.3} />
                    )}
                  </g>
                );
              })}

              {/* ── Current task bars ────────────────────────────────────────── */}
              {rows.filter(r => r.type === 'task').map(row => {
                const { task } = row;
                const displayWeeks = dragPreview?.taskId === task.id ? dragPreview.weeks : task.weeks;
                const minW = Math.min(...displayWeeks);
                const maxW = Math.max(...displayWeeks);
                const bx = (minW - 1) * WEEK_W + 4;
                const bw = (maxW - minW + 1) * WEEK_W - 8;
                const by = row.y + 6;
                const bh = ROW_H - 12;
                const color = TRACK_COLORS[task.track] || '#888';
                const isConditional = task.status === 'conditional';
                const progressW = (task.progress_percent / 100) * bw;

                // Tooltip info for comparison mode
                const baseline  = comparisonMode ? baselineMap[task.id] : null;
                const change    = comparisonMode ? classifyChange(task, baseline) : null;
                const tooltipLines = [
                  task.title,
                  baseline
                    ? `Baseline: W${Math.min(...baseline.weeks)}–W${Math.max(...baseline.weeks)} (${baseline.progress_percent ?? 0}%)`
                    : 'Baseline: none (new item)',
                  `Current:  W${minW}–W${maxW} (${task.progress_percent}%)`,
                  change ? `Change: ${CHANGE_BADGE[change]?.label ?? change}` : 'No change',
                ].join('\n');

                return (
                  <g key={task.id}
                    onMouseDown={e => startDrag(e, task.id, 'move')}
                    onClick={e => { e.stopPropagation(); onSelectTask(task.id); }}
                    style={{ cursor: 'grab' }}>
                    {comparisonMode && <title>{tooltipLines}</title>}
                    <defs>
                      <clipPath id={`bar-clip-${task.id}`}>
                        <rect x={bx} y={by} width={bw} height={bh} rx={4} />
                      </clipPath>
                    </defs>
                    {/* Bar background */}
                    <rect x={bx} y={by} width={bw} height={bh} rx={4}
                      fill={color}
                      fillOpacity={isConditional ? 0.35 : 0.85}
                      stroke={isConditional ? 'var(--status-conditional)' : color}
                      strokeWidth={isConditional ? 1.5 : 0}
                      strokeDasharray={isConditional ? '4 3' : undefined}
                    />
                    {/* Progress fill */}
                    {task.progress_percent > 0 && (
                      <rect x={bx} y={by} width={progressW} height={bh}
                        fill={color} fillOpacity={1}
                        clipPath={`url(#bar-clip-${task.id})`} />
                    )}
                    {/* Label */}
                    <text x={bx + 7} y={by + bh / 2 + 4} fontSize={10} fill="white" style={{ pointerEvents: 'none' }}>
                      <tspan>{task.title.length > 28 ? task.title.slice(0, 28) + '…' : task.title}</tspan>
                    </text>
                    {/* Progress label */}
                    {task.progress_percent > 0 && (
                      <text x={bx + bw - 6} y={by + bh / 2 + 4} fontSize={9} fill="white"
                        textAnchor="end" style={{ pointerEvents: 'none' }}>
                        {task.progress_percent}%
                      </text>
                    )}
                    {/* Corner accent */}
                    <polygon
                      points={`${bx},${by} ${bx + 6},${by} ${bx},${by + 6}`}
                      fill="rgba(255,255,255,0.5)"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Left resize handle */}
                    <rect x={bx} y={by} width={HANDLE_W} height={bh} rx={4}
                      fill="transparent" style={{ cursor: 'ew-resize' }}
                      onMouseDown={e => startDrag(e, task.id, 'left')} />
                    {/* Right resize handle */}
                    <rect x={bx + bw - HANDLE_W} y={by} width={HANDLE_W} height={bh} rx={4}
                      fill="transparent" style={{ cursor: 'ew-resize' }}
                      onMouseDown={e => startDrag(e, task.id, 'right')} />
                  </g>
                );
              })}

              {/* ── Removed task bars (baseline only, red/faded) ─────────────── */}
              {comparisonMode && rows.filter(r => r.type === 'removed').map(row => {
                const t  = row.task;
                const minW = Math.min(...t.weeks);
                const maxW = Math.max(...t.weeks);
                const bx = (minW - 1) * WEEK_W + 4;
                const bw = (maxW - minW + 1) * WEEK_W - 8;
                const by = row.y + 6;
                const bh = ROW_H - 12;
                const pW = ((t.progress_percent ?? 0) / 100) * bw;
                return (
                  <g key={`removed-bar-${t.id}`} style={{ pointerEvents: 'none' }}>
                    <title>{`${t.title}\nRemoved from current plan\nBaseline: W${minW}–W${maxW} (${t.progress_percent ?? 0}%)`}</title>
                    <rect x={bx} y={by} width={bw} height={bh} rx={4}
                      fill="#ef4444" fillOpacity={0.15}
                      stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" />
                    {(t.progress_percent ?? 0) > 0 && (
                      <rect x={bx} y={by} width={pW} height={bh} rx={4}
                        fill="#ef4444" fillOpacity={0.25} />
                    )}
                    <text x={bx + 7} y={by + bh / 2 + 4} fontSize={10} fill="#ef4444" fillOpacity={0.8}
                      style={{ pointerEvents: 'none' }}>
                      {t.title.length > 28 ? t.title.slice(0, 28) + '…' : t.title}
                    </text>
                  </g>
                );
              })}

              {/* Today line */}
              {todayX !== null && (
                <g>
                  <line x1={todayX} y1={0} x2={todayX} y2={totalH}
                    stroke="var(--status-blocked)" strokeWidth={1.5} strokeDasharray="4 3" />
                  <rect x={todayX - 16} y={0} width={32} height={16} rx={3} fill="var(--status-blocked)" />
                  <text x={todayX} y={11} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
                    TODAY
                  </text>
                </g>
              )}

            </svg>
          </div>

        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-t text-xs text-[var(--text-muted)]"
        style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
        {comparisonMode ? (
          <>
            <span className="flex items-center gap-1.5">
              <svg width="28" height="10">
                <rect x={0} y={1} width={28} height={8} rx={2}
                  fill="#9ca3af" fillOpacity={0.2} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" />
              </svg>
              Original plan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-7 h-2.5 rounded" style={{ background: 'var(--accent)', opacity: 0.85 }} />
              Current plan
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="28" height="10">
                <rect x={0} y={1} width={28} height={8} rx={2}
                  fill="#ef4444" fillOpacity={0.15} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" />
              </svg>
              Removed
            </span>
            {Object.entries(CHANGE_BADGE).map(([key, { label, color }]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="px-1 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: color + '25', color, border: `1px solid ${color}44` }}>
                  {label}
                </span>
              </span>
            ))}
            <span className="ml-auto text-[var(--text-muted)]">Hover bars for details</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: '#EF9F27', border: '1.5px dashed #EF9F27' }} />
              Conditional
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded" style={{ background: '#ef4444' }} />
              Today
            </span>
            <span>Drag bars to move · Drag edges to resize</span>
          </>
        )}
      </div>
    </div>
  );
}
