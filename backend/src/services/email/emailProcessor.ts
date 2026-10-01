import type { EmailSummary, ScheduleChangeExtraction } from '@glitchers/shared';

export function isUniversityEmail(sender: string, universityDomain: string = 'university.edu'): boolean {
  if (!sender) return false;

  // Parse the domain from the address (after the last '@'), so heuristics
  // only ever match against the domain — never the local part or a display name.
  const atIndex = sender.lastIndexOf('@');
  if (atIndex <= 0) return false; // missing '@' or empty local part

  const domain = sender
    .slice(atIndex + 1)
    .trim()
    .toLowerCase()
    .replace(/^[<\s]+|[>\s]+$/g, ''); // strip e.g. "Name <user@domain.edu>"
  if (!domain) return false;

  const cleanDomain = universityDomain.trim().toLowerCase();
  if (!cleanDomain) return false; // an empty configured domain must not match everything

  return (
    domain === cleanDomain ||
    domain.endsWith(`.${cleanDomain}`) ||
    domain.includes('faculty') ||
    domain.includes('professor') ||
    domain.includes('examcell') ||
    domain.includes('registrar') ||
    domain.includes('academics')
  );
}

export function parseScheduleChangeNotice(subject: string, body: string): ScheduleChangeExtraction {
  const content = `${subject} ${body}`.toLowerCase();

  const hasShift =
    content.includes('shift') ||
    content.includes('reschedule') ||
    content.includes('moved') ||
    content.includes('postponed') ||
    content.includes('change in schedule');

  if (!hasShift) {
    return {
      hasScheduleChange: false,
    };
  }

  // Extract room changes e.g. "AB2-301" or "Room 204"
  const roomMatch = content.match(/\b(ab\d+-\d+|room\s*\d+|hall\s*[a-z0-9]+)\b/i);
  const newRoom = roomMatch ? roomMatch[0].toUpperCase() : undefined;

  // Extract time changes e.g. "from 2 PM to 4 PM"
  const timeMatch = content.match(/to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const newTime = timeMatch ? timeMatch[1].trim() : undefined;

  return {
    hasScheduleChange: true,
    newRoom,
    newTime,
    reason: 'Rescheduled per faculty / academic notification',
  };
}

export function classifyEmailUrgency(subject: string, body: string): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
  const text = `${subject} ${body}`.toLowerCase();
  if (text.includes('urgent') || text.includes('emergency') || text.includes('cancelled') || text.includes('exam tomorrow')) {
    return 'CRITICAL';
  }
  if (text.includes('deadline') || text.includes('assignment due') || text.includes('schedule change') || text.includes('important')) {
    return 'HIGH';
  }
  if (text.includes('reminder') || text.includes('lecture') || text.includes('notice')) {
    return 'NORMAL';
  }
  return 'LOW';
}
