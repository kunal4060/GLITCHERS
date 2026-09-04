import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { NinjaAvatar } from '../components/NinjaAvatar';
import { GradientBackground } from '../components/common/GradientBackground';
import { AIGemSymbol } from '../components/common/AIGemSymbol';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import {
  getNextUpcomingClass,
  getDayIndex,
  parseTimeToMinutes,
} from '../utils/timetableTimeUtils';

export const DashboardScreen = ({ navigation }: { navigation?: any }) => {
  const {
    classes,
    tasks,
    expenses,
    budget,
    emails,
    isLoading,
    avatarUrl,
    syncWithBackend,
    completeTask,
  } = useDashboardStore();
  const { gmailConnected } = useAuthStore();

  const [emailBullets, setEmailBullets] = useState<string[]>([]);
  const [isSummarizingEmails, setIsSummarizingEmails] = useState(false);

  const handleSummarizeEmails = async () => {
    setIsSummarizingEmails(true);
    try {
      const res = await apiClient.summarizeEmails();
      if (res?.bullets && res.bullets.length > 0) {
        setEmailBullets(res.bullets);
        return;
      }
    } catch (err) {
      console.warn('Email summarize error:', err);
    } finally {
      setIsSummarizingEmails(false);
    }

    if (emails.length > 0) {
      setEmailBullets(emails.map((e) => `• [${e.importance}] ${e.subject}: ${e.summary}`));
    }
  };

  useEffect(() => {
    syncWithBackend().then(() => {
      handleSummarizeEmails();
    });
  }, []);

  useEffect(() => {
    if (emails.length > 0 && emailBullets.length === 0) {
      handleSummarizeEmails();
    }
  }, [emails.length]);

  const pendingTasks = tasks.filter((t) => t.status === 'TODO');
  const urgentEmail = emails.find((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH');

  // Real-time dynamic timetable calculations
  const now = new Date();
  const currentDayIdx = now.getDay();
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const todayClasses = classes.filter((c) => getDayIndex(c.day) === currentDayIdx && !c.isCancelled);
  const upcomingCount = todayClasses.filter((c) => parseTimeToMinutes(c.startTime) > curMinutes).length;

  const nextClassInfo = getNextUpcomingClass(classes, now);
  const nextClass = nextClassInfo.nextClass || {
    id: 'placeholder',
    userId: 'u1',
    subjectName: 'No Classes Scheduled',
    day: 'MONDAY' as const,
    startTime: '--:--',
    endTime: '--:--',
    room: 'Free Period',
    faculty: 'Academic Schedule Clear',
    classType: 'LECTURE' as const,
    isCancelled: false,
  };

  // Spending calculations
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthlyLimit = budget?.monthlyLimit || 10000;
  const budgetPct = Math.min(100, Math.round((totalSpent / monthlyLimit) * 100));

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
            <NinjaAvatar size="small" showBadges={false} customImageUri={avatarUrl} />
            <View style={styles.profileTextCol}>
              <Text style={styles.greetingTitle}>Good morning, Kunal</Text>
              <Text style={styles.semesterSubtitle}>VIT AP • Fall Semester 2026-27</Text>
            </View>
          </TouchableOpacity>

          {/* 3. Three Pastel Information Cards */}
          <View style={styles.statsRow}>
            <StatCard
              variant="teal"
              title={`${todayClasses.length} ${todayClasses.length === 1 ? 'Class' : 'Classes'}\nToday`}
              subtext={upcomingCount > 0 ? `${upcomingCount} Upcoming` : todayClasses.length > 0 ? 'All Done' : 'No Classes'}
              icon={<Ionicons name="calendar-outline" size={20} color={designTokens.colors.textPrimary} />}
              onPress={() => navigation?.navigate('Timetable')}
            />
            <View style={{ width: 10 }} />
            <StatCard
              variant="peach"
              title={`${pendingTasks.length} Pending\n${pendingTasks.length === 1 ? 'Task' : 'Tasks'}`}
              subtext={
                pendingTasks.filter((t) => t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH').length > 0
                  ? `${pendingTasks.filter((t) => t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH').length} Urgent`
                  : 'On Track'
              }
              hasDot={pendingTasks.length > 0}
              dotColor={designTokens.colors.accentPeachDot}
              icon={<Ionicons name="checkbox-outline" size={20} color={designTokens.colors.textPrimary} />}
              onPress={() => navigation?.navigate('Tasks')}
            />
            <View style={{ width: 10 }} />
            <StatCard
              variant="cream"
              title={`${urgentEmail ? 1 : 0} Important\nNotice`}
              subtext={gmailConnected ? (urgentEmail ? 'Official' : 'All clear') : 'Not linked'}
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
              <Text style={styles.heroLabel}>
                {nextClassInfo.isOngoing ? 'CURRENT CLASS' : nextClassInfo.isToday ? 'NEXT CLASS' : 'UPCOMING CLASS'}
              </Text>
              <StatusBadge label={nextClassInfo.statusLabel} variant={nextClassInfo.badgeVariant} />
            </View>

            <Text style={styles.heroSubjectTitle}>
              {nextClass.subjectName.replace('\\n', '\n')}
            </Text>

            <Text style={styles.heroMetaText}>
              {nextClass.startTime} – {nextClass.endTime} • Room: {nextClass.room || 'AB1-204'}
            </Text>
            <Text style={styles.heroFacultyText}>
              Faculty: {nextClass.faculty || 'Faculty'}
            </Text>
          </GlassCard>

        {/* 5. Priority Deadlines Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>PRIORITY DEADLINES</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Tasks')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {tasks.length === 0 ? (
          <GlassCard variant="teal" style={styles.taskCard} onPress={() => navigation?.navigate('Tasks')}>
            <View style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#7A7875', fontWeight: '500' }}>
                No pending tasks. Tap to add your first deadline! ✨
              </Text>
            </View>
          </GlassCard>
        ) : (
          tasks.slice(0, 3).map((task, idx) => {
            const variantMap: Record<string, any> = {
              EXTREMELY_IMPORTANT: 'extremely_important',
              HIGH: 'high',
              NORMAL: 'normal',
              LOW: 'low',
            };
            const dueText = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : 'Pending';
            return (
              <GlassCard
                key={task.id || String(idx)}
                variant="teal"
                style={styles.taskCard}
                onPress={() => navigation?.navigate('Tasks')}
              >
                <View style={styles.taskCardRow}>
                  <Text style={styles.taskIndexNumber}>{idx + 1}</Text>
                  <View style={styles.taskMainCol}>
                    <Text style={styles.taskTitleText}>{task.title}</Text>
                    <View style={styles.taskBadgeRow}>
                      <StatusBadge label={task.priority} variant={variantMap[task.priority] || 'normal'} />
                    </View>
                  </View>
                  <Text style={styles.taskDueText}>{dueText}</Text>
                </View>
              </GlassCard>
            );
          })
        )}

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

        {/* 7. AI Email Summarization with Gemini (Bottom of Home Screen) */}
        <View style={styles.emailDigestSection}>
          <View style={styles.emailDigestHeaderRow}>
            <View style={styles.emailDigestTitleGroup}>
              <AIGemSymbol size={22} />
              <Text style={styles.emailDigestHeading}>AI EMAIL SUMMARY</Text>
            </View>
            <View style={styles.geminiBadge}>
              <Text style={styles.geminiBadgeText}>Gemini 3.6 Flash</Text>
            </View>
          </View>

          <GlassCard variant="cream" style={styles.emailDigestCard}>
            {!gmailConnected ? (
              <View style={{ alignItems: 'center', paddingVertical: 18, paddingHorizontal: 12 }}>
                <Ionicons name="mail-unread-outline" size={32} color={designTokens.colors.primaryDark} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: designTokens.colors.textPrimary, marginBottom: 4 }}>
                  University Gmail Not Linked
                </Text>
                <Text style={{ fontSize: 12, color: designTokens.colors.textSecondary, textAlign: 'center', lineHeight: 17, marginBottom: 12 }}>
                  Link your university Google account in Settings to automatically scan circulars, exam dates, and notices.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: designTokens.colors.primary,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: designTokens.radii.pill,
                  }}
                  onPress={() => navigation?.navigate('Account')}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Connect in Settings</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.emailCardTop}>
                  <Text style={styles.emailCardSub}>
                    Executive briefing from university circulars & notices:
                  </Text>
                  <TouchableOpacity
                    onPress={handleSummarizeEmails}
                    disabled={isSummarizingEmails}
                    style={[styles.refreshIconBtn, isSummarizingEmails && { opacity: 0.6 }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="sparkles"
                      size={14}
                      color={designTokens.colors.primaryDark}
                    />
                    <Text style={styles.refreshBtnText}>
                      {isSummarizingEmails ? 'Summarizing...' : 'Re-summarize'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isSummarizingEmails ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={designTokens.colors.primaryDark} />
                    <Text style={styles.loadingText}>Gemini is extracting key deadlines & notices...</Text>
                  </View>
                ) : emailBullets.length > 0 ? (
                  <View style={styles.bulletsList}>
                    {emailBullets.map((bullet, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{bullet.replace(/^[•\-\*]\s*/, '')}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: designTokens.colors.textSecondary }}>
                      No unread circulars from your university. You're all caught up!
                    </Text>
                  </View>
                )}

                <View style={styles.emailCardBottomRow}>
                  <TouchableOpacity
                    style={styles.viewNoticesBtn}
                    onPress={() => navigation?.navigate('Email')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.viewNoticesBtnText}>View All University Notices ({emails.length}) →</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </GlassCard>
        </View>

        {/* Space at bottom for navigation and floating gem */}
        <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
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
    paddingTop: 12,
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

  // 7. AI Email Summarization
  emailDigestSection: {
    marginTop: 8,
    marginBottom: designTokens.spacing.lg,
  },
  emailDigestHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emailDigestTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailDigestHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: designTokens.colors.textPrimary,
    letterSpacing: 0.6,
  },
  geminiBadge: {
    backgroundColor: '#E7ECE9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(117, 167, 165, 0.25)',
  },
  geminiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: designTokens.colors.primaryDark,
  },
  emailDigestCard: {
    padding: 16,
    borderRadius: designTokens.radii.card,
  },
  emailCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emailCardSub: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    flex: 1,
    paddingRight: 8,
  },
  refreshIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.1)',
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: designTokens.colors.primaryDark,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.primaryDark,
  },
  bulletsList: {
    gap: 8,
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 15,
    color: designTokens.colors.primaryDark,
    lineHeight: 18,
    fontWeight: '800',
  },
  bulletText: {
    fontSize: 13,
    color: designTokens.colors.textPrimary,
    lineHeight: 19,
    flex: 1,
    fontWeight: '500',
  },
  emailCardBottomRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 51, 50, 0.08)',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  viewNoticesBtn: {
    paddingVertical: 2,
  },
  viewNoticesBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.primaryDark,
  },
});
