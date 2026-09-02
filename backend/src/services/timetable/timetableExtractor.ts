import type { ClassSession, DayOfWeekType } from '@glitchers/shared';
import { randomUUID } from 'crypto';

interface ExtractedClass {
  subjectName: string;
  day: DayOfWeekType;
  startTime: string;
  endTime: string;
  room?: string;
  faculty?: string;
  classType: ClassSession['classType'];
}

const DAY_MAP: Record<string, DayOfWeekType> = {
  mon: 'MONDAY',
  monday: 'MONDAY',
  tue: 'TUESDAY',
  tues: 'TUESDAY',
  tuesday: 'TUESDAY',
  wed: 'WEDNESDAY',
  wednesday: 'WEDNESDAY',
  thu: 'THURSDAY',
  thur: 'THURSDAY',
  thursday: 'THURSDAY',
  fri: 'FRIDAY',
  friday: 'FRIDAY',
  sat: 'SATURDAY',
  saturday: 'SATURDAY',
  sun: 'SUNDAY',
  sunday: 'SUNDAY',
};

/**
 * Intelligent parser that extracts structured class sessions from raw student text,
 * OCR scan output, syllabus lines, or timetable tables.
 */
export function extractClassesFromText(rawText: string, userId = 'u1'): ClassSession[] {
  const extracted: ClassSession[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentDay: DayOfWeekType = 'MONDAY';

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Check if line represents a day header
    for (const [key, dayVal] of Object.entries(DAY_MAP)) {
      if (lower === key || lower.startsWith(`${key}:`) || lower.startsWith(`${key} -`)) {
        currentDay = dayVal;
        break;
      }
    }

    // Time pattern match (e.g. "10:00 - 11:00" or "10:00AM - 11:00AM" or "10-11")
    const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
    const timeMatch = line.match(timeRegex);

    if (timeMatch) {
      const matchEndHasPM = timeMatch[2].toLowerCase().includes('pm');
      let startTime = normalizeTime(timeMatch[1], matchEndHasPM);
      let endTime = normalizeTime(timeMatch[2]);

      // Class Type
      let classType: ClassSession['classType'] = 'LECTURE';
      if (lower.includes('lab') || lower.includes('practical')) {
        classType = 'LAB';
      } else if (lower.includes('tutorial') || lower.includes('tut')) {
        classType = 'TUTORIAL';
      }

      // Room extraction (e.g. "Room AB1-204" or "Hall 3" or "Lab 2")
      const roomMatch =
        line.match(/(?:room|hall|block)\s*[:#-]?\s*([a-z0-9-]+)/i) ||
        line.match(/\b([a-z0-9]+-[0-9]+[a-z0-9-]*)\b/i) ||
        line.match(/lab\s*[:#-]?\s*([0-9]+[a-z0-9-]*)/i);
      const room = roomMatch ? roomMatch[1].toUpperCase() : 'AB1-204';

      // Faculty extraction (e.g. "Dr. Sharma" or "Prof. Verma")
      const facultyMatch = line.match(/(?:dr\.|prof\.|mr\.|ms\.)\s*[a-z]+/i);
      const faculty = facultyMatch ? facultyMatch[0] : 'Department Faculty';

      // Subject extraction: clean line of time, room, faculty
      let subjectName = line
        .replace(timeRegex, '')
        .replace(/(?:room|hall|lab|block)\s*[:#-]?\s*[a-z0-9-]+/gi, '')
        .replace(/(?:dr\.|prof\.|mr\.|ms\.)\s*[a-z]+/gi, '')
        .replace(/lecture|lab|tutorial/gi, '')
        .replace(/[•\-,:;|]/g, ' ')
        .trim();

      if (!subjectName || subjectName.length < 2) {
        subjectName = 'Core Academic Subject';
      }

      extracted.push({
        id: randomUUID(),
        userId,
        subjectName,
        day: currentDay,
        startTime,
        endTime,
        room,
        faculty,
        classType,
        isCancelled: false,
      });
    }
  }

  return extracted;
}

function normalizeTime(t: string, inheritedPM = false): string {
  t = t.trim().toLowerCase();
  const isExplicitPM = t.includes('pm');
  const isExplicitAM = t.includes('am');
  const digits = t.replace(/[^\d:]/g, '');

  let [hStr, mStr] = digits.split(':');
  let h = parseInt(hStr, 10);
  let m = mStr ? parseInt(mStr, 10) : 0;

  if (isExplicitPM) {
    if (h < 12) h += 12;
  } else if (!isExplicitAM && inheritedPM) {
    if (h < 8) h += 12;
  }

  if (isExplicitAM && h === 12) h = 0;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
