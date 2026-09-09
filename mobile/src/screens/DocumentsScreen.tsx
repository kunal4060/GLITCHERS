import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';

export const DocumentsScreen: React.FC = () => {
  const { addTask } = useDashboardStore();
  const [isUploading, setIsUploading] = useState(false);

  const [docList, setDocList] = useState([
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
  ]);

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const fileName = file.name || 'Document.pdf';
      setIsUploading(true);

      // Simulate Gemini intelligence extraction
      setTimeout(() => {
        setIsUploading(false);
        const cleanName = fileName.replace(/\.[^/.]+$/, '');
        const newDoc = {
          id: 'doc_' + Date.now(),
          title: fileName,
          type: fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Notice',
          date: 'Just now',
          extractedInsight: `Gemini extracted: Key submission deadline identified for ${cleanName}. Weighting 25%.`,
          actionItem: `Complete ${cleanName} Requirements`,
        };

        setDocList((prev) => [newDoc, ...prev]);

        Alert.alert(
          'Document Uploaded & Parsed',
          `Gemini analyzed "${fileName}" and extracted action items.`,
          [
            {
              text: 'Add Extracted Task',
              onPress: () => {
                const currentUserId = useAuthStore.getState().user?.id || 'offline-user';
                addTask({
                  id: String(Date.now()),
                  userId: currentUserId,
                  title: `Complete ${cleanName} Requirements`,
                  priority: 'HIGH',
                  status: 'TODO',
                  dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
                });
                Alert.alert('Task Created', 'Added to your task list with automated reminders.');
              },
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      }, 600);
    } catch (error) {
      console.warn('Doc picker error:', error);
      Alert.alert('Upload Error', 'Could not open document picker. Please try again.');
    }
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={styles.topHeaderDot} />
            <Text style={styles.topHeaderTag}>DOCUMENT INTELLIGENCE</Text>
          </View>
          <Text style={styles.screenTitle}>Academic Documents</Text>
          <Text style={styles.screenSub}>AI-parsed syllabi, circulars, and official university notices</Text>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={handleUploadDocument}
          activeOpacity={0.85}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="document-text" size={16} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Upload Circular or Syllabus PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.header}>ANALYZED UNIVERSITY REPOSITORIES</Text>

        {docList.map((doc) => (
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
                <Ionicons name="sparkles" size={12} color="#006A63" />
                <Text style={styles.insightLabel}>NIA INSIGHT EXTRACTION</Text>
              </View>
              <Text style={styles.insightText}>{doc.extractedInsight}</Text>
            </View>

            {doc.actionItem && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  addTask({
                    id: String(Date.now()),
                    userId: useAuthStore.getState().user?.id || 'offline-user',
                    title: doc.actionItem,
                    priority: 'HIGH',
                    status: 'TODO',
                  });
                  Alert.alert('Task Created', `"${doc.actionItem}" added to your Tasks.`);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={14} color="#006A63" />
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
  topHeader: { marginBottom: 16 },
  topHeaderDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#006A63' },
  topHeaderTag: { fontSize: 10, fontWeight: '800', color: '#76777D', letterSpacing: 0.8 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  screenSub: { fontSize: 12, color: '#76777D', marginTop: 3 },
  uploadBtn: {
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: designTokens.radii.pill,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#111827',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  header: {
    fontSize: 10,
    fontWeight: '800',
    color: '#76777D',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    ...designTokens.shadows.card,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006A63',
    letterSpacing: 0.4,
  },
  dateText: {
    fontSize: 11,
    color: '#76777D',
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  insightBox: {
    backgroundColor: 'rgba(0, 106, 99, 0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.12)',
    marginBottom: 10,
  },
  insightLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#006A63',
    letterSpacing: 0.6,
  },
  insightText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: designTokens.radii.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.15)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006A63',
  },
});
