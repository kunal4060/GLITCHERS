import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Task, ClassSession } from '@glitchers/shared';

const CHANNEL_ID = 'glitchers-reminders';
const CLASS_REMINDER_MINUTES_BEFORE = 10;
const TASK_REMINDER_MINUTES_BEFORE = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DAY_INDEX: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

/** Next Date when a weekly class occurs (skips occurrences that already passed today). */
function nextClassOccurrence(day: string, startTime: string, now: Date): Date | null {
  const targetDay = DAY_INDEX[day];
  if (targetDay === undefined) return null;
  const [hh, mm] = startTime.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date(now);
  const delta = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  return d;
}

export async function initNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Class & Task Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* not fatal */
  }
}

/**
 * Rebuilds every class + task reminder from current data.
 * Call after classes/tasks load or change. Honours quiet hours:
 * reminders that would fire between 11 PM – 7 AM are skipped.
 */
export async function refreshReminders(
  classes: ClassSession[],
  tasks: Task[],
  quietHoursEnabled: boolean
): Promise<void> {
  const now = new Date();
  await cancelAllReminders();

  const isQuiet = (d: Date) =>
    quietHoursEnabled && (d.getHours() >= 23 || d.getHours() < 7);

  // --- Class reminders: 10 minutes before each upcoming weekly occurrence ---
  for (const c of classes) {
    if (c.isCancelled || !c.startTime || !c.day) continue;
    const occ = nextClassOccurrence(c.day, c.startTime, now);
    if (!occ) continue;
    const fireAt = new Date(occ.getTime() - CLASS_REMINDER_MINUTES_BEFORE * 60_000);
    if (fireAt.getTime() <= now.getTime() || isQuiet(fireAt)) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📚 ${c.subjectName} in 10 min`,
          body: `${c.startTime.slice(0, 5)} • Room ${c.room || '—'}${c.faculty ? ` • ${c.faculty}` : ''}`,
          data: { kind: 'class', classId: c.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
    } catch {
      /* keep scheduling the rest */
    }
  }

  // --- Task reminders: 1 hour before due date ---
  for (const t of tasks) {
    if (t.status !== 'TODO' && t.status !== 'IN_PROGRESS') continue;
    if (!t.dueDate) continue;
    const due = new Date(t.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    const fireAt = new Date(due.getTime() - TASK_REMINDER_MINUTES_BEFORE * 60_000);
    if (fireAt.getTime() <= now.getTime() || isQuiet(fireAt)) continue;
    const urgent = t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH';
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${urgent ? '⏰' : '📝'} Task due in 1 hour`,
          body: t.title,
          data: { kind: 'task', taskId: t.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
    } catch {
      /* keep scheduling the rest */
    }
  }
}
