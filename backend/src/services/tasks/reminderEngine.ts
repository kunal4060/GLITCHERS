import type { Task, QuietHours } from '@glitchers/shared';

export interface ScheduledReminder {
  reminderTime: Date;
  offsetLabel: string;
}

export function generateReminderTimes(task: Task, referenceTime: Date = new Date()): ScheduledReminder[] {
  if (!task.dueDate) return [];
  const due = new Date(task.dueDate);
  if (due.getTime() <= referenceTime.getTime()) return [];

  // Minutes offsets before deadline
  let minuteOffsets: { offset: number; label: string }[] = [];

  switch (task.priority) {
    case 'EXTREMELY_IMPORTANT':
      minuteOffsets = [
        { offset: 7 * 24 * 60, label: '7 days before' },
        { offset: 3 * 24 * 60, label: '3 days before' },
        { offset: 24 * 60, label: '1 day before' },
        { offset: 3 * 60, label: '3 hours before' },
        { offset: 30, label: '30 minutes before' },
      ];
      break;
    case 'HIGH':
      minuteOffsets = [
        { offset: 2 * 24 * 60, label: '2 days before' },
        { offset: 24 * 60, label: '1 day before' },
        { offset: 2 * 60, label: '2 hours before' },
      ];
      break;
    case 'NORMAL':
      minuteOffsets = [
        { offset: 24 * 60, label: '1 day before' },
        { offset: 60, label: '1 hour before' },
      ];
      break;
    case 'LOW':
    default:
      minuteOffsets = [{ offset: 30, label: '30 minutes before' }];
      break;
  }

  const reminders: ScheduledReminder[] = [];

  for (const item of minuteOffsets) {
    const reminderDate = new Date(due.getTime() - item.offset * 60 * 1000);
    if (reminderDate.getTime() > referenceTime.getTime()) {
      reminders.push({
        reminderTime: reminderDate,
        offsetLabel: item.label,
      });
    }
  }

  return reminders;
}

export function isInQuietHours(date: Date, quietHours: QuietHours): boolean {
  if (!quietHours.enabled) return false;

  const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
  const [endHour, endMin] = quietHours.endTime.split(':').map(Number);

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight quiet hours (e.g. 23:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}
