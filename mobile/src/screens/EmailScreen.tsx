import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';
import type { Task } from '@glitchers/shared';

export const EmailScreen: React.FC = () => {
  const { emails, addTask } = useDashboardStore();
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
            🔴 Important ({importantEmails.length})
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
              <Text style={styles.summaryLabel}>AI EXECUTIVE SUMMARY</Text>
              <Text style={styles.summaryText}>{e.summary}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => handleAddToCalendar(e.subject)}
              >
                <Text style={styles.actionPillText}>📅 Add to Calendar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => handleCreateTaskFromEmail(e.subject, e.summary || '')}
              >
                <Text style={styles.actionPillText}>✅ Create Task</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ))}
      </View>
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
    paddingVertical: designTokens.spacing.xs + 2,
    borderRadius: designTokens.radii.pill,
    backgroundColor: designTokens.colors.surfaceCard,
  },
  tabActive: { backgroundColor: designTokens.colors.primary },
  tabText: { ...designTokens.typography.bodyMedium, fontSize: 12, color: designTokens.colors.textSecondary },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  emailList: { gap: designTokens.spacing.md },
  emailCard: { padding: designTokens.spacing.md },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderText: { ...designTokens.typography.micro, color: designTokens.colors.textMuted },
  subjectText: { ...designTokens.typography.cardTitle, fontSize: 15, marginBottom: designTokens.spacing.sm },
  summaryBox: {
    backgroundColor: designTokens.colors.surfaceElevated,
    borderRadius: designTokens.radii.sm,
    padding: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.md,
  },
  summaryLabel: { ...designTokens.typography.label, fontSize: 9, color: designTokens.colors.aiSecondary, marginBottom: 2 },
  summaryText: { ...designTokens.typography.body, fontSize: 12, color: designTokens.colors.textPrimary, lineHeight: 17 },
  actionsRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  actionPill: {
    backgroundColor: designTokens.colors.surfaceSubtle,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: 6,
    borderRadius: designTokens.radii.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
  },
  actionPillText: { ...designTokens.typography.micro, color: '#93C5FD', fontWeight: '700' },
});
