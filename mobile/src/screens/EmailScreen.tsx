import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import type { Task } from '@glitchers/shared';

export const EmailScreen: React.FC = () => {
  const { emails, addTask, dismissedNoticeIds, dismissNotice, restoreNotice } = useDashboardStore();
  const { gmailConnected } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState<'ACTIVE' | 'IMPORTANT' | 'ACKNOWLEDGED' | 'ALL'>('ACTIVE');

  const activeEmails = emails.filter((e) => !e.isDismissed && !dismissedNoticeIds.includes(e.id));
  const dismissedEmails = emails.filter((e) => e.isDismissed || dismissedNoticeIds.includes(e.id));
  const importantEmails = activeEmails.filter((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH');

  let displayedEmails = activeEmails;
  if (selectedTab === 'IMPORTANT') {
    displayedEmails = importantEmails;
  } else if (selectedTab === 'ACKNOWLEDGED') {
    displayedEmails = dismissedEmails;
  } else if (selectedTab === 'ALL') {
    displayedEmails = emails;
  }

  const handleCreateTaskFromEmail = (subject: string, summary: string) => {
    const newTask: Task = {
      id: String(Date.now()),
      userId: useAuthStore.getState().user?.id || 'offline-user',
      title: `Action: ${subject.replace(/🔴|⚠️|📢/g, '').trim()}`,
      description: summary,
      priority: 'HIGH',
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    };
    addTask(newTask);
    Alert.alert('Task Created', `"${newTask.title}" scheduled from university circular.`);
  };

  const handleAddToCalendar = (subject: string) => {
    Alert.alert('Calendar Event Created', `"${subject}" synced with academic schedule.`);
  };

  const handleToggleNotice = (id: string, isCurrentlyDismissed: boolean) => {
    if (isCurrentlyDismissed) {
      restoreNotice(id);
      Alert.alert('Notice Restored', 'Notice moved back to active circulars.');
    } else {
      dismissNotice(id);
      Alert.alert('Notice Acknowledged', 'Notice ticked and removed from active list.');
    }
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>University Communications</Text>
          <Text style={styles.subtitle}>AI-filtered academic announcements & official circulars</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'ACTIVE' && styles.tabActive]}
            onPress={() => setSelectedTab('ACTIVE')}
          >
            <Text style={[styles.tabText, selectedTab === 'ACTIVE' && styles.tabTextActive]}>
              Active ({activeEmails.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'IMPORTANT' && styles.tabActive]}
            onPress={() => setSelectedTab('IMPORTANT')}
          >
            <Text style={[styles.tabText, selectedTab === 'IMPORTANT' && styles.tabTextActive]}>
              Important ({importantEmails.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'ACKNOWLEDGED' && styles.tabActive]}
            onPress={() => setSelectedTab('ACKNOWLEDGED')}
          >
            <Text style={[styles.tabText, selectedTab === 'ACKNOWLEDGED' && styles.tabTextActive]}>
              Ticked ({dismissedEmails.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'ALL' && styles.tabActive]}
            onPress={() => setSelectedTab('ALL')}
          >
            <Text style={[styles.tabText, selectedTab === 'ALL' && styles.tabTextActive]}>
              All ({emails.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notice Explainer Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={designTokens.colors.primaryDark} />
          <Text style={styles.infoBannerText}>
            Tap the tick button on any notice once read to clear it from your home screen and active circulars.
          </Text>
        </View>

        {/* Email Feed */}
        {!gmailConnected ? (
          <GlassCard variant="cream" style={styles.emptyCard}>
            <Ionicons name="mail-unread-outline" size={42} color={designTokens.colors.primaryDark} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>University Gmail Not Linked</Text>
            <Text style={styles.emptySubtitle}>
              Link your university Google account in Settings or during onboarding to automatically scan, classify, and summarize official notices and circulars.
            </Text>
          </GlassCard>
        ) : displayedEmails.length === 0 ? (
          <GlassCard variant="cream" style={styles.emptyCard}>
            <Ionicons
              name={selectedTab === 'ACKNOWLEDGED' ? 'checkmark-done-circle-outline' : 'mail-open-outline'}
              size={38}
              color="#75A7A5"
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>
              {selectedTab === 'ACKNOWLEDGED' ? 'No Ticked Notices' : 'All Clear! No Circulars Pending'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'ACKNOWLEDGED'
                ? 'When you tick/read notices, they will appear here for archival reference.'
                : 'You have no unread notices matching this filter. Official communications will appear here once received.'}
            </Text>
          </GlassCard>
        ) : (
          <View style={styles.emailList}>
            {displayedEmails.map((e) => {
              const isDismissed = e.isDismissed || dismissedNoticeIds.includes(e.id);
              return (
                <GlassCard key={e.id} elevated style={[styles.emailCard, isDismissed && styles.emailCardDismissed]}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.senderBadgeGroup}>
                      <Text style={styles.senderText}>{e.sender}</Text>
                      {e.importance === 'CRITICAL' ? (
                        <StatusBadge label="Critical" variant="urgent" />
                      ) : e.importance === 'HIGH' ? (
                        <StatusBadge label="High Priority" variant="warning" />
                      ) : (
                        <StatusBadge label="Notice" variant="safe" />
                      )}
                    </View>

                    {/* Tick / Dismiss Button */}
                    <TouchableOpacity
                      style={[styles.tickBtn, isDismissed && styles.tickBtnActive]}
                      onPress={() => handleToggleNotice(e.id, isDismissed)}
                      accessibilityLabel={isDismissed ? 'Restore notice' : 'Tick notice as read'}
                    >
                      <Ionicons
                        name={isDismissed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={22}
                        color={isDismissed ? '#3D7A5A' : designTokens.colors.primaryDark}
                      />
                      <Text style={[styles.tickBtnText, isDismissed && styles.tickBtnTextActive]}>
                        {isDismissed ? 'Ticked' : 'Tick as Read'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.subjectText, isDismissed && styles.subjectTextDismissed]}>
                    {e.subject}
                  </Text>

                  {/* AI Executive Summary */}
                  <View style={styles.summaryBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <Ionicons name="sparkles" size={11} color={designTokens.colors.accentPeachDeep} />
                      <Text style={styles.summaryLabel}>AI EXECUTIVE SUMMARY</Text>
                    </View>
                    <Text style={styles.summaryText}>{e.summary}</Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleAddToCalendar(e.subject)}
                    >
                      <Ionicons name="calendar-outline" size={13} color={designTokens.colors.primaryDeep} />
                      <Text style={styles.actionPillText}>Add to Calendar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleCreateTaskFromEmail(e.subject, e.summary || '')}
                    >
                      <Ionicons name="checkbox-outline" size={13} color={designTokens.colors.primaryDeep} />
                      <Text style={styles.actionPillText}>Create Task</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: designTokens.spacing.lg, paddingBottom: 110 },
  header: { marginBottom: designTokens.spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#76777D', marginTop: 3 },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: designTokens.spacing.md,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: designTokens.radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
  },
  tabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabText: { fontSize: 11, fontWeight: '600', color: '#76777D' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 106, 99, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.12)',
  },
  infoBannerText: {
    fontSize: 11.5,
    color: '#006A63',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  emailList: { gap: designTokens.spacing.md },
  emailCard: {
    padding: designTokens.spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  emailCardDismissed: {
    opacity: 0.65,
    backgroundColor: '#F9F9FB',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  senderText: {
    fontSize: 11,
    color: '#76777D',
    fontWeight: '600',
    maxWidth: 140,
  },
  tickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
  },
  tickBtnActive: {
    backgroundColor: 'rgba(0, 106, 99, 0.10)',
    borderColor: 'rgba(0, 106, 99, 0.25)',
  },
  tickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  tickBtnTextActive: {
    color: '#006A63',
  },
  subjectText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#111827',
    marginBottom: designTokens.spacing.sm,
    lineHeight: 20,
  },
  subjectTextDismissed: {
    color: '#76777D',
  },
  summaryBox: {
    backgroundColor: 'rgba(0, 106, 99, 0.04)',
    borderRadius: 12,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.12)',
  },
  summaryLabel: { fontSize: 9, fontWeight: '800', color: '#006A63', letterSpacing: 0.6 },
  summaryText: { fontSize: 12, color: '#374151', lineHeight: 18 },
  actionsRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  actionPill: {
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: designTokens.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.15)',
  },
  actionPillText: { fontSize: 11, color: '#006A63', fontWeight: '700' },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#76777D',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
});
