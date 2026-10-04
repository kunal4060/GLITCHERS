/**
 * taskIntentParser — natural-language (EN + Hinglish) task intent parser.
 *
 * Pure functions, no React Native dependencies: "kal shaam 5 baje physics
 * assignment submit karna hai, urgent hai" ->
 *   { title: "Physics assignment submit karna hai", dueDate: <ISO tomorrow 17:00>,
 *     priority: "HIGH", confidence: "high" }
 *
 * Used by AITaskCreatorScreen. Offline-first: the rule engine runs on-device;
 * callers may fall back to the on-device LLM (llama.rn) when confidence is low.
 */

export type TaskPriorityValue = 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREMELY_IMPORTANT';

export interface TaskDraft {
  title: string;
  description: string;
  /** ISO datetime string, or null when no date/time was detected. */
  dueDate: string | null;
  priority: TaskPriorityValue;
  confidence: 'high' | 'medium' | 'low';
  /** True when a title was found but no date — caller should ask for the date. */
  needsDate: boolean;
  /** True when no title text remains (e.g. bare "kal") — caller should ask for the title. */
  needsTitle?: boolean;
}

const HINDI_DAYS: Record<string, number> = {
  ravivaar: 0, itvaar: 0, sunday: 0,
  somvaar: 1, somvar: 1, monday: 1,
  mangalvaar: 2, mangalvar: 2, tuesday: 2,
  budhvaar: 3, budhvar: 3, wednesday: 3,
  gurvaar: 4, guruvaar: 4, thursday: 4,
  shukravaar: 5, shukravar: 5, friday: 5,
  shanivaar: 6, shanivar: 6, saturday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const FILLER_RE =
  /\b(please|pls|add|ek|mera|meri|mujhe|mujhko|ko|ka|ki|ke|hai|hain|ho|karna|karni|karo|kar do|karke|wala|wali|wale|par|pe|mein|me|se|tak|liye|aur|the|a|an|to|for|my|me|on|at|by|of)\b/gi;

const PREFIX_RE =
  /^(please\s+|pls\s+)?(add(\s+a)?\s+task(\s+for)?|create(\s+a)?\s+task(\s+for)?|make(\s+a)?\s+task(\s+for)?|remind\s+me\s+to|remind\s+me|set(\s+a)?\s+reminder(\s+for)?|set(\s+a)?\s+task|task(\s+banao)?|todo|add\s+karo|note\s+karo|likh\s+lo|mujhe\s+yaad\s+dilao(\s+ki)?|yaad\s+dilao(\s+ki)?|task\s+add\s+karo)\s+/i;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function nextWeekday(from: Date, weekday: number): Date {
  const c = startOfDay(from);
  let delta = (weekday - c.getDay() + 7) % 7;
  c.setDate(c.getDate() + delta);
  return c;
}

/** Parse date + optional time out of free text. Returns { date, consumed } where
 *  consumed are the raw substrings that were matched (so the caller can strip
 *  them from the title). */
function extractDateTime(text: string, now: Date): { date: Date | null; consumed: string[] } {
  const lower = text.toLowerCase();
  const consumed: string[] = [];
  let day: Date | null = null;
  let dayFromWeekday = false;
  let hour: number | null = null;
  let minute = 0;

  const eat = (m: RegExpMatchArray | null) => {
    if (m && m[0]) consumed.push(m[0]);
  };

  // --- day ---
  let m: RegExpMatchArray | null;
  if ((m = lower.match(/\b(aaj|today)\b/))) { day = startOfDay(now); eat(m); }
  else if ((m = lower.match(/\b(kal|tomorrow)\b/))) { day = startOfDay(now); day.setDate(day.getDate() + 1); eat(m); }
  else if ((m = lower.match(/\b(parso|day after tomorrow)\b/))) { day = startOfDay(now); day.setDate(day.getDate() + 2); eat(m); }
  else if ((m = lower.match(/\bnext\s+week\b/))) { day = startOfDay(now); day.setDate(day.getDate() + 7); eat(m); }
  else if ((m = lower.match(/\bweekend\b/))) { day = nextWeekday(now, 6); eat(m); }
  else if ((m = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|somvaar|somvar|mangalvaar|mangalvar|budhvaar|budhvar|gurvaar|guruvaar|shukravaar|shukravar|shanivaar|shanivar|ravivaar|itvaar)\b/))) {
    const wd = HINDI_DAYS[m[1]];
    if (wd !== undefined) { day = nextWeekday(now, wd); dayFromWeekday = true; eat(m); }
  } else if ((m = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/))) {
    const dNum = parseInt(m[1], 10);
    const mon = MONTHS[m[2].slice(0, 3)] ?? MONTHS[m[2]];
    if (mon !== undefined && dNum >= 1 && dNum <= 31) {
      day = new Date(now.getFullYear(), mon, dNum);
      if (day.getTime() < startOfDay(now).getTime()) day.setFullYear(day.getFullYear() + 1);
      eat(m);
    }
  } else if ((m = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) {
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    if (!Number.isNaN(d.getTime())) { day = d; eat(m); }
  } else if ((m = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/))) {
    const dNum = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    if (dNum >= 1 && dNum <= 31 && mon >= 0 && mon <= 11) {
      const yr = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : now.getFullYear();
      const candidate = new Date(yr, mon, dNum);
      // H13: reject impossible dates (31 feb rolls to Mar 3)
      if (candidate.getDate() !== dNum || candidate.getMonth() !== mon) {
        day = null; // invalid date, don't set
      } else {
        day = candidate;
        if (!m[3] && day.getTime() < startOfDay(now).getTime()) day.setFullYear(day.getFullYear() + 1);
        eat(m);
      }
    }
  }

  // --- time ---
  // "5 baje", "5:30 baje", "5pm", "5:30 pm", "17:00"
  if ((m = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*baje\b/))) {
    const h = parseInt(m[1], 10); const min = m[2] ? parseInt(m[2], 10) : 0;
    if (h >= 1 && h <= 12 && min >= 0 && min <= 59) {
      hour = h; minute = min; eat(m);
    }
  } else if ((m = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/))) {
    hour = parseInt(m[1], 10); minute = m[2] ? parseInt(m[2], 10) : 0;
    if (m[3] === 'pm' && hour < 12) hour += 12;
    if (m[3] === 'am' && hour === 12) hour = 0;
    eat(m);
  } else if ((m = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/))) {
    hour = parseInt(m[1], 10); minute = parseInt(m[2], 10); eat(m);
  }

  // --- day-period words adjust / default the hour ---
  if ((m = lower.match(/\b(subah|morning)\b/))) {
    if (hour === null) hour = 9; // 5 baje + subah stays 5 AM
    eat(m);
  } else if ((m = lower.match(/\b(dopahar|dopahar ko|afternoon)\b/))) {
    if (hour === null) hour = 14; else if (hour < 12) hour += 12;
    eat(m);
  } else if ((m = lower.match(/\b(shaam|sham|evening)\b/))) {
    if (hour === null) hour = 18; else if (hour < 12) hour += 12;
    eat(m);
  } else if ((m = lower.match(/\b(raat|night)\b/))) {
    if (hour === null) hour = 21;
    else if (hour === 12) hour = 0; // "12 baje raat" = midnight
    else if (hour < 12) hour += 12;
    eat(m);
  }

  if (!day && hour !== null) {
    // Time without a day: today if still upcoming, else tomorrow.
    day = startOfDay(now);
    const candidate = new Date(day);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getTime() <= now.getTime()) day.setDate(day.getDate() + 1);
  }
  if (!day) return { date: null, consumed };

  const out = new Date(day);
  if (hour !== null) out.setHours(hour, minute, 0, 0);
  else out.setHours(9, 0, 0, 0); // sensible default: 9 AM
  if (dayFromWeekday && out.getTime() <= now.getTime()) {
    out.setDate(out.getDate() + 7); // "remind me monday" on Monday 3 PM -> next Monday
  }
  return { date: out, consumed };
}

