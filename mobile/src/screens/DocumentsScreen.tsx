import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../theme/theme';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadDocument}>
        <Text style={styles.uploadBtnText}>📄 Upload Circular, PDF, or Notice</Text>
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
            <Text style={styles.insightLabel}>💡 AI Extraction:</Text>
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
              <Text style={styles.actionBtnText}>+ Convert to Task: "{doc.actionItem}"</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 100 },
  uploadBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    ...theme.shadow,
  },
  uploadBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  header: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  docCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badge: { backgroundColor: theme.colors.surfaceSubtle, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  dateText: { color: theme.colors.textMuted, fontSize: 11 },
  docTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  insightBox: { backgroundColor: theme.colors.surfaceSubtle, borderRadius: 10, padding: 10, marginVertical: 10 },
  insightLabel: { fontSize: 11, color: theme.colors.primary, fontWeight: 'bold' },
  insightText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 16 },
  actionBtn: {
    backgroundColor: theme.colors.primaryGlow,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: { color: theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
});
