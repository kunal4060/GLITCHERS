import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { designTokens } from '../theme/designTokens';
import { NiaHeader, LabelCaps } from '../components/nia';

const C = designTokens.colors;

export const PrivacyScreen: React.FC = () => {
  const { user, gmailConnected, calendarConnected, setGoogleConnections, logout } = useAuthStore();

  const handleToggleGmail = async () => {
    const next = !gmailConnected;
    setGoogleConnections(next, calendarConnected);
    // M30: actually pause/resume server-side sync, not just the local flag.
    // Revert the UI if the server rejects it — don't claim a connected state we don't have.
    try {
      await apiClient.updateGoogleServices({ gmailConnected: next, calendarConnected });
    } catch {
      setGoogleConnections(gmailConnected, calendarConnected);
      Alert.alert('Update failed', 'Could not update the Gmail sync setting. Please try again.');
      return;
    }
    Alert.alert(
      next ? 'Gmail Connected' : 'Gmail Disconnected',
      next
        ? 'University notices and exam circulars will now be scanned and summarized.'
        : 'Gmail synchronization has been paused.'
    );
  };

  const handleToggleCalendar = async () => {
    const next = !calendarConnected;
    setGoogleConnections(gmailConnected, next);
    try {
      await apiClient.updateGoogleServices({ gmailConnected, calendarConnected: next });
    } catch {
      setGoogleConnections(gmailConnected, calendarConnected);
      Alert.alert('Update failed', 'Could not update the Calendar sync setting. Please try again.');
      return;
    }
    Alert.alert(
      next ? 'Google Calendar Connected' : 'Google Calendar Disconnected',
      next
        ? 'Academic timetable sessions will now sync with your Google Calendar.'
        : 'Google Calendar synchronization has been paused.'
    );
  };

  const handleExportData = async () => {
    // M29: real export — pull the server-side dump, write a JSON file, open the share sheet.
    try {
      const data = await apiClient.post<any>('/privacy/export-data', {});
      const json = JSON.stringify(data ?? {}, null, 2);
      const uri = (FileSystem.documentDirectory || '') + 'nia-data-export.json';
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json' });
      } else {
        Alert.alert(
          'Export Ready',
          `Exported ${(json.length / 1024).toFixed(1)} KB of your data. Sharing is not available on this device.`
        );
      }
    } catch (err) {
      console.warn('Data export failed:', err);
      Alert.alert('Export failed', 'Could not export your data. Please try again.');
    }
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
          onPress: async () => {
            // H2: actually delete server-side before wiping local state.
            // Only log out + announce success when the server confirms; otherwise stay signed in.
            try {
              await apiClient.deleteAccount();
            } catch (err) {
              console.warn('Server-side account deletion failed:', err);
              Alert.alert('Delete failed', "Couldn't delete server data — try again.");
              return;
            }
            logout();
            Alert.alert('Account Deleted', 'All student data has been wiped.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <NiaHeader title="Privacy" />
      <LabelCaps>CONNECTED GOOGLE SERVICES</LabelCaps>

      <View style={styles.card}>
        <View style={styles.serviceRow}>
          <View style={styles.serviceLeft}>
            <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.serviceTitle}>Google Account</Text>
              <Text style={styles.serviceSub}>{user?.email || 'student@university.edu'}</Text>
            </View>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>● Verified</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.serviceRow}>
          <View style={styles.serviceLeft}>
            <Ionicons name="mail-outline" size={20} color={designTokens.colors.primaryDark} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.serviceTitle}>Gmail API</Text>
              <Text style={styles.serviceSub}>Sync university circulars & deadlines</Text>
            </View>
          </View>
          <TouchableOpacity
            style={gmailConnected ? styles.connectedBtn : styles.connectBtn}
            onPress={handleToggleGmail}
            activeOpacity={0.8}
          >
            <Text style={gmailConnected ? styles.connectedBtnText : styles.connectBtnText}>
              {gmailConnected ? '● Connected' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.serviceRow}>
          <View style={styles.serviceLeft}>
            <Ionicons name="calendar-outline" size={20} color={designTokens.colors.primaryDark} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.serviceTitle}>Google Calendar</Text>
              <Text style={styles.serviceSub}>Push lectures & exams to calendar</Text>
            </View>
          </View>
          <TouchableOpacity
            style={calendarConnected ? styles.connectedBtn : styles.connectBtn}
            onPress={handleToggleCalendar}
            activeOpacity={0.8}
          >
            <Text style={calendarConnected ? styles.connectedBtnText : styles.connectBtnText}>
              {calendarConnected ? '● Connected' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <LabelCaps>DATA & PRIVACY CONTROLS</LabelCaps>
      <View style={styles.card}>
        <TouchableOpacity style={styles.btnSecondary} onPress={handleExportData} activeOpacity={0.8}>
          <Ionicons name="download-outline" size={16} color={designTokens.colors.primaryDark} style={{ marginRight: 8 }} />
          <Text style={styles.btnSecondaryText}>Export My Data (JSON)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnDanger} onPress={handleDeleteAccount} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.btnDangerText}>Delete Account & All Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: C.surfaceCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.surfaceBorder },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  serviceLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  serviceTitle: { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  serviceSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  verifiedBadge: { backgroundColor: C.successSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedBadgeText: { fontSize: 11, color: C.success, fontWeight: '700' },
  connectedBtn: { backgroundColor: C.successSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(15,118,110,0.25)' },
  connectedBtnText: { fontSize: 11, color: C.success, fontWeight: '700' },
  connectBtn: { backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  connectBtnText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.surfaceBorder, marginVertical: 6 },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceSecondary, padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: C.surfaceBorder },
  btnSecondaryText: { color: C.primaryDark, fontWeight: '700', fontSize: 13 },
  btnDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.dangerSoft, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(225,29,72,0.2)' },
  btnDangerText: { color: C.danger, fontWeight: '700', fontSize: 13 },
});
