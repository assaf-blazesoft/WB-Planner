import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useStore, useFilteredTasks } from '../store/tasks';
import { weekToStartDate, weekToEndDate, formatDate } from '../utils/dates';
import { TRACK_COLORS } from '../lib/constants';

const WEEK_W = 160;
const ROW_H = 40;
const LANE_H = 34;
const HEADER_H = 52;
const LEFT_W = 220;
const HANDLE_W = 8;

const TRACK_ORDER = ['ops', 'economy', 'feature', 'ongoing'];

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
  return (
    <div className="flex flex-col h-full overflow-hidden animate-pulse">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-none border-r" style={{ width: LEFT_W, borderColor: 'var(--border)' }}>
          <div className="border-b" style={{ height: HEADER_H, borderColor: 'var(--border)' }} />
          {MOCK.map((r, i) => (
            <div key={i} className="border-b flex items-center px-3"
              style={{ height: r.lane ? LANE_H : ROW_H, borderColor: 'var(--border)',
                background: r.lane ? 'var(--surface2)' : undefined }}>
              <div className="h-2.5 rounded" style={{ width: r.lane ? '42%' : '72%', background: 'var(--border)' }} />
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex border-b" style={{ height: HEADER_H, borderColor: 'var(--border)' }}>
            {Array.from({ length: totalWeeks }, (_, i) => (
              <div key={i} className="border-r flex flex-col items-center justify-center gap-1.5 flex-none"
                style={{ width: WEEK_W, borderColor: 'var(--border)',
                  background: i % 2 === 0 ? 'var(--surface2)' : 'var(--surface)' }}>
                <div className="h-3 w-12 rounded" style={{ background: 'var(--border)' }} />
                <div className="h-2 w-8 rounded" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
          {MOCK.map((r, i) => (
            <div key={i} className="border-b relative"
              style={{ height: r.lane ? LANE_H : ROW_H, borderColor: 'var(--border)',
                background: r.lane ? 'var(--surface2)' : undefined }}>
              {!r.lane && (
                <div className="absolute rounded"
                  style={{ top: 7, left: r.bx, width: r.bw, height: ROW_H - 14,
                    background: 'var(--surface2)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GanttView({ onSelectTask }) {
  const tasks = useFilteredTasks();
  const project = useStore(s => s.project);
  const updateTask = useStore(s => s.updateTask);
  const tasksLoading = useStore(s => s.tasksLoading);
  const totalTasks = useStore(s => s.tasks.length);
  const clearFilters = useStore(s => s.clearFilters);

  const totalWeeks = project.total_weeks;
  const svgWidth = totalWeeks * WEEK_W;

  // Group by track, sorted by starting week within each track
  const grouped = TRACK_ORDER.map(trackId => ({
    track: project.tracks.find(t => t.id === trackId) || { id: trackId, name: trackId, color: TRACK_COLORS[trackId] },
    tasks: tasks
      .filter(t => t.track === trackId)
      .slice()
      .sort((a, b) => Math.min(...a.weeks) - Math.min(...b.weeks)),
  }));

  // Compute rows with y positions
  let rows = [];
  let y = 0;
  grouped.forEach(({ track, tasks: trackTasks }) => {
    rows.push({ type: 'lane', track, y });
    y += LANE_H;
    trackTasks.forEach(task => {
      rows.push({ type: 'task', task, track, y });
      y += ROW_H;
    });
  });
  const totalH = y;

  const todayX = todayOffset(project.start_date, totalWeeks);

  // Drag state
  const dragRef = useRef(null);
  const containerRef = useRef(null);

  const [dragPreview, setDragPreview] = useState(null);

  const startDrag = useCallback((e, taskId, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    dragRef.current = {
      taskId,
      mode,
      startX: e.clientX,
      origWeeks: [...task.weeks],
    };

    function onMove(ev) {
      if (!dragRef.current) return;
      const { taskId, mode, startX, origWeeks } = dragRef.current;
      const deltaX = ev.clientX - startX;
      const deltaWeeks = Math.round(deltaX / WEEK_W);
      const minW = Math.min(...origWeeks);
      const maxW = Math.max(...origWeeks);
      let newMin = minW, newMax = maxW;
      if (mode === 'move') {
        newMin = minW + deltaWeeks;
        newMax = maxW + deltaWeeks;
      } else if (mode === 'left') {
        newMin = minW + deltaWeeks;
      } else if (mode === 'right') {
        newMax = maxW + deltaWeeks;
      }
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
            <span className="w-3 h-3 rounded" style={{ background: '#EF9F27', border: '1.5px dashed #EF9F27' }} />
            Conditional
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1 rounded" style={{ background: '#ef4444' }} />
            Today
          </span>
          <span>Drag bars to move · Drag edges to resize</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-auto" ref={containerRef}>
        {/* Left label column */}
        <div className="flex-none sticky left-0 z-20" style={{ width: LEFT_W, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
          {/* Header spacer */}
          <div className="border-b flex items-end px-3 pb-2" style={{ height: HEADER_H, borderColor: 'var(--border)' }}>
            <span className="text-xs font-semibold text-[var(--text-muted)]">Tasks</span>
          </div>
          {rows.map((row, i) => {
            if (row.type === 'lane') {
              return (
                <div key={`lane-${row.track.id}`}
                  className="flex items-center px-3 font-semibold text-xs border-b"
                  style={{ height: LANE_H, background: row.track.color + '22', borderColor: 'var(--border)', color: row.track.color }}>
                  {row.track.name}
                </div>
              );
            }
            const startWk = Math.min(...row.task.weeks);
            return (
              <div key={row.task.id}
                className="flex items-center gap-2 px-3 border-b cursor-pointer hover:bg-[var(--surface2)] transition-colors"
                style={{ height: ROW_H, borderColor: 'var(--border)', color: 'var(--text)' }}
                onClick={() => onSelectTask(row.task.id)}
              >
                <span className="flex-none text-[10px] font-bold px-1 py-0.5 rounded"
                  style={{ background: row.track.color + '22', color: row.track.color, minWidth: 24, textAlign: 'center' }}>
                  W{startWk}
                </span>
                <span className="text-xs truncate">{row.task.title}</span>
              </div>
            );
          })}
        </div>

        {/* SVG canvas */}
        <div className="flex-1 overflow-auto">
          <svg width={svgWidth} height={totalH + HEADER_H} style={{ display: 'block' }}>
            {/* Week header */}
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

            {/* Grid body */}
            <g transform={`translate(0,${HEADER_H})`}>
              {/* Column stripes — stronger alternating bands */}
              {Array.from({ length: totalWeeks }, (_, i) => (
                <rect key={i} x={i * WEEK_W} y={0} width={WEEK_W} height={totalH}
                  fill={i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.045)'}
                  stroke="var(--border)" strokeWidth={1} />
              ))}

              {/* Row backgrounds */}
              {rows.map(row => {
                if (row.type === 'lane') {
                  return (
                    <rect key={`bg-lane-${row.track.id}`} x={0} y={row.y} width={svgWidth} height={LANE_H}
                      fill={row.track.color + '11'} />
                  );
                }
                return null;
              })}

              {/* Task bars */}
              {rows.filter(r => r.type === 'task').map(row => {
                const { task, track } = row;
                const displayWeeks = dragPreview?.taskId === task.id ? dragPreview.weeks : task.weeks;
                const minW = Math.min(...displayWeeks);
                const maxW = Math.max(...displayWeeks);
                const x = (minW - 1) * WEEK_W + 4;
                const w = (maxW - minW + 1) * WEEK_W - 8;
                const y = row.y + 6;
                const h = ROW_H - 12;
                const color = TRACK_COLORS[task.track] || '#888';
                const isConditional = task.status === 'conditional';
                const progressW = (task.progress_percent / 100) * w;

                return (
                  <g key={task.id}
                    onMouseDown={e => startDrag(e, task.id, 'move')}
                    onClick={e => { e.stopPropagation(); onSelectTask(task.id); }}
                    style={{ cursor: 'grab' }}>
                    <defs>
                      <clipPath id={`bar-clip-${task.id}`}>
                        <rect x={x} y={y} width={w} height={h} rx={4} />
                      </clipPath>
                    </defs>
                    {/* Bar background */}
                    <rect x={x} y={y} width={w} height={h} rx={4}
                      fill={color}
                      fillOpacity={isConditional ? 0.35 : 0.85}
                      stroke={isConditional ? '#EF9F27' : color}
                      strokeWidth={isConditional ? 1.5 : 0}
                      strokeDasharray={isConditional ? '4 3' : undefined}
                    />
                    {/* Progress fill — clipped to bar bounds via SVG clipPath */}
                    {task.progress_percent > 0 && (
                      <rect x={x} y={y} width={progressW} height={h}
                        fill={color} fillOpacity={1}
                        clipPath={`url(#bar-clip-${task.id})`} />
                    )}
                    {/* Label */}
                    <text x={x + 7} y={y + h / 2 + 4} fontSize={10} fill="white" style={{ pointerEvents: 'none' }}>
                      <tspan>{task.title.length > 28 ? task.title.slice(0, 28) + '…' : task.title}</tspan>
                    </text>
                    {/* Progress label */}
                    {task.progress_percent > 0 && (
                      <text x={x + w - 6} y={y + h / 2 + 4} fontSize={9} fill="white"
                        textAnchor="end" style={{ pointerEvents: 'none' }}>
                        {task.progress_percent}%
                      </text>
                    )}
                    {/* Start-week indicator — small white triangle at left edge */}
                    <polygon
                      points={`${x},${y} ${x + 6},${y} ${x},${y + 6}`}
                      fill="rgba(255,255,255,0.5)"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Left resize handle */}
                    <rect x={x} y={y} width={HANDLE_W} height={h} rx={4}
                      fill="transparent" style={{ cursor: 'ew-resize' }}
                      onMouseDown={e => startDrag(e, task.id, 'left')} />
                    {/* Right resize handle */}
                    <rect x={x + w - HANDLE_W} y={y} width={HANDLE_W} height={h} rx={4}
                      fill="transparent" style={{ cursor: 'ew-resize' }}
                      onMouseDown={e => startDrag(e, task.id, 'right')} />
                  </g>
                );
              })}

              {/* Today line */}
              {todayX !== null && (
                <g>
                  <line x1={todayX} y1={0} x2={todayX} y2={totalH}
                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" />
                  <rect x={todayX - 16} y={0} width={32} height={16} rx={3} fill="#ef4444" />
                  <text x={todayX} y={11} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
                    TODAY
                  </text>
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-[var(--text-muted)]"
        style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#EF9F27', border: '1.5px dashed #EF9F27' }} />
          Conditional
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-1 rounded" style={{ background: '#ef4444' }} />
          Today
        </span>
        <span>Drag bars to move · Drag edges to resize</span>
      </div>
    </div>
  );
}
