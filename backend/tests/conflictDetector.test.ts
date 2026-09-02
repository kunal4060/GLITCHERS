import { detectScheduleConflicts } from '../src/services/timetable/conflictDetector.js';
import type { ClassSession } from '@glitchers/shared';

describe('Timetable Conflict Detector', () => {
  test('detects overlapping classes on the same day', () => {
    const classes: ClassSession[] = [
      {
        id: 'c1',
        userId: 'u1',
        subjectName: 'DBMS',
        day: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        classType: 'LECTURE',
        isCancelled: false,
      },
      {
        id: 'c2',
        userId: 'u1',
        subjectName: 'AI',
        day: 'MONDAY',
        startTime: '10:30',
        endTime: '11:30',
        classType: 'LECTURE',
        isCancelled: false,
      },
    ];

    const conflicts = detectScheduleConflicts(classes);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('OVERLAP');
    expect(conflicts[0].description).toContain('overlaps with');
  });

  test('detects exact duplicate classes', () => {
    const classes: ClassSession[] = [
      {
        id: 'c1',
        userId: 'u1',
        subjectName: 'DBMS',
        day: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        classType: 'LECTURE',
        isCancelled: false,
      },
      {
        id: 'c2',
        userId: 'u1',
        subjectName: 'DBMS',
        day: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        classType: 'LECTURE',
        isCancelled: false,
      },
    ];

    const conflicts = detectScheduleConflicts(classes);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('DUPLICATE');
  });

  test('detects invalid time order (start >= end)', () => {
    const classes: ClassSession[] = [
      {
        id: 'c1',
        userId: 'u1',
        subjectName: 'OS Lab',
        day: 'FRIDAY',
        startTime: '14:00',
        endTime: '12:00', // Invalid
        classType: 'LAB',
        isCancelled: false,
      },
    ];

    const conflicts = detectScheduleConflicts(classes);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('INVALID_TIME');
  });

  test('no conflict for non-overlapping classes on same or different days', () => {
    const classes: ClassSession[] = [
      {
        id: 'c1',
        userId: 'u1',
        subjectName: 'DBMS',
        day: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        classType: 'LECTURE',
        isCancelled: false,
      },
      {
        id: 'c2',
        userId: 'u1',
        subjectName: 'OS',
        day: 'MONDAY',
        startTime: '11:00',
        endTime: '12:00',
        classType: 'LECTURE',
        isCancelled: false,
      },
      {
        id: 'c3',
        userId: 'u1',
        subjectName: 'AI',
        day: 'TUESDAY',
        startTime: '10:00',
        endTime: '11:00',
        classType: 'LECTURE',
        isCancelled: false,
      },
    ];

    const conflicts = detectScheduleConflicts(classes);
    expect(conflicts.length).toBe(0);
  });
});
