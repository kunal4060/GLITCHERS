import { extractClassesFromText } from '../src/services/timetable/timetableExtractor.js';

describe('Intelligent Timetable Text and OCR Extractor', () => {
  test('extracts classes from plain schedule text', () => {
    const raw = `
      Monday:
      10:00 - 11:00 AM Database Management Systems Lecture Room AB1-204 Dr. Sharma
      02:00 - 04:00 PM Operating Systems Lab Room AB2-301 Prof. Verma
      Tuesday:
      11:30 - 12:30 PM Artificial Intelligence Lecture Room AB1-102
    `;

    const classes = extractClassesFromText(raw, 'u1');
    expect(classes.length).toBe(3);

    // Class 1: Monday DBMS
    expect(classes[0].day).toBe('MONDAY');
    expect(classes[0].startTime).toBe('10:00');
    expect(classes[0].endTime).toBe('11:00');
    expect(classes[0].classType).toBe('LECTURE');
    expect(classes[0].room).toBe('AB1-204');

    // Class 2: Monday OS Lab
    expect(classes[1].day).toBe('MONDAY');
    expect(classes[1].startTime).toBe('14:00');
    expect(classes[1].endTime).toBe('16:00');
    expect(classes[1].classType).toBe('LAB');
    expect(classes[1].room).toBe('AB2-301');

    // Class 3: Tuesday AI
    expect(classes[2].day).toBe('TUESDAY');
    expect(classes[2].startTime).toBe('11:30');
    expect(classes[2].endTime).toBe('12:30');
    expect(classes[2].classType).toBe('LECTURE');
  });

  test('handles 12-hour and 24-hour time formats seamlessly', () => {
    const raw = 'Friday: 14:00 - 15:30 Computer Networks Room AB1-101';
    const classes = extractClassesFromText(raw, 'u1');
    expect(classes.length).toBe(1);
    expect(classes[0].day).toBe('FRIDAY');
    expect(classes[0].startTime).toBe('14:00');
    expect(classes[0].endTime).toBe('15:30');
  });
});
