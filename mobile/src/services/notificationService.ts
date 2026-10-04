import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiClient } from '../api/client';
import { Platform } from 'react-native';
import type { Task, ClassSession } from '@glitchers/shared';

const CHANNEL_ID = 'glitchers-reminders';
// ponytail: falls back to the hardcoded id if expo-constants can't resolve it
// (e.g. unusual build configs). Keep the fallback in sync with app.json.
const EXPO_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ?? '144aea28-329c-49de-9961-5697f77236c1';
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
    if (existing === 'granted') {
      registerForPush().catch(() => null);
      return true;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') registerForPush().catch(() => null);
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Registers this device for push notifications: gets the Expo push token
 * and sends it to the backend so broadcasts can reach this device.
 */
export async function registerForPush(): Promise<void> {
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
  const token = data;
  if (token) {
    await apiClient.registerPushToken(token);
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
 * reminders that would fire between 11 PM – 7 AM are deferred to 7:00 AM
 * instead of being dropped.
 *
 * Build-then-swap: the full request list is computed first, then old
 * reminders are cancelled and the new ones scheduled — so a kill mid-loop
 * can't leave the user with zero reminders.
 */
export async function refreshReminders(
  classes: ClassSession[],
  tasks: Task[],
  quietHoursEnabled: boolean
): Promise<void> {
  const now = new Date();

  const isQuiet = (d: Date) =>
    quietHoursEnabled && (d.getHours() >= 23 || d.getHours() < 7);

  // Defer quiet-hours fire times to 07:00 (same day if before 23:00, else next day).
  const deferQuiet = (d: Date): Date => {
    if (!isQuiet(d)) return d;
    const out = new Date(d);
    out.setHours(7, 0, 0, 0);
    if (out.getTime() <= d.getTime()) out.setDate(out.getDate() + 1);
    return out;
  };

  type Req = {
    content: { title: string; body: string; data: Record<string, string> };
    fireAt: Date;
  };
  const requests: Req[] = [];

  // --- Class reminders: 10 minutes before each upcoming weekly occurrence ---
  for (const c of classes) {
    if (c.isCancelled || !c.startTime || !c.day) continue;
    const occ = nextClassOccurrence(c.day, c.startTime, now);
    if (!occ) continue;
    let fireAt = new Date(occ.getTime() - CLASS_REMINDER_MINUTES_BEFORE * 60_000);
    if (fireAt.getTime() <= now.getTime()) continue;
    fireAt = deferQuiet(fireAt);
    requests.push({
      content: {
        title: `📚 ${c.subjectName} in 10 min`,
        body: `${c.startTime.slice(0, 5)} • Room ${c.room || '—'}${c.faculty ? ` • ${c.faculty}` : ''}`,
        data: { kind: 'class', classId: c.id },
      },
      fireAt,
    });
  }

  // --- Task reminders: 1 hour before due date ---
  for (const t of tasks) {
    if (t.status !== 'TODO' && t.status !== 'IN_PROGRESS') continue;
    if (!t.dueDate) continue;
    const due = new Date(t.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    let fireAt = new Date(due.getTime() - TASK_REMINDER_MINUTES_BEFORE * 60_000);
    if (fireAt.getTime() <= now.getTime()) continue;
    fireAt = deferQuiet(fireAt);
    const urgent = t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH';
    requests.push({
      content: {
        title: `${urgent ? '⏰' : '📝'} Task due in 1 hour`,
        body: t.title,
        data: { kind: 'task', taskId: t.id },
      },
      fireAt,
    });
  }

  // Swap: cancel old only after the new list is fully computed.
  await cancelAllReminders();
  for (const r of requests) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: r.content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt },
      });
    } catch {
      /* keep scheduling the rest */
    }
  }
}
