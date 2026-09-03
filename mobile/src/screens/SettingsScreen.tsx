import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
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
    <GradientBackground>
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
            <Text style={styles.changeSemesterText}>Change semester</Text>
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
              <Ionicons name="person-outline" size={18} color={designTokens.colors.primaryDark} style={styles.menuIcon} />
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
              <Ionicons name="shield-checkmark-outline" size={18} color={designTokens.colors.primaryDark} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Manage Credentials</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={handleSyncNow}>
            <View style={styles.menuLeft}>
              <Ionicons name="sync-outline" size={18} color={designTokens.colors.primaryDark} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Sync with Cloud</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Device & Life Controls Group */}
        <Text style={styles.sectionHeader}>Preferences & Device</Text>
        <View style={styles.menuCard}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.toggleTitle}>Quiet Hours Mode</Text>
              <Text style={styles.toggleSub}>Mute non-critical notices from 11 PM to 7 AM</Text>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              trackColor={{ false: '#E6E0D4', true: designTokens.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.toggleTitle}>Floating AI Assistant</Text>
              <Text style={styles.toggleSub}>Quick-access floating gem over other apps</Text>
            </View>
            <Switch
              value={floatingAssistantEnabled}
              onValueChange={setFloatingAssistantEnabled}
              trackColor={{ false: '#E6E0D4', true: designTokens.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Replay Onboarding */}
        {onRestartOnboarding && (
          <TouchableOpacity style={styles.restartBtn} onPress={onRestartOnboarding} activeOpacity={0.82}>
            <Text style={styles.restartBtnText}>Re-open Onboarding Walkthrough</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: designTokens.spacing.lg,
    paddingBottom: 110,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: designTokens.colors.textPrimary,
    marginBottom: 10,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '800',
    color: designTokens.colors.textPrimary,
    marginTop: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  semesterPill: {
    backgroundColor: designTokens.colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: designTokens.radii.pill,
    marginTop: 10,
  },
  semesterText: {
    color: designTokens.colors.primaryDeep,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  changeSemesterText: {
    color: designTokens.colors.primaryDark,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    marginBottom: 16,
    ...designTokens.shadows.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 22,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  chevron: {
    fontSize: 18,
    color: designTokens.colors.textMuted,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(41, 51, 50, 0.06)',
    marginLeft: 50,
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
    color: designTokens.colors.textPrimary,
  },
  toggleSub: {
    fontSize: 11,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  restartBtn: {
    backgroundColor: '#FAF7F2',
    paddingVertical: 14,
    borderRadius: designTokens.radii.pill,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  restartBtnText: {
    color: designTokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
