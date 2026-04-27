const COLUMNS = ['id','title','description','track','status','priority','weeks','progress_percent','owner','dependencies','tags','notes'];

export function tasksToCSV(tasks) {
  const header = COLUMNS.join(',');
  const rows = tasks.map(t => COLUMNS.map(col => {
    const val = t[col];
    if (Array.isArray(val)) return `"${val.join(';')}"`;
    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val ?? '';
  }).join(','));
  return [header, ...rows].join('\n');
}

export function downloadCSV(tasks, filename = 'winbonanza-tasks.csv') {
  const csv = tasksToCSV(tasks);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(tasks, project, filename = 'winbonanza-export.json') {
  const data = JSON.stringify({ project, tasks }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function csvToTasks(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVRow(line);
    const task = {};
    headers.forEach((h, i) => {
      const v = values[i] ?? '';
      if (h === 'weeks' || h === 'dependencies' || h === 'tags') {
        task[h] = v ? v.split(';').map(s => s.trim()).filter(Boolean) : [];
        if (h === 'weeks') task[h] = task[h].map(Number).filter(n => !isNaN(n));
      } else if (h === 'progress_percent') {
        task[h] = Number(v) || 0;
      } else {
        task[h] = v;
      }
    });
    if (!task.id) task.id = crypto.randomUUID();
    if (!task.created_at) task.created_at = new Date().toISOString();
    task.updated_at = new Date().toISOString();
    return task;
  });
}
