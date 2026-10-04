import type { ClassSession } from '@glitchers/shared';

const DAYS_OF_WEEK = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/**
 * Converts any time string (e.g. "09:00", "9:30", "14:15", "2:30 PM", "11:00 am")
 * into total minutes since midnight (0 to 1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toLowerCase();

  const isPM = cleaned.includes('pm');
  const isAM = cleaned.includes('am');

  const numbersOnly = cleaned.replace(/[^\d:]/g, '');
  const parts = numbersOnly.split(':');
  let hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Normalizes day name to 0-6 index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getDayIndex(day: string): number {
  if (!day) return -1;
  const upper = day.toUpperCase().trim();
  const found = DAYS_OF_WEEK.findIndex((d) => d === upper || upper.startsWith(d.slice(0, 3)));
  return found;
}

import type { StatusVariant } from '../components/common/StatusBadge';

export interface ClassLiveStatus {
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'DIFFERENT_DAY';
  label: string;
  badgeVariant: StatusVariant;
  diffMinutes: number;
}

/**
 * Calculates accurate real-time status of a class relative to `now`.
 */
export function getClassStatus(c: ClassSession, now: Date = new Date()): ClassLiveStatus {
  const currentDayIdx = now.getDay();
  const classDayIdx = getDayIndex(c.day);

  if (classDayIdx !== currentDayIdx) {
    return {
      status: 'DIFFERENT_DAY',
      label: c.day,
      badgeVariant: 'safe',
      diffMinutes: 0,
    };
  }

  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(c.startTime);
  const endMinutes = parseTimeToMinutes(c.endTime);

  // 1. Upcoming today
  if (curMinutes < startMinutes) {
    const diff = startMinutes - curMinutes;
    let label = '';
    if (diff === 1) {
      label = 'Starts in 1 min';
    } else if (diff < 60) {
      label = `Starts in ${diff} mins`;
    } else {
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      label = m === 0 ? `Starts in ${h}h` : `Starts in ${h}h ${m}m`;
    }
    return {
      status: 'UPCOMING',
      label,
      badgeVariant: 'countdown',
      diffMinutes: diff,
    };
  }

  // 2. Currently ongoing
  if (curMinutes >= startMinutes && curMinutes < endMinutes) {
    const remaining = endMinutes - curMinutes;
    const label = remaining <= 1 ? 'Ending now' : `In session (${remaining}m left)`;
    return {
      status: 'ONGOING',
      label,
      badgeVariant: 'live',
      diffMinutes: 0,
    };
  }

  // 3. Already completed today
  return {
    status: 'COMPLETED',
    label: 'Completed',
    badgeVariant: 'safe',
    diffMinutes: 0,
  };
}

export interface NextUpcomingClassResult {
  nextClass: ClassSession | null;
  statusLabel: string;
  badgeVariant: StatusVariant;
  isOngoing: boolean;
  isToday: boolean;
}

/**
 * Identifies the exact next class (or current ongoing class) from the user's schedule.
 */
export function getNextUpcomingClass(
  classes: ClassSession[],
  now: Date = new Date()
): NextUpcomingClassResult {
  if (!classes || classes.length === 0) {
    return {
      nextClass: null,
      statusLabel: 'No classes scheduled',
      badgeVariant: 'safe',
      isOngoing: false,
      isToday: false,
    };
  }

  const currentDayIdx = now.getDay();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Check classes scheduled for TODAY
  const todayClasses = classes
    .filter((c) => getDayIndex(c.day) === currentDayIdx && !c.isCancelled)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  // A. Check for currently ongoing class
  const ongoing = todayClasses.find((c) => {
    const s = parseTimeToMinutes(c.startTime);
    const e = parseTimeToMinutes(c.endTime);
    return curMinutes >= s && curMinutes < e;
  });

  if (ongoing) {
    const liveStatus = getClassStatus(ongoing, now);
    return {
      nextClass: ongoing,
      statusLabel: liveStatus.label,
      badgeVariant: 'live',
      isOngoing: true,
      isToday: true,
    };
  }

  // B. Check for upcoming class later today
  const upcomingToday = todayClasses.find((c) => parseTimeToMinutes(c.startTime) > curMinutes);
  if (upcomingToday) {
    const liveStatus = getClassStatus(upcomingToday, now);
    return {
      nextClass: upcomingToday,
      statusLabel: liveStatus.label,
      badgeVariant: 'countdown',
      isOngoing: false,
      isToday: true,
    };
  }

  // 2. No more classes today (or no classes at all today) — show nothing.
  // The home card is day-scoped by design: it only ever shows today's
  // ongoing or upcoming class, never a future day's class.
  return {
    nextClass: null,
    statusLabel: todayClasses.length > 0 ? 'All classes done for today' : 'No classes scheduled today',
    badgeVariant: 'safe',
    isOngoing: false,
    isToday: true,
  };
}

/**
 * "09:00" (24h) -> "9:00 AM"
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const mins = parseTimeToMinutes(timeStr);
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}
