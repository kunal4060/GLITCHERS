import { generateReminderTimes, isInQuietHours } from '../src/services/tasks/reminderEngine.js';
import type { Task, QuietHours } from '@glitchers/shared';

describe('Smart Reminder Engine & Quiet Hours', () => {
  test('generates staggered reminders for EXTREMELY_IMPORTANT priority', () => {
    const referenceTime = new Date('2026-09-01T10:00:00Z');
    const dueTime = new Date('2026-09-10T10:00:00Z'); // 9 days ahead

    const task: Task = {
      id: 't1',
      userId: 'u1',
      title: 'AI Final Assignment',
      priority: 'EXTREMELY_IMPORTANT',
      status: 'TODO',
      dueDate: dueTime.toISOString(),
    };

    const reminders = generateReminderTimes(task, referenceTime);
    expect(reminders.length).toBe(5); // 7d, 3d, 1d, 3h, 30m
    expect(reminders[0].offsetLabel).toBe('7 days before');
    expect(reminders[4].offsetLabel).toBe('30 minutes before');
  });

  test('quiet hours correctly identifies overnight range', () => {
    const quietConfig: QuietHours = {
      enabled: true,
      startTime: '23:00',
      endTime: '07:00',
      criticalBypass: true,
    };

    // 02:30 AM should be in quiet hours
    const midnightDate = new Date();
    midnightDate.setHours(2, 30, 0, 0);
    expect(isInQuietHours(midnightDate, quietConfig)).toBe(true);

    // 14:00 (2 PM) should NOT be in quiet hours
    const afternoonDate = new Date();
    afternoonDate.setHours(14, 0, 0, 0);
    expect(isInQuietHours(afternoonDate, quietConfig)).toBe(false);

    // Disabled quiet hours returns false
    expect(isInQuietHours(midnightDate, { ...quietConfig, enabled: false })).toBe(false);
  });
});
