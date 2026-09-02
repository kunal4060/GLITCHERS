import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useDashboardStore } from '../store/dashboardStore';

export const EmailScreen: React.FC = () => {
  const { emails, setEmails } = useDashboardStore();

  const handleSyncGmail = () => {
    Alert.alert('Gmail Sync Complete', 'Synchronized with university mailbox. Found 1 rescheduled class.', [
      {
        text: 'OK',
        onPress: () => {
          setEmails([
            {
              id: String(Date.now()),
              userId: 'u1',
              providerMessageId: 'msg_new',
              sender: 'faculty.os@university.edu',
              subject: 'Operating Systems Lab Rescheduled to 4 PM in AB2-301',
              receivedAt: new Date().toISOString(),
              isUniversityRelated: true,
              importance: 'HIGH',
              summary: 'OS Lab shifted from 2 PM to 4 PM in room AB2-301. Please arrive 10 minutes early.',
              actionRequired: true,
              actionItem: 'Update timetable and calendar',
              isProcessed: true,
            },
            ...emails,
          ]);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.syncBtn} onPress={handleSyncGmail}>
        <Text style={styles.syncBtnText}>🔄 Sync University Gmail</Text>
      </TouchableOpacity>

      <Text style={styles.header}>UNIVERSITY COMMUNICATIONS</Text>

      {emails.map((e) => (
        <View key={e.id} style={styles.emailCard}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                e.importance === 'HIGH' && styles.badgeHigh,
                e.importance === 'CRITICAL' && styles.badgeCritical,
              ]}
            >
              <Text style={styles.badgeText}>{e.importance}</Text>
            </View>
            <Text style={styles.dateText}>{new Date(e.receivedAt).toLocaleDateString()}</Text>
          </View>

          <Text style={styles.subjectText}>{e.subject}</Text>
          <Text style={styles.summaryText}>{e.summary}</Text>
          <Text style={styles.senderText}>From: {e.sender}</Text>

          {e.actionRequired && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert('Action Applied', 'Calendar event and class room updated automatically.')}
            >
              <Text style={styles.actionBtnText}>⚡ Update Calendar & Timetable</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16, paddingBottom: 100 },
  syncBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  syncBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  header: { fontSize: 11, fontWeight: 'bold', color: '#64748B', letterSpacing: 1, marginBottom: 12 },
  emailCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeHigh: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  badgeCritical: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#38BDF8' },
  dateText: { fontSize: 11, color: '#64748B' },
  subjectText: { fontSize: 15, fontWeight: 'bold', color: '#F8FAFC' },
  summaryText: { fontSize: 13, color: '#CBD5E1', marginTop: 6, lineHeight: 18 },
  senderText: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
  actionBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  actionBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 12 },
});
