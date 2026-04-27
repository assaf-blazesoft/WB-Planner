import { addDays, format, differenceInCalendarDays } from 'date-fns';

// Week indices are 1-based and project-relative.
// Monday-start weeks hold as long as project.start_date is a Monday.

export function weekToStartDate(projectStartDate, week) {
  return addDays(new Date(projectStartDate), (week - 1) * 7);
}

export function weekToEndDate(projectStartDate, week) {
  return addDays(new Date(projectStartDate), (week - 1) * 7 + 6);
}

export function dateToWeek(projectStartDate, date) {
  const diff = differenceInCalendarDays(new Date(date), new Date(projectStartDate));
  return Math.floor(diff / 7) + 1;
}

export function formatDate(date) {
  if (!date) return '';
  return format(new Date(date), 'MMM d');
}

export function formatDateFull(date) {
  if (!date) return '';
  return format(new Date(date), 'MMM d, yyyy');
}

export function weekLabel(projectStartDate, week) {
  const start = weekToStartDate(projectStartDate, week);
  const end   = weekToEndDate(projectStartDate, week);
  return `Wk ${week} · ${formatDate(start)} – ${formatDate(end)}`;
}

// Returns week number(s) AND the full calendar date range.
// Previously multi-week tasks showed "Wk 1–3" with no dates.
export function weekRangeLabel(projectStartDate, weeks) {
  if (!weeks || weeks.length === 0) return '—';
  const min   = Math.min(...weeks);
  const max   = Math.max(...weeks);
  const start = weekToStartDate(projectStartDate, min);
  const end   = weekToEndDate(projectStartDate, max);
  const range = `${formatDate(start)} – ${formatDate(end)}`;
  if (min === max) return `Wk ${min} · ${range}`;
  return `Wk ${min}–${max} · ${range}`;
}

export function elapsedFraction(projectStartDate, totalWeeks) {
  const today   = new Date();
  const start   = new Date(projectStartDate);
  const totalMs = totalWeeks * 7 * 24 * 60 * 60 * 1000;
  return Math.min(1, Math.max(0, (today - start) / totalMs));
}
