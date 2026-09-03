import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NinjaAvatar } from '../components/NinjaAvatar';
import { useDashboardStore } from '../store/dashboardStore';

export const DashboardScreen = ({ navigation }: { navigation?: any }) => {
  const { syncWithBackend, expenses, budget } = useDashboardStore();

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = budget ? Math.max(0, budget.monthlyLimit - totalSpent) : 3680;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Bar: Ninja Avatar & Weather Pill */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.navigate('Account')}>
          <NinjaAvatar size="small" showBadges={false} />
        </TouchableOpacity>

        <View style={styles.weatherPill}>
          <Text style={styles.weatherIcon}>☁️</Text>
          <Text style={styles.weatherText}>28° feels 32°</Text>
        </View>
      </View>

      {/* "Today" Header with "4 left" badge */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>4 left</Text>
        </View>
      </View>

      {/* Hero Featured Next Class Card */}
      <TouchableOpacity
        style={styles.heroClassCard}
        onPress={() => navigation?.navigate('Timetable')}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={styles.courseCodePill}>CSE3002 • ETH</Text>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>IN 7H 2M</Text>
          </View>
        </View>

        <Text style={styles.heroClassTitle}>Artificial Intelligence</Text>

        <View style={styles.locationRow}>
          <Text style={styles.locationPin}>📍</Text>
          <Text style={styles.locationText}>120-CB • 9:00 AM - 9:50 AM</Text>
        </View>
      </TouchableOpacity>

      {/* Upcoming Class Compact Stacked Rows */}
      <View style={styles.upcomingStack}>
        <TouchableOpacity
          style={styles.upcomingRow}
          onPress={() => navigation?.navigate('Timetable')}
        >
          <Text style={styles.timeTag}>10:01 AM</Text>
          <Text style={styles.classRowName} numberOfLines={1}>Entrepreneurship</Text>
          <Text style={styles.roomTag}>408-CB</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.upcomingRow}
          onPress={() => navigation?.navigate('Timetable')}
        >
          <Text style={styles.timeTag}>11:00 AM</Text>
          <Text style={styles.classRowName} numberOfLines={1}>Computer Organization and Ar...</Text>
          <Text style={styles.roomTag}>220-CB</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.upcomingRow}
          onPress={() => navigation?.navigate('Timetable')}
        >
          <Text style={styles.timeTag}>12:00 PM</Text>
          <Text style={styles.classRowName} numberOfLines={1}>Discrete Mathematical Structur...</Text>
          <Text style={styles.roomTag}>120-CB</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Access Section */}
      <Text style={[styles.sectionTitle, { marginTop: 28, marginBottom: 14 }]}>Quick Access</Text>

      <View style={styles.quickAccessGrid}>
        {/* Biometric */}
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation?.navigate('Attendance')}>
          <View style={styles.iconCircle}>
            <Text style={styles.actionIcon}>🪪</Text>
          </View>
          <Text style={styles.iconLabel}>Biometric</Text>
        </TouchableOpacity>

        {/* Marks */}
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation?.navigate('Attendance')}>
          <View style={styles.iconCircle}>
            <Text style={styles.actionIcon}>📊</Text>
          </View>
          <Text style={styles.iconLabel}>Marks</Text>
        </TouchableOpacity>

        {/* Grades */}
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation?.navigate('Attendance')}>
          <View style={styles.iconCircle}>
            <Text style={styles.actionIcon}>🥧</Text>
          </View>
          <Text style={styles.iconLabel}>Grades</Text>
        </TouchableOpacity>

        {/* Exams */}
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation?.navigate('Exams')}>
          <View style={styles.iconCircle}>
            <Text style={styles.actionIcon}>📅</Text>
          </View>
          <Text style={styles.iconLabel}>Exams</Text>
        </TouchableOpacity>

        {/* Outing */}
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation?.navigate('Tasks')}>
          <View style={styles.iconCircle}>
            <Text style={styles.actionIcon}>✈️</Text>
          </View>
          <Text style={styles.iconLabel}>Outing</Text>
        </TouchableOpacity>

        {/* Payments / Finance */}
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation?.navigate('Finance')}>
          <View style={styles.iconCircle}>
            <Text style={styles.actionIcon}>🧾</Text>
          </View>
          <Text style={styles.iconLabel}>Payments</Text>
        </TouchableOpacity>

        {/* Assignments */}
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation?.navigate('Exams')}>
          <View style={styles.iconCircle}>
            <Text style={styles.actionIcon}>📝</Text>
          </View>
          <Text style={styles.iconLabel}>Assignments</Text>
        </TouchableOpacity>

        {/* AI Companion */}
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => navigation?.navigate('AI Companion')}
        >
          <View style={[styles.iconCircle, styles.aiCircle]}>
            <Text style={styles.actionIcon}>🤖</Text>
          </View>
          <Text style={[styles.iconLabel, { color: '#60A5FA', fontWeight: '700' }]}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      {/* "For You" Section */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>For You</Text>
        <TouchableOpacity onPress={() => navigation?.navigate('Finance')}>
          <Text style={styles.viewAllText}>View All →</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Budget Card */}
      <TouchableOpacity
        style={styles.financeCard}
        onPress={() => navigation?.navigate('Finance')}
      >
        <View style={styles.financeRow}>
          <Text style={styles.financeTitle}>Monthly Student Budget</Text>
          <Text style={styles.financeRemaining}>₹{remaining} left</Text>
        </View>
        <Text style={styles.financeSpent}>₹{totalSpent} spent this month</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.min(100, (totalSpent / 10000) * 100)}%` }]} />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F15' },
  content: { padding: 18, paddingBottom: 110 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151D2A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#233247',
    gap: 6,
  },
  weatherIcon: { fontSize: 15 },
  weatherText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: '#1C2638',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#233247',
  },
  countText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  heroClassCard: {
    backgroundColor: '#151D2A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#233247',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  courseCodePill: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  countdownBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroClassTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationPin: { fontSize: 13 },
  locationText: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  upcomingStack: {
    gap: 6,
    marginBottom: 10,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151D2A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  timeTag: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    width: 72,
  },
  classRowName: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    paddingRight: 8,
  },
  roomTag: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#151D2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#233247',
    marginBottom: 6,
  },
  aiCircle: {
    backgroundColor: '#1E293B',
    borderColor: '#2563EB',
  },
  actionIcon: {
    fontSize: 22,
  },
  iconLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewAllText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
  },
  financeCard: {
    backgroundColor: '#151D2A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#233247',
    marginTop: 8,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  financeRemaining: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
  },
  financeSpent: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  progressBg: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
});
