export const CHANGE_BADGE = {
  new:       { label: 'New',      color: '#22c55e' },
  moved:     { label: 'Moved',    color: '#f59e0b' },
  extended:  { label: 'Extended', color: '#8b5cf6' },
  shortened: { label: 'Short\'d', color: '#06b6d4' },
  progress:  { label: 'Progress', color: '#3b82f6' },
  removed:   { label: 'Removed',  color: '#ef4444' },
};

export function classifyChange(task, baselineTask) {
  if (!baselineTask) return 'new';

  const bMin = Math.min(...baselineTask.weeks);
  const bMax = Math.max(...baselineTask.weeks);
  const cMin = Math.min(...task.weeks);
  const cMax = Math.max(...task.weeks);
  const bLen = bMax - bMin;
  const cLen = cMax - cMin;

  if (cLen > bLen) return 'extended';
  if (cLen < bLen) return 'shortened';
  if (bMin !== cMin) return 'moved';
  if ((baselineTask.progress_percent ?? 0) !== (task.progress_percent ?? 0)) return 'progress';
  return null;
}

export function computeSummary(currentTasks, baselineMap, removedTasks) {
  let moved = 0, extended = 0, shortened = 0, newItems = 0, progressChanged = 0;
  for (const t of currentTasks) {
    const c = classifyChange(t, baselineMap[t.id]);
    if (c === 'new')       newItems++;
    else if (c === 'moved')     moved++;
    else if (c === 'extended')  extended++;
    else if (c === 'shortened') shortened++;
    else if (c === 'progress')  progressChanged++;
  }
  const removed = removedTasks.length;
  return {
    total: moved + extended + shortened + newItems + removed + progressChanged,
    moved, extended, shortened, new: newItems, removed, progressChanged,
  };
}

// Generates mock baseline data from the current task list for testing.
// - task[0] → moved (shifted 1 week)
// - task[1] → extended (baseline was 1 week shorter)
// - task[2] → shortened (baseline was 2 weeks longer)
// - task[3] → progress changed
// - task[4] → "new" in current (skip from baseline entirely)
// - task[5+] → unchanged
// + one extra "removed" task (only in baseline)
export function loadMockBaseline(currentTasks, totalWeeks = 6) {
  if (currentTasks.length === 0) return [];
  const result = [];

  currentTasks.forEach((t, i) => {
    const minW = Math.min(...t.weeks);
    const maxW = Math.max(...t.weeks);

    if (i === 0) {
      // Moved: baseline started 1 week later than current
      const shift = maxW < totalWeeks ? 1 : -1;
      result.push({ ...t, weeks: t.weeks.map(w => Math.max(1, Math.min(totalWeeks, w + shift))) });
    } else if (i === 1) {
      // Extended: baseline was 1 week shorter (current is longer)
      const bMax = Math.max(minW, maxW - 1);
      result.push({ ...t, weeks: Array.from({ length: bMax - minW + 1 }, (_, j) => minW + j) });
    } else if (i === 2) {
      // Shortened: baseline was 2 weeks longer (current is shorter)
      const bMax = Math.min(totalWeeks, maxW + 2);
      result.push({ ...t, weeks: Array.from({ length: bMax - minW + 1 }, (_, j) => minW + j) });
    } else if (i === 3) {
      // Progress changed: baseline had different progress
      const bProgress = Math.max(0, Math.min(100, (t.progress_percent || 0) + 40));
      result.push({ ...t, progress_percent: bProgress });
    } else if (i === 4) {
      // "New" in current plan — omit from baseline entirely
    } else {
      result.push({ ...t });
    }
  });

  // Removed task: exists only in baseline
  const anchor = currentTasks[0];
  result.push({
    id: '__mock_removed_001__',
    title: 'Legacy Integration (Removed)',
    track: anchor.track,
    weeks: [Math.max(1, Math.min(...anchor.weeks)), Math.max(1, Math.min(...anchor.weeks) + 1)],
    progress_percent: 35,
  });

  return result;
}
