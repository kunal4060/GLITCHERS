/** Small date/time formatting helpers for the NIA redesign. */

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(full?: string | null): string {
  if (!full) return 'there';
  return full.trim().split(/\s+/)[0];
}

export function termLabel(date: Date = new Date()): string {
  const m = date.getMonth(); // 0-11
  const yy = String(date.getFullYear()).slice(2);
  if (m >= 7 && m <= 11) return `Autumn '${yy}`;
  if (m >= 0 && m <= 4) return `Winter '${yy}`;
  return `Summer '${yy}`;
}

export function monthCycleLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-IN', { month: 'long' }).toUpperCase() + ' CYCLE';
}

function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function dayName(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long' });
}

/** "Due tomorrow, 11:59 PM" / "Due in 2 days (Thursday)" / "Overdue by 1 day" ... */
export function formatDue(dueIso?: string | null): { text: string; urgent: boolean } {
  if (!dueIso) return { text: 'No due date', urgent: false };
  const due = new Date(dueIso);
  if (Number.isNaN(due.getTime())) return { text: 'No due date', urgent: false };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const dayDiff = Math.round((startOfDue - startOfToday) / 86400000);
  if (dayDiff < 0) {
    const n = Math.abs(dayDiff);
    return { text: n === 1 ? 'Overdue by 1 day' : `Overdue by ${n} days`, urgent: true };
  }
  if (dayDiff === 0) return { text: `Due today, ${fmtTime(due)}`, urgent: true };
  if (dayDiff === 1) return { text: `Due tomorrow, ${fmtTime(due)}`, urgent: true };
  if (dayDiff <= 6) return { text: `Due in ${dayDiff} days (${dayName(due)})`, urgent: dayDiff <= 2 };
  return {
    text: `Due ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    urgent: false,
  };
}

export function initials(name?: string | null): string {
  if (!name) return '•';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function inr(n: number): string {
  const v = Math.round(Math.abs(n));
  return '₹' + v.toLocaleString('en-IN');
}
