import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { NinjaAvatar } from '../components/NinjaAvatar';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';

export const DashboardScreen = ({ navigation }: { navigation?: any }) => {
  const {
    classes,
    tasks,
    expenses,
    budget,
    emails,
    isLoading,
    syncWithBackend,
    completeTask,
  } = useDashboardStore();

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const pendingTasks = tasks.filter((t) => t.status === 'TODO');
  const urgentEmail = emails.find((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH');

  // Next class from reference: DBMS
  const nextClass = classes[0] || {
    subjectName: 'Database Management\nSystems (DBMS)',
    startTime: '10:00',
    endTime: '11:00',
    room: 'AB1-204',
    faculty: 'Dr. Sharma',
  };

  // Spending calculations
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0) || 710;
  const monthlyLimit = budget?.monthlyLimit || 10000;
  const budgetPct = Math.min(100, Math.round((totalSpent / monthlyLimit) * 100));

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={syncWithBackend}
            tintColor={designTokens.colors.primary}
          />
        }
      >
        {/* 1. Top App Bar: Title "Home" & Header Action Icons */}
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Home</Text>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation?.navigate('Search')}
              accessibilityLabel="Search"
            >
              <Ionicons name="search-outline" size={22} color={designTokens.colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation?.navigate('Alerts')}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={designTokens.colors.textPrimary} />
              <View style={styles.notifDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation?.navigate('Account')}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={22} color={designTokens.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Greeting Profile Section */}
        <TouchableOpacity
          style={styles.profileRow}
          activeOpacity={0.85}
          onPress={() => navigation?.navigate('Account')}
        >
          <NinjaAvatar size="small" showBadges={false} />
          <View style={styles.profileTextCol}>
            <Text style={styles.greetingTitle}>Good morning, Kunal</Text>
            <Text style={styles.semesterSubtitle}>VIT AP • Fall Semester 2026-27</Text>
          </View>
        </TouchableOpacity>

        {/* 3. Three Pastel Information Cards */}
        <View style={styles.statsRow}>
          <StatCard
            variant="teal"
            title={'3 Classes\nToday'}
            subtext="1 Upcoming"
            icon={<Ionicons name="calendar-outline" size={20} color={designTokens.colors.textPrimary} />}
            onPress={() => navigation?.navigate('Timetable')}
          />
          <View style={{ width: 10 }} />
          <StatCard
            variant="peach"
            title={'2 Pending\nTasks'}
            subtext="1 Urgent"
            hasDot
            dotColor={designTokens.colors.accentPeachDot}
            icon={<Ionicons name="checkbox-outline" size={20} color={designTokens.colors.textPrimary} />}
            onPress={() => navigation?.navigate('Tasks')}
          />
          <View style={{ width: 10 }} />
          <StatCard
            variant="cream"
            title={'1 Important\nNotice'}
            subtext="Official"
            icon={<Ionicons name="mail-outline" size={20} color={designTokens.colors.textPrimary} />}
            onPress={() => navigation?.navigate('Email')}
          />
        </View>

        {/* 4. Large Next Class Feature Card */}
        <GlassCard
          variant="hero"
          style={styles.heroCard}
          onPress={() => navigation?.navigate('Timetable')}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>NEXT CLASS</Text>
            <StatusBadge label="Starts in 18 mins" variant="countdown" />
          </View>

          <Text style={styles.heroSubjectTitle}>
            {nextClass.subjectName.replace('\\n', '\n')}
          </Text>

          <Text style={styles.heroMetaText}>
            {nextClass.startTime} – {nextClass.endTime} • Room: {nextClass.room || 'AB1-204'}
          </Text>
          <Text style={styles.heroFacultyText}>
            Faculty: {nextClass.faculty || 'Dr. Sharma'}
          </Text>
        </GlassCard>

        {/* 5. Priority Deadlines Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>PRIORITY DEADLINES</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Tasks')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {/* Task 1: Complete AI Assignment 2 (EXTREMELY_IMPORTANT) */}
        <GlassCard
          variant="teal"
          style={styles.taskCard}
          onPress={() => navigation?.navigate('Tasks')}
        >
          <View style={styles.taskCardRow}>
            <Text style={styles.taskIndexNumber}>1</Text>
            <View style={styles.taskMainCol}>
              <Text style={styles.taskTitleText}>Complete AI Assignment 2</Text>
              <View style={styles.taskBadgeRow}>
                <StatusBadge label="EXTREMELY_IMPORTANT" variant="extremely_important" />
              </View>
            </View>
            <Text style={styles.taskDueText}>Due in 2 days</Text>
          </View>
        </GlassCard>

        {/* Task 2: Submit DBMS Lab Report (HIGH) */}
        <GlassCard
          variant="teal"
          style={styles.taskCard}
          onPress={() => navigation?.navigate('Tasks')}
        >
          <View style={styles.taskCardRow}>
            <Text style={styles.taskIndexNumber}>2</Text>
            <View style={styles.taskMainCol}>
              <Text style={styles.taskTitleText}>Submit DBMS Lab Report</Text>
              <View style={styles.taskBadgeRow}>
                <StatusBadge label="HIGH" variant="high" />
              </View>
            </View>
            <Text style={styles.taskDueText}>Due in 2 days</Text>
          </View>
        </GlassCard>

        {/* 6. Spending Snapshot */}
        <View style={styles.spendingSection}>
          <View style={styles.spendingHeaderRow}>
            <Text style={styles.spendingHeading}>Spending Snapshot</Text>
          </View>
          <Text style={styles.spendingStatusText}>
            ₹{totalSpent.toLocaleString()} / ₹{monthlyLimit.toLocaleString()} (On Track)
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(8, budgetPct)}%` },
              ]}
            />
          </View>
        </View>

        {/* Space at bottom for navigation and floating gem */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: 48,
    paddingBottom: 24,
  },

  // 1. Top App Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: designTokens.colors.textPrimary,
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: designTokens.colors.accentPeachDot,
  },

  // 2. Greeting Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: designTokens.spacing.lg,
  },
  profileTextCol: {
    justifyContent: 'center',
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    letterSpacing: -0.2,
  },
  semesterSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },

  // 3. Three Pastel Cards
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.lg,
  },

  // 4. Next Class Hero Card
  heroCard: {
    marginBottom: designTokens.spacing.xl,
    padding: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F3D7C8',
    letterSpacing: 0.8,
  },
  heroSubjectTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F0ECE7',
    marginBottom: 2,
  },
  heroFacultyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E3DDD5',
  },

  // 5. Priority Deadlines
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },

  // Task Cards
  taskCard: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
  },
  taskCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIndexNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D7470',
    width: 20,
  },
  taskMainCol: {
    flex: 1,
    paddingRight: 8,
  },
  taskTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  taskBadgeRow: {
    flexDirection: 'row',
  },
  taskDueText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#63706D',
  },

  // 6. Spending Snapshot
  spendingSection: {
    marginTop: 12,
    marginBottom: designTokens.spacing.lg,
  },
  spendingHeaderRow: {
    marginBottom: 4,
  },
  spendingHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
  },
  spendingStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#232D2B',
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E6E0D4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: designTokens.colors.primary,
    borderRadius: 3,
  },
});
