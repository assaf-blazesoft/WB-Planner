export function weekToStartDate(projectStartDate, week) {
  const start = new Date(projectStartDate);
  start.setDate(start.getDate() + (week - 1) * 7);
  return start;
}

export function weekToEndDate(projectStartDate, week) {
  const end = weekToStartDate(projectStartDate, week);
  end.setDate(end.getDate() + 6);
  return end;
}

export function weeksToDateRange(projectStartDate, weeks) {
  if (!weeks || weeks.length === 0) return { start: null, end: null };
  const minWeek = Math.min(...weeks);
  const maxWeek = Math.max(...weeks);
  return {
    start: weekToStartDate(projectStartDate, minWeek),
    end: weekToEndDate(projectStartDate, maxWeek),
  };
}

export function dateToWeek(projectStartDate, date) {
  const start = new Date(projectStartDate);
  const d = new Date(date);
  const diff = Math.floor((d - start) / (7 * 24 * 60 * 60 * 1000));
  return diff + 1;
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateFull(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function weekLabel(projectStartDate, week) {
  const start = weekToStartDate(projectStartDate, week);
  const end = weekToEndDate(projectStartDate, week);
  return `Wk ${week} (${formatDate(start)} – ${formatDate(end)})`;
}

export function weekRangeLabel(projectStartDate, weeks) {
  if (!weeks || weeks.length === 0) return '—';
  const min = Math.min(...weeks);
  const max = Math.max(...weeks);
  if (min === max) return weekLabel(projectStartDate, min);
  return `Wk ${min}–${max}`;
}

export function todayWeek(projectStartDate) {
  return dateToWeek(projectStartDate, new Date());
}

export function elapsedFraction(projectStartDate, totalWeeks) {
  const today = new Date();
  const start = new Date(projectStartDate);
  const totalMs = totalWeeks * 7 * 24 * 60 * 60 * 1000;
  const elapsed = today - start;
  return Math.min(1, Math.max(0, elapsed / totalMs));
}
