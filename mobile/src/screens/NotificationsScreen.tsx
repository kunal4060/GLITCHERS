import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore } from '../store/dashboardStore';
import { getNextUpcomingClass } from '../utils/timetableTimeUtils';
import { NiaHeader, LabelCaps, StatusPill, NiaCard } from '../components/nia';

const C = designTokens.colors;

type Priority = 'CRITICAL' | 'HIGH' | 'NORMAL';

interface DynNotif {
  id: string;
  title: string;
  message: string;
  time: string;
  priority: Priority;
}

/** Quiet hours = 11 PM – 7 AM local. */
function isQuietNow(d: Date = new Date()): boolean {
  const h = d.getHours();
  return h >= 23 || h < 7;
}

export const NotificationsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { classes, tasks, emails, dismissedNoticeIds, quietHours, setQuietHours } = useDashboardStore();
  const now = new Date();
  const quietActive = quietHours && isQuietNow(now);

  const dynamicNotifs: DynNotif[] = [];

  // 1. Next / ongoing class
  const nextClassInfo = getNextUpcomingClass(classes, now);
  if (nextClassInfo.nextClass) {
    const c = nextClassInfo.nextClass;
    dynamicNotifs.push({
      id: 'class-' + c.id,
      title: `${c.subjectName} • ${nextClassInfo.statusLabel}`,
      message: `Room ${c.room || '—'} • ${c.faculty || 'Faculty'} (${c.startTime ? c.startTime.slice(0, 5) : '—'} – ${c.endTime ? c.endTime.slice(0, 5) : '—'})`,
      time: nextClassInfo.isOngoing ? 'Right now' : 'Upcoming',
      priority: nextClassInfo.isOngoing ? 'HIGH' : 'NORMAL',
    });
  }

  // 2. Urgent tasks
  tasks
    .filter((t) => t.status === 'TODO')
    .filter((t) => t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH')
    .slice(0, 3)
    .forEach((t) => {
      dynamicNotifs.push({
        id: 'task-' + t.id,
        title: `${t.title} (Action Required)`,
        message: `Priority: ${String(t.priority).replace('_', ' ')} • Tap to manage in Tasks`,
        time: 'Pending',
        priority: t.priority === 'EXTREMELY_IMPORTANT' ? 'CRITICAL' : 'HIGH',
      });
    });

  // 3. Important university notices
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
      });
    });

  // Quiet hours: mute NORMAL priority, keep CRITICAL + HIGH
  const mutedCount = quietActive ? dynamicNotifs.filter((n) => n.priority === 'NORMAL').length : 0;
  const visibleNotifs = quietActive ? dynamicNotifs.filter((n) => n.priority !== 'NORMAL') : dynamicNotifs;

  const shown: DynNotif[] =
    visibleNotifs.length > 0
      ? visibleNotifs
      : [
          {
            id: 'all-clear',
            title: 'All Clear',
            message: quietActive
              ? `${mutedCount} routine ${mutedCount === 1 ? 'notice is' : 'notices are'} being held until 7 AM. Critical alerts still come through.`
              : 'No immediate classes or urgent deadlines. Keep up the great work!',
            time: 'Just now',
            priority: 'NORMAL' as Priority,
          },
        ];

  const pillTone = (p: Priority): 'danger' | 'success' | 'neutral' =>
    p === 'CRITICAL' ? 'danger' : p === 'HIGH' ? 'success' : 'neutral';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <NiaHeader title="Notifications" navigation={navigation} />

          {/* Quiet hours card — live status */}
          <NiaCard style={[styles.quietCard, !quietHours && styles.quietCardOff]}>
            <View style={styles.quietRow}>
              <View style={styles.quietIcon}>
                <Ionicons name="moon-outline" size={16} color={quietHours ? C.eucalyptus : C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quietTitle}>
                  {quietHours
                    ? quietActive
                      ? 'Quiet Hours Active'
                      : 'Quiet Hours On (11 PM – 7 AM)'
                    : 'Quiet Hours Off'}
                </Text>
                <Text style={styles.quietSub}>
                  {quietHours
                    ? quietActive
                      ? `Muting ${mutedCount} routine ${mutedCount === 1 ? 'notice' : 'notices'} right now. Critical alerts still come through.`
                      : 'Non-critical notices are muted between 11 PM and 7 AM.'
                    : 'Notices arrive as usual, day and night.'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.quietToggle, quietHours && styles.quietToggleOn]}
                onPress={() => setQuietHours(!quietHours)}
                activeOpacity={0.8}
                accessibilityRole="switch"
                accessibilityLabel="Toggle quiet hours"
              >
                <Text style={[styles.quietToggleText, quietHours && styles.quietToggleTextOn]}>
                  {quietHours ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </NiaCard>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Live Notifications</Text>
            <LabelCaps>{shown.length} items</LabelCaps>
          </View>

          {shown.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.notifCard}
              activeOpacity={0.85}
              onPress={() => {
                if (n.id.startsWith('task-')) navigation?.navigate('MainTabs', { screen: 'Tasks' });
                else if (n.id.startsWith('email-')) navigation?.navigate('Email');
                else if (n.id.startsWith('class-')) navigation?.navigate('MainTabs', { screen: 'Timetable' });
              }}
            >
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={2}>{n.title}</Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
              <Text style={styles.message} numberOfLines={3}>{n.message}</Text>
              <View style={{ marginTop: 9 }}>
                <StatusPill label={n.priority === 'NORMAL' ? 'Active' : n.priority} tone={pillTone(n.priority)} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  content: { paddingBottom: 120 },
  quietCard: { marginHorizontal: 20, marginBottom: 18, backgroundColor: C.eucalyptusFaint, borderColor: '#A7F3D0' },
  quietCardOff: { backgroundColor: '#FFFFFF', borderColor: C.hairline },
  quietRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quietIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  quietTitle: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 2 },
  quietSub: { fontSize: 11.5, color: C.textSecondary, lineHeight: 16 },
  quietToggle: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  quietToggleOn: { backgroundColor: C.eucalyptus, borderColor: C.eucalyptus },
  quietToggleText: { fontSize: 11, fontWeight: '800', color: C.textSecondary, letterSpacing: 0.6 },
  quietToggleTextOn: { color: '#FFFFFF' },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  notifCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: C.hairline,
    padding: 15, marginHorizontal: 20, marginBottom: 10,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04,
    shadowRadius: 10, elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 14.5, fontWeight: '700', color: C.ink, flex: 1, lineHeight: 19 },
  time: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  message: { fontSize: 12.5, color: C.textSecondary, marginTop: 5, lineHeight: 18 },
});
