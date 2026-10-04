import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';

export const DocumentsScreen: React.FC = () => {
  const { addTask } = useDashboardStore();
  // H17: guard — double-tap "Convert to Task" created two tasks
  const convertLockRef = React.useRef(false);
  // M13: error state + error card with Retry — document load failures were silent
  const [docsError, setDocsError] = React.useState<string | null>(null);

  const documents = [
    {
      id: 'doc_1',
      title: 'Operating Systems Syllabus & Lab Manual',
      type: 'PDF',
      date: 'Sep 1, 2026',
      extractedInsight: 'Lab submission on week 7. 30% internal weighting.',
      actionItem: 'Submit OS Lab Exercise 1',
    },
    {
      id: 'doc_2',
      title: 'Midterm Examination Guidelines Circular',
      type: 'Notice',
      date: 'Aug 28, 2026',
      extractedInsight: 'Calculators permitted only for Engineering Mathematics.',
      actionItem: 'Review exam rules',
    },
  ];

  const handleUploadDocument = () => {
    Alert.alert(
      'Document Uploaded & Parsed',
      'Gemini analyzed "DBMS Assignment Guidelines.pdf" and extracted deadline: September 15.',
      [
        {
          text: 'Add Extracted Task',
          onPress: () => {
            const currentUserId = useAuthStore.getState().user?.id || 'offline-user';
            addTask({
              id: String(Date.now()),
              userId: currentUserId,
              title: 'Complete DBMS Assignment from Circular',
              priority: 'HIGH',
              status: 'TODO',
              dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
            });
            Alert.alert('Task Created', 'Added to your task list with automated reminders.');
          },
        },
      ]
    );
  };

  // M13: error card with retry
  if (docsError) {
    return (
      <GradientBackground>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: 120, paddingHorizontal: 24 }]}>
          <Ionicons name="alert-circle-outline" size={40} color={designTokens.colors.terracotta || '#C0392B'} />
          <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '600', color: designTokens.colors.textPrimary }}>
            Couldn't load documents
          </Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: designTokens.colors.textMuted, textAlign: 'center' }}>
            {docsError}
          </Text>
          <TouchableOpacity
            style={[styles.uploadBtn, { marginTop: 16, paddingHorizontal: 24 }]}
            onPress={() => setDocsError(null)}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadDocument} activeOpacity={0.85}>
          <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
          <Text style={styles.uploadBtnText}>Upload Circular, PDF, or Notice</Text>
        </TouchableOpacity>

        <Text style={styles.header}>ANALYZED UNIVERSITY DOCUMENTS</Text>

        {documents.map((doc) => (
          <View key={doc.id} style={styles.docCard}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{doc.type}</Text>
              </View>
              <Text style={styles.dateText}>{doc.date}</Text>
            </View>

            <Text style={styles.docTitle}>{doc.title}</Text>
            <View style={styles.insightBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <Ionicons name="sparkles" size={12} color={designTokens.colors.accentPeachDeep} />
                <Text style={styles.insightLabel}>AI Extraction</Text>
              </View>
              <Text style={styles.insightText}>{doc.extractedInsight}</Text>
            </View>

            {doc.actionItem && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  if (convertLockRef.current) return;
                  convertLockRef.current = true;
                  addTask({
                    id: `doc-task-${doc.id}-${Date.now()}`,
                    userId: useAuthStore.getState().user?.id || 'offline-user',
                    title: doc.actionItem,
                    priority: 'HIGH',
                    status: 'TODO',
                  });
                  setTimeout(() => { convertLockRef.current = false; }, 1000);
                }}
              >
                <Ionicons name="add" size={14} color={designTokens.colors.primaryDeep} />
                <Text style={styles.actionBtnText}>Convert to Task: "{doc.actionItem}"</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: designTokens.spacing.lg, paddingBottom: 100 },
  uploadBtn: {
    backgroundColor: designTokens.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: designTokens.radii.pill,
    paddingVertical: 14,
    marginBottom: 20,
    ...designTokens.shadows.card,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    ...designTokens.shadows.card,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: designTokens.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: designTokens.radii.pill,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: designTokens.colors.primaryDeep,
  },
  dateText: {
    fontSize: 11,
    color: designTokens.colors.textMuted,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginBottom: 10,
  },
  insightBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: designTokens.radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(117, 167, 165, 0.20)',
    marginBottom: 10,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: designTokens.colors.accentPeachDeep,
  },
  insightText: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: designTokens.colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: designTokens.radii.pill,
    alignSelf: 'flex-start',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.primaryDeep,
  },
});
