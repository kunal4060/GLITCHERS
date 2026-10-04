/**
 * IST (Asia/Kolkata) date helpers.
 * The server runs on UTC but users are in IST — using `new Date()` directly
 * for "today"/month boundaries gives the wrong date between 00:00–05:30 IST.
 */

/** Current date/time as seen in Asia/Kolkata. */
export function getISTNow(): Date {
  // IST = UTC+5:30, no DST
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}

/** Today's date string (YYYY-MM-DD) in IST. */
export function getISTDateStr(d: Date = getISTNow()): string {
  return d.toISOString().slice(0, 10);
}

/** Weekday index (0=Sunday) in IST. */
export function getISTDay(d: Date = getISTNow()): number {
  return d.getUTCDay();
}
