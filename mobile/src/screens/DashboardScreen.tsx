import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { NinjaAvatar } from '../components/NinjaAvatar';
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

  // Calculations for priority engine
  const pendingTasks = tasks.filter((t) => t.status === 'TODO');
  const criticalTasks = pendingTasks.filter((t) => t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH');
  const urgentEmail = emails.find((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH');

  // Next class calculation
  const nextClass = classes[0] || {
    subjectName: 'Artificial Intelligence',
    startTime: '09:00',
    endTime: '09:50',
    room: '120-CB',
    faculty: 'MITHILESH KUMAR DUBEY',
    classType: 'LECTURE',
  };

  // Finance calculation
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthlyLimit = budget?.monthlyLimit || 10000;
  const remainingBudget = Math.max(0, monthlyLimit - totalSpent);
  const budgetPct = Math.min(100, Math.round((totalSpent / monthlyLimit) * 100));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={syncWithBackend}
          tintColor={designTokens.colors.primary}
        />
      }
    >
      {/* 1. Header: Greeting, Academic Context, Avatar, Notification */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerProfile}
          activeOpacity={0.8}
          onPress={() => navigation?.navigate('Account')}
        >
          <NinjaAvatar size="small" showBadges={false} />
          <View style={styles.headerTitles}>
            <Text style={styles.greetingText}>Good morning, Kunal</Text>
            <Text style={styles.semesterText}>VIT AP • Fall Semester 2026-27</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionCircle}
            onPress={() => navigation?.navigate('Search')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCircle}
            onPress={() => navigation?.navigate('Alerts')}
          >
            <Text style={styles.actionIcon}>🔔</Text>
            {urgentEmail && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Priority Engine Hero: Next Class with Live Countdown */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Today's Schedule</Text>
        <StatusBadge label="Starts in 18 min" variant="countdown" />
      </View>

      <GlassCard
        elevated
        borderActive
        style={styles.heroCard}
        onPress={() => navigation?.navigate('Timetable')}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{nextClass.classType || 'LECTURE'}</Text>
          </View>
          <Text style={styles.heroTimeRange}>{nextClass.startTime} – {nextClass.endTime}</Text>
        </View>

        <Text style={styles.heroSubjectTitle}>{nextClass.subjectName}</Text>

        <View style={styles.heroMetaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText}>{nextClass.room || '120-CB'}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>👤</Text>
            <Text style={styles.metaText}>{nextClass.faculty || 'Faculty'}</Text>
          </View>
        </View>
      </GlassCard>

      {/* 3. Quick Stats Grid */}
      <View style={styles.statsRow}>
        <StatCard
          label="CLASSES TODAY"
          value={classes.length}
          subtext="4 scheduled"
          icon="📅"
          accentColor={designTokens.colors.primary}
          onPress={() => navigation?.navigate('Timetable')}
        />
        <View style={{ width: designTokens.spacing.md }} />
        <StatCard
          label="PENDING TASKS"
          value={pendingTasks.length}
          subtext={criticalTasks.length > 0 ? `${criticalTasks.length} urgent` : 'On track'}
          icon="✅"
          accentColor={criticalTasks.length > 0 ? designTokens.colors.danger : designTokens.colors.success}
          onPress={() => navigation?.navigate('Tasks')}
        />
        <View style={{ width: designTokens.spacing.md }} />
        <StatCard
          label="NOTICES"
          value={emails.length}
          subtext="1 important"
          icon="📬"
          accentColor={designTokens.colors.aiSecondary}
          onPress={() => navigation?.navigate('Email')}
        />
      </View>

      {/* 4. Priority Tasks (Top 2 Urgent Items) */}
      <View style={[styles.sectionHeaderRow, { marginTop: designTokens.spacing.lg }]}>
        <Text style={styles.sectionHeading}>Priority Deadlines</Text>
        <TouchableOpacity onPress={() => navigation?.navigate('Tasks')}>
          <Text style={styles.seeAllLink}>View all ({pendingTasks.length}) →</Text>
        </TouchableOpacity>
      </View>

      {pendingTasks.slice(0, 2).map((task) => (
        <GlassCard key={task.id} style={styles.taskCard} onPress={() => navigation?.navigate('Tasks')}>
          <View style={styles.taskCardRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => completeTask(task.id)}
            >
              <Text style={styles.checkboxText}>○</Text>
            </TouchableOpacity>

            <View style={styles.taskInfo}>
              <View style={styles.taskTagRow}>
                {task.priority === 'EXTREMELY_IMPORTANT' ? (
                  <StatusBadge label="Extremely Important" variant="urgent" />
                ) : (
                  <StatusBadge label="High Priority" variant="warning" />
                )}
                <Text style={styles.dueDateText}>Due tomorrow</Text>
              </View>
              <Text style={styles.taskTitleText}>{task.title}</Text>
            </View>
          </View>
        </GlassCard>
      ))}

      {/* 5. Finance Snapshot */}
      <View style={[styles.sectionHeaderRow, { marginTop: designTokens.spacing.lg }]}>
        <Text style={styles.sectionHeading}>Monthly Spending</Text>
        <TouchableOpacity onPress={() => navigation?.navigate('Finance')}>
          <Text style={styles.seeAllLink}>Details →</Text>
        </TouchableOpacity>
      </View>

      <GlassCard style={styles.financeCard} onPress={() => navigation?.navigate('Finance')}>
        <View style={styles.financeTopRow}>
          <View>
            <Text style={styles.financeAmountText}>₹{totalSpent.toLocaleString()}</Text>
            <Text style={styles.financeSubLabel}>spent of ₹{monthlyLimit.toLocaleString()} monthly budget</Text>
          </View>
          <View style={styles.remainingPill}>
            <Text style={styles.remainingText}>₹{remainingBudget.toLocaleString()} left</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressThumb,
              { width: `${budgetPct}%` },
              budgetPct >= 90 ? styles.progressDanger : styles.progressNormal,
            ]}
          />
        </View>
        <Text style={styles.burnRateHint}>On track: ₹{Math.round(remainingBudget / 27)} daily safe allowance</Text>
      </GlassCard>

      {/* 6. Urgent University Notice Banner */}
      {urgentEmail && (
        <>
          <View style={[styles.sectionHeaderRow, { marginTop: designTokens.spacing.lg }]}>
            <Text style={styles.sectionHeading}>University Circular</Text>
            <StatusBadge label="Urgent" variant="urgent" />
          </View>

          <GlassCard
            style={styles.noticeCard}
            onPress={() => navigation?.navigate('Email')}
          >
            <Text style={styles.noticeSender}>{urgentEmail.sender}</Text>
            <Text style={styles.noticeSubject}>{urgentEmail.subject}</Text>
            <Text style={styles.noticeSummary} numberOfLines={2}>{urgentEmail.summary}</Text>
            <View style={styles.noticeActionRow}>
              <TouchableOpacity
                style={styles.noticeActionBtn}
                onPress={() => navigation?.navigate('Email')}
              >
                <Text style={styles.noticeActionText}>View Full Announcement →</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  content: {
    padding: designTokens.spacing.lg,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
    marginTop: designTokens.spacing.xs,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  headerTitles: {
    justifyContent: 'center',
  },
  greetingText: {
    ...designTokens.typography.sectionTitle,
    fontSize: 18,
    color: designTokens.colors.textPrimary,
  },
  semesterText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: designTokens.colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
    position: 'relative',
  },
  actionIcon: {
    fontSize: 15,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: designTokens.colors.danger,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm + 2,
  },
  sectionHeading: {
    ...designTokens.typography.sectionTitle,
    fontSize: 15,
  },
  seeAllLink: {
    ...designTokens.typography.micro,
    color: designTokens.colors.primary,
    fontWeight: '700',
  },
  heroCard: {
    marginBottom: designTokens.spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  typePill: {
    backgroundColor: designTokens.colors.surfaceSubtle,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: designTokens.radii.sm,
  },
  typePillText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTimeRange: {
    ...designTokens.typography.bodyMedium,
    color: designTokens.colors.textSecondary,
  },
  heroSubjectTitle: {
    ...designTokens.typography.hero,
    fontSize: 20,
    marginBottom: designTokens.spacing.md,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaText: {
    ...designTokens.typography.bodyMedium,
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: designTokens.colors.surfaceBorder,
    marginHorizontal: designTokens.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: designTokens.spacing.sm,
  },
  taskCard: {
    marginBottom: designTokens.spacing.sm,
    padding: designTokens.spacing.md,
  },
  taskCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: designTokens.spacing.md,
  },
  checkboxText: {
    fontSize: 20,
    color: designTokens.colors.textMuted,
  },
  taskInfo: {
    flex: 1,
  },
  taskTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: 4,
  },
  dueDateText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
  },
  taskTitleText: {
    ...designTokens.typography.cardTitle,
    fontSize: 14,
  },
  financeCard: {
    marginBottom: designTokens.spacing.sm,
  },
  financeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: designTokens.spacing.md,
  },
  financeAmountText: {
    ...designTokens.typography.displayNumber,
    fontSize: 26,
    color: designTokens.colors.textPrimary,
  },
  financeSubLabel: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textMuted,
    marginTop: 2,
  },
  remainingPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: designTokens.spacing.sm + 2,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radii.pill,
  },
  remainingText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.success,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: designTokens.colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: designTokens.spacing.xs,
  },
  progressThumb: {
    height: '100%',
    borderRadius: 3,
  },
  progressNormal: {
    backgroundColor: designTokens.colors.primary,
  },
  progressDanger: {
    backgroundColor: designTokens.colors.danger,
  },
  burnRateHint: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    marginTop: 4,
  },
  noticeCard: {
    borderLeftWidth: 3,
    borderLeftColor: designTokens.colors.danger,
  },
  noticeSender: {
    ...designTokens.typography.micro,
    color: designTokens.colors.danger,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  noticeSubject: {
    ...designTokens.typography.cardTitle,
    fontSize: 14,
    marginBottom: 4,
  },
  noticeSummary: {
    ...designTokens.typography.body,
    fontSize: 12,
    lineHeight: 17,
  },
  noticeActionRow: {
    marginTop: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.xs,
  },
  noticeActionBtn: {
    alignSelf: 'flex-start',
  },
  noticeActionText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.primary,
    fontWeight: '700',
  },
});
