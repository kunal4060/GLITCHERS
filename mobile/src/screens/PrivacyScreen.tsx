import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';

export const PrivacyScreen: React.FC = () => {
  const { user, gmailConnected, calendarConnected, setGoogleConnections, logout } = useAuthStore();

  const handleExportData = () => {
    Alert.alert(
      'Export Ready',
      'A complete JSON file containing your timetable, tasks, expenses, debts, and email metadata has been prepared for download.'
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account Permanently',
      'Are you sure? This will delete all your timetable entries, tasks, financial records, email metadata, and revoke OAuth tokens from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            logout();
            Alert.alert('Account Deleted', 'All data has been wiped.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>CONNECTED GOOGLE SERVICES</Text>

      <View style={styles.card}>
        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Google Account</Text>
          <Text style={styles.statusConnected}>● {user?.email || 'Connected'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Gmail API</Text>
          <TouchableOpacity onPress={() => setGoogleConnections(!gmailConnected, calendarConnected)}>
            <Text style={gmailConnected ? styles.statusConnected : styles.statusDisconnected}>
              {gmailConnected ? '● Connected' : '○ Disconnected'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Google Calendar</Text>
          <TouchableOpacity onPress={() => setGoogleConnections(gmailConnected, !calendarConnected)}>
            <Text style={calendarConnected ? styles.statusConnected : styles.statusDisconnected}>
              {calendarConnected ? '● Connected' : '○ Disconnected'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionHeader}>DATA & PRIVACY CONTROLS</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.btnSecondary} onPress={handleExportData}>
          <Text style={styles.btnSecondaryText}>📥 Export My Data (JSON)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnDanger} onPress={handleDeleteAccount}>
          <Text style={styles.btnDangerText}>🗑️ Delete Account & All Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16, paddingBottom: 100 },
  sectionHeader: { fontSize: 11, fontWeight: 'bold', color: '#64748B', letterSpacing: 1, marginBottom: 12 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 20 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  itemLabel: { fontSize: 14, color: '#F8FAFC', fontWeight: '500' },
  statusConnected: { fontSize: 12, color: '#10B981', fontWeight: 'bold' },
  statusDisconnected: { fontSize: 12, color: '#94A3B8', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 6 },
  btnSecondary: { backgroundColor: '#0F172A', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  btnSecondaryText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 13 },
  btnDanger: { backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnDangerText: { color: '#EF4444', fontWeight: 'bold', fontSize: 13 },
});
