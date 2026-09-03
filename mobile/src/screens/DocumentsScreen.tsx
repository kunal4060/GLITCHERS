import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';

export const DocumentsScreen: React.FC = () => {
  const { addTask } = useDashboardStore();

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
            addTask({
              id: String(Date.now()),
              userId: 'u1',
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
                onPress={() =>
                  addTask({
                    id: String(Date.now()),
                    userId: 'u1',
                    title: doc.actionItem,
                    priority: 'HIGH',
                    status: 'TODO',
                  })
                }
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
