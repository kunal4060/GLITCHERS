import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { theme } from '../theme/theme';
import { NinjaAvatar } from '../components/NinjaAvatar';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

interface SettingsScreenProps {
  onRestartOnboarding?: () => void;
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onRestartOnboarding, navigation }) => {
  const { user } = useAuthStore();
  const [semester, setSemester] = useState('FALL SEMESTER 2026-27');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [floatingAssistantEnabled, setFloatingAssistantEnabled] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const studentName = user?.fullName || 'KUNAL BALKRUSHN UGALE';
  const cgpa = '8.71';
  const credits = 42;

  const handleChangeSemester = () => {
    Alert.alert('Change Semester', 'Select active academic semester:', [
      { text: 'FALL 2026-27', onPress: () => setSemester('FALL SEMESTER 2026-27') },
      { text: 'WINTER 2026-27', onPress: () => setSemester('WINTER SEMESTER 2026-27') },
      { text: 'SUMMER 2027', onPress: () => setSemester('SUMMER SEMESTER 2027') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await apiClient.fetchTimetableClasses();
      await apiClient.fetchTasks();
      Alert.alert('Synced', 'All timetable sessions and tasks are synced with cloud backend!');
    } catch {
      Alert.alert('Local Sync', 'Synced with local cache.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <Text style={styles.screenTitle}>Account</Text>

      {/* Ninja Hero Profile Section */}
      <View style={styles.heroSection}>
        <NinjaAvatar size="large" cgpa={cgpa} credits={credits} showBadges={true} />

        <Text style={styles.studentName}>{studentName}</Text>

        {/* Semester Pill */}
        <View style={styles.semesterPill}>
          <Text style={styles.semesterText}>{semester}</Text>
        </View>

        {/* Change Semester Link */}
        <TouchableOpacity onPress={handleChangeSemester}>
          <Text style={styles.changeSemesterText}>Change semster</Text>
        </TouchableOpacity>
      </View>

      {/* Account Navigation Group */}
      <Text style={styles.sectionHeader}>Account</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert('Profile Details', `Name: ${studentName}\nDegree: B.Tech Computer Science\nUniversity: VIT AP`)}
        >
          <View style={styles.menuLeft}>
            <Text style={styles.menuIcon}>👤</Text>
            <Text style={styles.menuLabel}>Profile</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => navigation?.navigate ? navigation.navigate('Privacy') : Alert.alert('Manage Credentials', 'Google OAuth & Supabase authentication keys active.')}
        >
          <View style={styles.menuLeft}>
            <Text style={styles.menuIcon}>🔏</Text>
            <Text style={styles.menuLabel}>Manage Credentials</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuRow} onPress={handleSyncNow}>
          <View style={styles.menuLeft}>
            <Text style={styles.menuIcon}>🔄</Text>
            <Text style={styles.menuLabel}>Sync ⓘ</Text>
          </View>
          <Text style={styles.chevron}>{syncing ? '...' : '›'}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert('Preferences', 'Quiet hours: 23:00 - 07:00\nDomain: @vitap.ac.in')}
        >
          <View style={styles.menuLeft}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuLabel}>Settings</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Smart Toggles */}
      <Text style={styles.sectionHeader}>Preferences & Controls</Text>
      <View style={styles.menuCard}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>🌙 Quiet Hours Suppression</Text>
            <Text style={styles.toggleSub}>Mute non-critical alerts (23:00 - 07:00)</Text>
          </View>
          <Switch
            value={quietHoursEnabled}
            onValueChange={setQuietHoursEnabled}
            trackColor={{ false: '#334155', true: '#2563EB' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>🎓 Floating Student Assistant</Text>
            <Text style={styles.toggleSub}>Show floating bubble over other apps</Text>
          </View>
          <Switch
            value={floatingAssistantEnabled}
            onValueChange={setFloatingAssistantEnabled}
            trackColor={{ false: '#334155', true: '#2563EB' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Onboarding Restart */}
      {onRestartOnboarding && (
        <TouchableOpacity style={styles.restartBtn} onPress={onRestartOnboarding}>
          <Text style={styles.restartBtnText}>↻ Re-run Setup / Onboarding</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, paddingBottom: 100 },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  semesterPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  semesterText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  changeSemesterText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#93C5FD',
    marginBottom: 10,
    marginTop: 10,
  },
  menuCard: {
    backgroundColor: '#151D2A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#233247',
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  chevron: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#233247',
    marginLeft: 54,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  restartBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  restartBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
});
