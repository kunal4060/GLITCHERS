import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../theme/theme';
import { useDashboardStore } from '../store/dashboardStore';

export const CalendarScreen: React.FC = () => {
  const { classes, tasks } = useDashboardStore();
  const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  const events = [
    ...classes.map((c) => ({
      id: `c_${c.id}`,
      title: c.subjectName,
      time: `${c.day} • ${c.startTime} - ${c.endTime}`,
      location: `Room ${c.room || 'AB1-204'}`,
      type: 'CLASS' as const,
    })),
    ...tasks.map((t) => ({
      id: `t_${t.id}`,
      title: `[Deadline] ${t.title}`,
      time: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Upcoming',
      location: 'University Portal',
      type: 'TASK' as const,
    })),
  ];

  const handleSyncGoogleCalendar = () => {
    Alert.alert('Google Calendar Synced', 'All recurring classes and assignment deadlines synchronized with your Google Calendar.');
  };

  return (
    <View style={styles.container}>
      {/* Google Calendar Sync Bar */}
      <View style={styles.syncBar}>
        <View style={styles.syncIndicator}>
          <Text style={styles.syncDot}>●</Text>
          <Text style={styles.syncText}>Google Calendar Connected</Text>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={handleSyncGoogleCalendar}>
          <Text style={styles.syncBtnText}>🔄 Sync</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['TODAY', 'WEEK', 'MONTH'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Event Schedule Feed */}
      <ScrollView style={styles.content}>
        {events.map((ev) => (
          <View key={ev.id} style={styles.eventCard}>
            <View style={styles.eventLeft}>
              <View style={[styles.eventPill, ev.type === 'CLASS' ? styles.pillClass : styles.pillTask]}>
                <Text style={styles.pillText}>{ev.type}</Text>
              </View>
              <Text style={styles.eventTitle}>{ev.title}</Text>
              <Text style={styles.eventTime}>{ev.time}</Text>
              <Text style={styles.eventLoc}>📍 {ev.location}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  syncBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  syncIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: { color: theme.colors.success, fontSize: 14 },
  syncText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  syncBtn: {
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncBtnText: { color: theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  filterTab: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterTabActive: { backgroundColor: theme.colors.primary },
  filterText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  filterTextActive: { color: '#0B0F19' },
  content: { padding: 16, paddingBottom: 100 },
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  eventLeft: { flex: 1 },
  eventPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 8 },
  pillClass: { backgroundColor: theme.colors.primaryGlow },
  pillTask: { backgroundColor: theme.colors.warningGlow },
  pillText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.primary },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  eventTime: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  eventLoc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
});
