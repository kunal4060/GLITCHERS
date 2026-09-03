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
  const { emails, addTask } = useDashboardStore();
  const { gmailConnected } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState<'IMPORTANT' | 'ALL'>('IMPORTANT');

  const importantEmails = emails.filter((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH');
  const displayedEmails = selectedTab === 'IMPORTANT' ? importantEmails : emails;

  const handleCreateTaskFromEmail = (subject: string, summary: string) => {
    const newTask: Task = {
      id: String(Date.now()),
      userId: 'u1',
      title: `Action: ${subject.replace(/🔴|⚠️/g, '').trim()}`,
      description: summary,
      priority: 'HIGH',
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    };
    addTask(newTask);
    Alert.alert('Task Created', `"${newTask.title}" scheduled from university email.`);
  };

  const handleAddToCalendar = (subject: string) => {
    Alert.alert('Calendar Event Created', `"${subject}" synced with academic schedule.`);
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>University Communications</Text>
          <Text style={styles.subtitle}>AI-filtered academic announcements & circulars</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'IMPORTANT' && styles.tabActive]}
            onPress={() => setSelectedTab('IMPORTANT')}
          >
            <Text style={[styles.tabText, selectedTab === 'IMPORTANT' && styles.tabTextActive]}>
              Important ({importantEmails.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'ALL' && styles.tabActive]}
            onPress={() => setSelectedTab('ALL')}
          >
            <Text style={[styles.tabText, selectedTab === 'ALL' && styles.tabTextActive]}>
              All Circulars ({emails.length})
            </Text>
          </TouchableOpacity>
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
            <Ionicons name="mail-open-outline" size={38} color="#75A7A5" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Circulars Found</Text>
            <Text style={styles.emptySubtitle}>
              You have no unread notices matching this filter. Official communications will appear here once received from your university domain.
            </Text>
          </GlassCard>
        ) : (
          <View style={styles.emailList}>
            {displayedEmails.map((e) => (
              <GlassCard key={e.id} elevated style={styles.emailCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.senderText}>{e.sender}</Text>
                  {e.importance === 'CRITICAL' ? (
                    <StatusBadge label="Critical" variant="urgent" />
                  ) : (
                    <StatusBadge label="High Priority" variant="warning" />
                  )}
                </View>

                <Text style={styles.subjectText}>{e.subject}</Text>

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
            ))}
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
  title: { ...designTokens.typography.hero, fontSize: 22 },
  subtitle: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.lg,
  },
  tab: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 3,
    borderRadius: designTokens.radii.pill,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  tabActive: {
    backgroundColor: designTokens.colors.primaryPill,
    borderColor: designTokens.colors.primary,
  },
  tabText: { ...designTokens.typography.bodyMedium, fontSize: 12, color: designTokens.colors.textSecondary },
  tabTextActive: { color: designTokens.colors.textPrimary, fontWeight: '700' },
  emailList: { gap: designTokens.spacing.md },
  emailCard: {
    padding: designTokens.spacing.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderText: { ...designTokens.typography.micro, color: designTokens.colors.textMuted },
  subjectText: { ...designTokens.typography.cardTitle, fontSize: 15, marginBottom: designTokens.spacing.sm },
  summaryBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: designTokens.radii.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(117, 167, 165, 0.20)',
  },
  summaryLabel: { ...designTokens.typography.label, fontSize: 9, color: designTokens.colors.accentPeachDeep },
  summaryText: { ...designTokens.typography.body, fontSize: 12, color: designTokens.colors.textPrimary, lineHeight: 18 },
  actionsRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  actionPill: {
    backgroundColor: designTokens.colors.primarySoft,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: 7,
    borderRadius: designTokens.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionPillText: { ...designTokens.typography.micro, color: designTokens.colors.primaryDeep, fontWeight: '700' },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
    borderRadius: designTokens.radii.card,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
});
