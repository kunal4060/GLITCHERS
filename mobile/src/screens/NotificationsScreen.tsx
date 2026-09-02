import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export const NotificationsScreen: React.FC = () => {
  const notifications = [
    {
      id: '1',
      title: 'DBMS starts in 15 minutes',
      message: 'Room AB1-204 with Dr. Sharma.',
      time: 'Just now',
      priority: 'NORMAL',
    },
    {
      id: '2',
      title: 'AI Assignment 2 Due in 2 Days',
      message: 'A* algorithm submission on university portal.',
      time: '2 hours ago',
      priority: 'HIGH',
    },
    {
      id: '3',
      title: 'Midterm Schedule Announcement',
      message: 'Faculty published exam hall seating arrangement.',
      time: 'Yesterday',
      priority: 'CRITICAL',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.quietHoursCard}>
        <Text style={styles.quietHoursTitle}>🌙 Quiet Hours Active (11:00 PM – 7:00 AM)</Text>
        <Text style={styles.quietHoursSub}>Non-urgent notifications are muted during study & sleep hours.</Text>
      </View>

      <Text style={styles.header}>RECENT NOTIFICATIONS</Text>

      {notifications.map((n) => (
        <TouchableOpacity key={n.id} style={styles.notifCard}>
          <View style={styles.row}>
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.time}>{n.time}</Text>
          </View>
          <Text style={styles.message}>{n.message}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{n.priority}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16, paddingBottom: 100 },
  quietHoursCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  quietHoursTitle: { fontSize: 13, fontWeight: 'bold', color: '#38BDF8' },
  quietHoursSub: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  header: { fontSize: 11, fontWeight: 'bold', color: '#64748B', letterSpacing: 1, marginBottom: 12 },
  notifCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: 'bold', color: '#F8FAFC', flex: 1 },
  time: { fontSize: 11, color: '#64748B', marginLeft: 8 },
  message: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 8,
  },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#38BDF8' },
});
