import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
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
    <GradientBackground>
      <View style={styles.container}>
        {/* Google Calendar Sync Bar */}
        <View style={styles.syncBar}>
          <View style={styles.syncIndicator}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Google Calendar Connected</Text>
          </View>
          <TouchableOpacity style={styles.syncBtn} onPress={handleSyncGoogleCalendar} activeOpacity={0.82}>
            <Ionicons name="sync-outline" size={13} color={designTokens.colors.primaryDeep} />
            <Text style={styles.syncBtnText}>Sync</Text>
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
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {events.map((ev) => (
            <View key={ev.id} style={styles.eventCard}>
              <View style={styles.eventLeft}>
                <View style={[styles.eventPill, ev.type === 'CLASS' ? styles.pillClass : styles.pillTask]}>
                  <Text style={[styles.pillText, ev.type === 'CLASS' ? styles.pillTextClass : styles.pillTextTask]}>
                    {ev.type}
                  </Text>
                </View>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                <Text style={styles.eventTime}>{ev.time}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={12} color={designTokens.colors.primaryDark} />
                  <Text style={styles.eventLoc}>{ev.location}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  syncBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(41, 51, 50, 0.06)',
  },
  syncIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: designTokens.colors.primary,
  },
  syncText: { color: designTokens.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  syncBtn: {
    backgroundColor: designTokens.colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
  },
  syncBtnText: { color: designTokens.colors.primaryDeep, fontSize: 12, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  filterTab: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    paddingVertical: 8,
    borderRadius: designTokens.radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  filterTabActive: {
    backgroundColor: designTokens.colors.primaryPill,
    borderColor: designTokens.colors.primary,
  },
  filterText: { fontSize: 11, fontWeight: '700', color: designTokens.colors.textSecondary },
  filterTextActive: { color: designTokens.colors.textPrimary },
  content: { flex: 1 },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    ...designTokens.shadows.card,
  },
  eventLeft: { flex: 1 },
  eventPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: designTokens.radii.pill,
    marginBottom: 6,
  },
  pillClass: {
    backgroundColor: designTokens.colors.primarySoft,
  },
  pillTask: {
    backgroundColor: designTokens.colors.accentPeachCard,
  },
  pillText: { fontSize: 9, fontWeight: '800' },
  pillTextClass: { color: designTokens.colors.primaryDeep },
  pillTextTask: { color: designTokens.colors.accentPeachDeep },
  eventTitle: { fontSize: 15, fontWeight: '700', color: designTokens.colors.textPrimary, marginBottom: 3 },
  eventTime: { fontSize: 12, color: designTokens.colors.textSecondary, marginBottom: 2 },
  eventLoc: { fontSize: 12, color: designTokens.colors.textSecondary },
});
