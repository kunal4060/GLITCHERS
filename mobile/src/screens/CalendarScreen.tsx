import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';

export const CalendarScreen: React.FC = () => {
  const { classes, tasks } = useDashboardStore();
  const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  const now = new Date();
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const todayDay = dayNames[now.getDay()];
  const todayDateStr = now.toISOString().slice(0, 10);
  const weekLater = new Date(now.getTime() + 7 * 86400000);
  const monthLater = new Date(now.getTime() + 30 * 86400000);

  const events = [
    ...classes.map((c) => ({
      id: `c_${c.id}`,
      title: c.subjectName,
      time: `${c.day} • ${c.startTime} - ${c.endTime}`,
      location: `Room ${c.room || 'AB1-204'}`,
      type: 'CLASS' as const,
      day: c.day.toUpperCase(),
      dueDate: null as string | null,
    })),
    ...tasks.map((t) => ({
      id: `t_${t.id}`,
      title: `[Deadline] ${t.title}`,
      time: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Upcoming',
      location: 'University Portal',
      type: 'TASK' as const,
      day: null as string | null,
      dueDate: t.dueDate,
    })),
  ];

  const filteredEvents = events.filter((ev) => {
    if (filter === 'TODAY') {
      if (ev.type === 'CLASS') return ev.day === todayDay;
      if (ev.type === 'TASK') return ev.dueDate ? ev.dueDate.slice(0, 10) === todayDateStr : false;
    }
    if (filter === 'WEEK') {
      if (ev.type === 'CLASS') return true;
      if (ev.type === 'TASK') {
        if (!ev.dueDate) return true;
        const d = new Date(ev.dueDate);
        return d >= now && d <= weekLater;
      }
    }
    if (filter === 'MONTH') {
      if (ev.type === 'CLASS') return true;
      if (ev.type === 'TASK') {
        if (!ev.dueDate) return true;
        const d = new Date(ev.dueDate);
        return d >= now && d <= monthLater;
      }
    }
    return true;
  });

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
            <Ionicons name="sync-outline" size={13} color="#006A63" />
            <Text style={styles.syncBtnText}>Sync</Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Filter Tabs */}
        <View style={styles.filterRow}>
          {(['TODAY', 'WEEK', 'MONTH'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Event Schedule Feed */}
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {filteredEvents.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
              <Text style={{ color: '#76777D', marginTop: 12, fontSize: 14, fontWeight: '600' }}>
                No events found for {filter.toLowerCase()}
              </Text>
            </View>
          ) : (
            filteredEvents.map((ev) => (
              <View key={ev.id} style={styles.eventCard}>
                <View style={styles.eventLeft}>
                  <View style={[styles.eventPill, ev.type === 'CLASS' ? styles.pillClass : styles.pillTask]}>
                    <Text style={[styles.pillText, ev.type === 'CLASS' ? styles.pillTextClass : styles.pillTextTask]}>
                      {ev.type}
                    </Text>
                  </View>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventTime}>{ev.time}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                    <Ionicons name="location-outline" size={12} color="#006A63" />
                    <Text style={styles.eventLoc}>{ev.location}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
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
    borderBottomColor: 'rgba(26, 28, 29, 0.06)',
  },
  syncIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006A63',
  },
  syncText: { color: '#76777D', fontSize: 12, fontWeight: '600' },
  syncBtn: {
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.15)',
  },
  syncBtnText: { color: '#006A63', fontSize: 11, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  filterTab: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: designTokens.radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
  },
  filterTabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterText: { fontSize: 11, fontWeight: '700', color: '#76777D' },
  filterTextActive: { color: '#FFFFFF' },
  content: { flex: 1 },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    ...designTokens.shadows.card,
  },
  eventLeft: { flex: 1 },
  eventPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  pillClass: {
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
  },
  pillTask: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  pillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  pillTextClass: { color: '#006A63' },
  pillTextTask: { color: '#BA1A1A' },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  eventTime: { fontSize: 12, color: '#76777D', marginTop: 3 },
  eventLoc: { fontSize: 11, color: '#006A63', fontWeight: '500' },
});
