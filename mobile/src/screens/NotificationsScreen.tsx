import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { StatusBadge } from '../components/common/StatusBadge';

export const NotificationsScreen: React.FC = () => {
  const notifications = [
    {
      id: '1',
      title: 'DBMS starts in 15 minutes',
      message: 'Room AB1-204 with Dr. Sharma.',
      time: 'Just now',
      priority: 'NORMAL' as const,
    },
    {
      id: '2',
      title: 'AI Assignment 2 Due in 2 Days',
      message: 'A* algorithm submission on university portal.',
      time: '2 hours ago',
      priority: 'HIGH' as const,
    },
    {
      id: '3',
      title: 'Midterm Schedule Announcement',
      message: 'Faculty published exam hall seating arrangement.',
      time: 'Yesterday',
      priority: 'CRITICAL' as const,
    },
  ];

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.quietHoursCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="moon-outline" size={14} color={designTokens.colors.primaryDeep} />
            <Text style={styles.quietHoursTitle}>Quiet Hours Active (11:00 PM – 7:00 AM)</Text>
          </View>
          <Text style={styles.quietHoursSub}>Non-urgent notifications are muted during study & sleep hours.</Text>
        </View>

        <Text style={styles.header}>RECENT NOTIFICATIONS</Text>

        {notifications.map((n) => (
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
                <StatusBadge label="NORMAL" variant="safe" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
