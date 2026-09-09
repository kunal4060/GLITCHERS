import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { StatusBadge } from '../components/common/StatusBadge';
import { useDashboardStore } from '../store/dashboardStore';
import { getNextUpcomingClass } from '../utils/timetableTimeUtils';

export const NotificationsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { classes, tasks, emails, dismissedNoticeIds } = useDashboardStore();
  const now = new Date();

  // Dynamic notification generation
  const dynamicNotifs: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
    targetScreen?: string;
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
      targetScreen: 'Timetable',
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
        targetScreen: 'Tasks',
      });
    });

  // 3. Important University notices (only active, unticked notices)
  emails
    .filter((e) => !e.isDismissed && !dismissedNoticeIds.includes(e.id))
    .filter((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH')
    .slice(0, 2)
    .forEach((e) => {
      dynamicNotifs.push({
        id: 'email-' + e.id,
        title: e.subject,
        message: e.summary,
        time: 'University Notice',
        priority: e.importance === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        targetScreen: 'Email',
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
      targetScreen: 'Timetable',
    });
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Top Header */}
          <View style={styles.topHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={styles.topHeaderDot} />
              <Text style={styles.topHeaderTag}>ACADEMIC DISPATCH</Text>
            </View>
            <Text style={styles.screenTitle}>Notifications</Text>
            <Text style={styles.screenSub}>Real-time campus radar & lecture schedule alerts</Text>
          </View>

          <View style={styles.quietHoursCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="moon" size={14} color="#006A63" />
              <Text style={styles.quietHoursTitle}>Quiet Hours Active (11:00 PM – 7:00 AM)</Text>
            </View>
            <Text style={styles.quietHoursSub}>Non-urgent notifications are muted during study & sleep hours.</Text>
          </View>

          <Text style={styles.header}>LIVE NOTIFICATIONS</Text>

          {dynamicNotifs.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.notifCard}
              activeOpacity={0.82}
              onPress={() => {
                if (n.targetScreen && navigation) {
                  if (n.targetScreen === 'Timetable' || n.targetScreen === 'Tasks') {
                    navigation.navigate('MainTabs', { screen: n.targetScreen });
                  } else {
                    navigation.navigate(n.targetScreen);
                  }
                }
              }}
            >
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
  topHeader: { marginBottom: 16 },
  topHeaderDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#006A63' },
  topHeaderTag: { fontSize: 10, fontWeight: '800', color: '#76777D', letterSpacing: 0.8 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  screenSub: { fontSize: 12, color: '#76777D', marginTop: 3 },
  quietHoursCard: {
    backgroundColor: 'rgba(0, 106, 99, 0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.12)',
  },
  quietHoursTitle: { fontSize: 12.5, fontWeight: '700', color: '#006A63' },
  quietHoursSub: { fontSize: 11.5, color: '#4B5563', marginTop: 2 },
  header: {
    fontSize: 10,
    fontWeight: '800',
    color: '#76777D',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    ...designTokens.shadows.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  time: { fontSize: 11, color: '#76777D', marginLeft: 8 },
  message: { fontSize: 12, color: '#4B5563', marginTop: 4, lineHeight: 17 },
});
