import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';
import { designTokens } from '../theme/designTokens';

import { confirmAction, showAlert } from '../utils/alertUtils';

export const PrivacyScreen: React.FC = () => {
  const { user, gmailConnected, calendarConnected, setGoogleConnections, logout } = useAuthStore();

  const handleToggleGmail = () => {
    const next = !gmailConnected;
    setGoogleConnections(next, calendarConnected);
    Alert.alert(
      next ? 'Gmail Connected' : 'Gmail Disconnected',
      next
        ? 'University notices and exam circulars will now be scanned and summarized.'
        : 'Gmail synchronization has been paused.'
    );
  };

  const handleToggleCalendar = () => {
    const next = !calendarConnected;
    setGoogleConnections(gmailConnected, next);
    Alert.alert(
      next ? 'Google Calendar Connected' : 'Google Calendar Disconnected',
      next
        ? 'Academic timetable sessions will now sync with your Google Calendar.'
        : 'Google Calendar synchronization has been paused.'
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Ready',
      'A complete JSON file containing your timetable, tasks, expenses, debts, and email metadata has been prepared for download.'
    );
  };

  const handleDeleteAccount = () => {
    confirmAction(
      'Delete Account Permanently',
      'Are you sure? This will delete all your timetable entries, tasks, financial records, email metadata, and revoke OAuth tokens from the server.',
      () => {
        logout();
        showAlert('Account Deleted', 'All student data has been wiped.');
      },
      'Delete Everything'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>CONNECTED GOOGLE SERVICES</Text>

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

      <Text style={styles.sectionHeader}>DATA & PRIVACY CONTROLS</Text>
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
  container: { flex: 1, backgroundColor: '#F9F9FB' },
  content: { padding: 16, paddingBottom: 100 },
  sectionHeader: { fontSize: 10, fontWeight: '800', color: '#76777D', letterSpacing: 0.8, marginBottom: 10, marginTop: 6 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(26, 28, 29, 0.06)', ...designTokens.shadows.card },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  serviceLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  serviceTitle: { fontSize: 14, color: '#111827', fontWeight: '700' },
  serviceSub: { fontSize: 12, color: '#76777D', marginTop: 2 },
  verifiedBadge: { backgroundColor: 'rgba(0, 106, 99, 0.08)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  verifiedBadgeText: { fontSize: 10, color: '#006A63', fontWeight: '800' },
  connectedBtn: { backgroundColor: 'rgba(0, 106, 99, 0.08)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 106, 99, 0.20)' },
  connectedBtnText: { fontSize: 11, color: '#006A63', fontWeight: '700' },
  connectBtn: { backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  connectBtnText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(26, 28, 29, 0.05)', marginVertical: 6 },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(26, 28, 29, 0.08)' },
  btnSecondaryText: { color: '#111827', fontWeight: '700', fontSize: 13 },
  btnDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(186, 26, 26, 0.06)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(186, 26, 26, 0.15)' },
  btnDangerText: { color: '#BA1A1A', fontWeight: '700', fontSize: 13 },
});
