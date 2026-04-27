export const TRACK_COLORS = {
  ops:     '#378ADD',
  economy: '#1D9E75',
  feature: '#7F77DD',
  ongoing: '#888780',
};

export const STATUS_COLORS = {
  not_started: 'var(--status-not-started)',
  in_progress:  'var(--status-in-progress)',
  blocked:      'var(--status-blocked)',
  done:         'var(--status-done)',
  conditional:  'var(--status-conditional)',
};

export const PRIORITY_COLORS = {
  high:   '#ef4444',
  medium: '#EF9F27',
  low:    '#22c55e',
};

export const TRACKS = [
  { id: 'ops',     name: 'Operations Automation',  color: TRACK_COLORS.ops },
  { id: 'economy', name: 'Economy Automation',      color: TRACK_COLORS.economy },
  { id: 'feature', name: 'New Features',            color: TRACK_COLORS.feature },
  { id: 'ongoing', name: 'Ongoing / Foundation',    color: TRACK_COLORS.ongoing },
];

export const STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked',     label: 'Blocked' },
  { value: 'done',        label: 'Done' },
  { value: 'conditional', label: 'Conditional' },
];

export const PRIORITIES = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
];
