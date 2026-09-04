import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { StatusBadge } from '../components/common/StatusBadge';
import { useDashboardStore } from '../store/dashboardStore';
import { getNextUpcomingClass } from '../utils/timetableTimeUtils';

export const NotificationsScreen: React.FC = () => {
  const { classes, tasks, emails } = useDashboardStore();
  const now = new Date();

  // Dynamic notification generation
  const dynamicNotifs: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  }> = [];

  // 1. Next / Ongoing class notification
  const nextClassInfo = getNextUpcomingClass(classes, now);
  if (nextClassInfo.nextClass) {
    const c = nextClassInfo.nextClass;
    dynamicNotifs.push({
      id: 'class-' + c.id,
      title: `${c.subjectName} • ${nextClassInfo.statusLabel}`,
      message: `Room ${c.room || 'AB1-204'} • ${c.faculty || 'Faculty'} (${c.startTime} - ${c.endTime})`,
      time: nextClassInfo.isOngoing ? 'Right now' : 'Upcoming',
      priority: nextClassInfo.isOngoing ? 'HIGH' : 'NORMAL',
    });
  }

  // 2. Urgent / High priority tasks
  const pendingTasks = tasks.filter((t) => t.status === 'TODO');
  pendingTasks
    .filter((t) => t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH')
    .slice(0, 3)
    .forEach((t) => {
      dynamicNotifs.push({
        id: 'task-' + t.id,
        title: `${t.title} (Action Required)`,
        message: `Priority: ${t.priority.replace('_', ' ')} • Tap to manage in Tasks`,
        time: 'Pending',
        priority: t.priority === 'EXTREMELY_IMPORTANT' ? 'CRITICAL' : 'HIGH',
      });
    });

  // 3. Important University notices
  emails
    .filter((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH')
    .slice(0, 2)
    .forEach((e) => {
      dynamicNotifs.push({
        id: 'email-' + e.id,
        title: e.subject,
        message: e.summary,
        time: 'University Notice',
        priority: e.importance === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      });
    });

  // Fallback if user has cleared everything
  if (dynamicNotifs.length === 0) {
    dynamicNotifs.push({
      id: 'all-clear',
      title: 'Academic Schedule Clear',
      message: 'No immediate upcoming classes or urgent task deadlines. Keep up the great work!',
      time: 'Just now',
      priority: 'NORMAL',
    });
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.quietHoursCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="moon-outline" size={14} color={designTokens.colors.primaryDeep} />
              <Text style={styles.quietHoursTitle}>Quiet Hours Active (11:00 PM – 7:00 AM)</Text>
            </View>
            <Text style={styles.quietHoursSub}>Non-urgent notifications are muted during study & sleep hours.</Text>
          </View>

          <Text style={styles.header}>LIVE NOTIFICATIONS</Text>

          {dynamicNotifs.map((n) => (
            <TouchableOpacity key={n.id} style={styles.notifCard} activeOpacity={0.82}>
              <View style={styles.row}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
              <Text style={styles.message}>{n.message}</Text>
              <View style={{ marginTop: 8 }}>
                {n.priority === 'CRITICAL' ? (
                  <StatusBadge label="CRITICAL" variant="extremely_important" />
                ) : n.priority === 'HIGH' ? (
                  <StatusBadge label="HIGH" variant="high" />
                ) : (
                  <StatusBadge label="ACTIVE" variant="safe" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: designTokens.spacing.lg, paddingBottom: 100 },
  quietHoursCard: {
    backgroundColor: '#D8E8E7',
    borderRadius: designTokens.radii.card,
    padding: 16,
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(117, 167, 165, 0.20)',
    ...designTokens.shadows.card,
  },
  quietHoursTitle: { fontSize: 13, fontWeight: '700', color: designTokens.colors.textPrimary },
  quietHoursSub: { fontSize: 12, color: designTokens.colors.textSecondary },
  header: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    ...designTokens.shadows.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: designTokens.colors.textPrimary, flex: 1 },
  time: { fontSize: 11, color: designTokens.colors.textMuted, marginLeft: 8 },
  message: { fontSize: 12, color: designTokens.colors.textSecondary, marginTop: 4, lineHeight: 17 },
});