function extractPriority(text: string): { priority: TaskPriorityValue; consumed: string[] } {
  const lower = text.toLowerCase();
  const consumed: string[] = [];
  const eat = (m: RegExpMatchArray | null) => { if (m && m[0]) consumed.push(m[0]); };
  let m: RegExpMatchArray | null;
  if ((m = lower.match(/\b(asap|bahut\s+urgent|very\s+urgent|critical|extremely\s+important)\b/))) {
    eat(m); return { priority: 'EXTREMELY_IMPORTANT', consumed };
  }
  if ((m = lower.match(/\b(urgent|urgently|jaldi|important|zaroori|exam|test|deadline|interview)\b/))) {
    eat(m); return { priority: 'HIGH', consumed };
  }
  if ((m = lower.match(/\b(low\s+priority|aaram\s+se|jab\s+time\s+mile|whenever|not\s+urgent)\b/))) {
    eat(m); return { priority: 'LOW', consumed };
  }
  return { priority: 'NORMAL', consumed };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse a natural-language task request into a structured draft.
 * `now` is injectable for tests.
 */
export function parseTaskIntent(raw: string, now: Date = new Date()): TaskDraft {
  const original = raw.trim();
  if (!original) {
    return { title: '', description: '', dueDate: null, priority: 'NORMAL', confidence: 'low', needsDate: true, needsTitle: true };
  }

  // 1. Strip command prefix ("add task", "remind me to", "mujhe yaad dilao"...)
  let working = original.replace(PREFIX_RE, '').trim();

  // 2. Date/time
  const { date, consumed: dateBits } = extractDateTime(working, now);

  // 3. Priority
  const { priority, consumed: prioBits } = extractPriority(working);

  // 4. Remove consumed date/priority substrings from the title candidate.
  for (const bit of [...dateBits, ...prioBits]) {
    working = working.replace(new RegExp(escapeRegExp(bit), 'i'), ' ');
  }
  // 5. Remove filler words, collapse whitespace.
  working = working.replace(FILLER_RE, ' ').replace(/\s{2,}/g, ' ').trim();
  working = working.replace(/^[,\-–—:;.\s]+|[,\-–—:;.\s]+$/g, '').trim();

  let title = working;
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  const needsDate = !date;
  let confidence: TaskDraft['confidence'];
  if (!title) confidence = 'low';
  else if (date) confidence = 'high';
  else confidence = 'medium';

  return {
    title,
    description: '',
    dueDate: date ? date.toISOString() : null,
    priority,
    confidence,
    needsDate,
    needsTitle: !title,
  };
}

/** Quick check: is this message a confirmation ("haan", "yes", "kar do")? */
export function isConfirmation(text: string): boolean {
  return /^(haan|ha+|yes+|yeah|yep|ok+|okay|sahi hai|theek hai|kar do|add kar do|add kar|add karo|kardo|done|confirm|bilkul)\s*[.!]*$/i.test(text.trim());
}

/** Quick check: is this message a cancellation ("nahi", "no", "cancel")? */
export function isCancellation(text: string): boolean {
  return /^(nahi+|nhi|no+|nope|cancel|ruko|rehn de|rehne do|mat karo)\s*[.!]*$/i.test(text.trim());
}

/**
 * Format a draft as a short human-readable summary for the confirmation card.
 */
export function describeDraft(d: TaskDraft): { dueText: string; prioText: string } {
  let dueText = 'Koi date nahi';
  if (d.dueDate) {
    const dt = new Date(d.dueDate);
    const datePart = dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const timePart = dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    dueText = `${datePart}, ${timePart}`;
  }
  const prioText =
    d.priority === 'EXTREMELY_IMPORTANT' ? '🔴 Bahut urgent'
    : d.priority === 'HIGH' ? '🟠 Urgent'
    : d.priority === 'LOW' ? '🟢 Low'
    : '⚪ Normal';
  return { dueText, prioText };
}
