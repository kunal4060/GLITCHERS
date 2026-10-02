import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

interface DocItem {
  id: string;
  title: string;
  type: string;
  extractedDeadline?: string | null;
  extractedNotes?: string | null;
  actionItem?: string;
  processed?: boolean;
  createdAt: string;
}

export const DocumentsScreen: React.FC = () => {
  const { addTask } = useDashboardStore();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.fetchDocuments();
      if (res?.documents) setDocs(res.documents);
    } catch {
      /* offline: keep empty, honest */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleUploadDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const file = res.assets[0];
      const isImage = (file.mimeType || '').startsWith('image/');
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.mimeType === 'application/pdf';

      setUploading(true);
      try {
        let fileBase64: string | undefined;
        if (isImage) {
          fileBase64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        const up = await apiClient.uploadDocument({
          title: file.name,
          type: isPdf ? 'PDF' : isImage ? 'Image' : 'File',
          fileBase64,
          mimeType: file.mimeType || undefined,
        });
        if (up?.document) {
          setDocs((prev) => [up.document, ...prev]);
          Alert.alert(
            'Document saved',
            up.document.processed
              ? `AI extracted the key details from "${file.name}".`
              : `"${file.name}" saved. AI extraction runs on image uploads; PDFs are stored as-is.`
          );
        }
      } catch (err: any) {
        Alert.alert('Upload failed', err?.message || 'Could not upload the document.');
      } finally {
        setUploading(false);
      }
    } catch {
      Alert.alert('File Picker', 'Could not open the document picker.');
    }
  };

  const handleConvertToTask = (doc: DocItem) => {
    const currentUserId = useAuthStore.getState().user?.id || 'offline-user';
    addTask({
      id: String(Date.now()),
      userId: currentUserId,
      title: doc.actionItem || `Review ${doc.title}`,
      priority: 'HIGH',
      status: 'TODO',
      dueDate: doc.extractedDeadline ? new Date(doc.extractedDeadline + 'T23:59:00').toISOString() : undefined,
    } as any);
    Alert.alert('Task Created', 'Added to your task list.');
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
          onPress={handleUploadDocument}
          activeOpacity={0.85}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.uploadBtnText}>
            {uploading ? 'Uploading & analyzing…' : 'Upload Circular, PDF, or Notice'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.header}>YOUR DOCUMENTS</Text>

        {loading ? (
          <ActivityIndicator size="large" color={designTokens.colors.primary} style={{ marginTop: 40 }} />
        ) : docs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="folder-open-outline" size={40} color={designTokens.colors.textMuted} />
            <Text style={styles.emptyText}>No documents yet. Upload a circular or notice to get AI-extracted deadlines.</Text>
          </View>
        ) : (
          docs.map((doc) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{doc.type}</Text>
                </View>
                {doc.processed && (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>✨ AI analyzed</Text>
                  </View>
                )}
              </View>

              <Text style={styles.docTitle}>{doc.title}</Text>
              {doc.extractedDeadline && (
                <Text style={styles.deadlineText}>📅 Deadline: {doc.extractedDeadline}</Text>
              )}
              {doc.extractedNotes && (
                <View style={styles.insightBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <Ionicons name="sparkles" size={12} color={designTokens.colors.accentPeachDeep} />
                    <Text style={styles.insightLabel}>AI Extraction</Text>
                  </View>
                  <Text style={styles.insightText}>{doc.extractedNotes}</Text>
                </View>
              )}

              {doc.actionItem && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleConvertToTask(doc)}>
                  <Ionicons name="add" size={14} color={designTokens.colors.primaryDeep} />
                  <Text style={styles.actionBtnText}>Convert to Task: "{doc.actionItem}"</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
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
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: designTokens.colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
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
  aiBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: designTokens.radii.pill,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: designTokens.colors.accentPeachDeep },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginBottom: 10,
  },
  deadlineText: { fontSize: 13, fontWeight: '700', color: designTokens.colors.primaryDeep, marginBottom: 8 },
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
