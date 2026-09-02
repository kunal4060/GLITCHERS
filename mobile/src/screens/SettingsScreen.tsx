import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { useFloatingStore } from '../store/floatingStore';

export const SettingsScreen: React.FC<{ onRestartOnboarding?: () => void }> = ({ onRestartOnboarding }) => {
  const { user, setUser, logout } = useAuthStore();
  const { isBubbleVisible, setBubbleVisible } = useFloatingStore();

  const [universityDomain, setUniversityDomain] = useState('university.edu');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('23:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [criticalBypass, setCriticalBypass] = useState(true);

  const handleSavePreferences = () => {
    Alert.alert('Preferences Saved', 'Academic email filter and Quiet Hours updated successfully.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Summary Card */}
      <Text style={styles.sectionHeader}>STUDENT PROFILE</Text>
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'K'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nameText}>{user?.fullName || 'Student'}</Text>
            <Text style={styles.emailText}>{user?.email || 'student@university.edu'}</Text>
            <Text style={styles.deptText}>
              {user?.course || 'Computer Science'} • Sem {user?.semester || 6}
            </Text>
          </View>
        </View>
      </View>

      {/* Floating Assistant Control */}
      <Text style={styles.sectionHeader}>FLOATING ASSISTANT (SYSTEM OVERLAY)</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Enable Floating Bubble (🎓)</Text>
            <Text style={styles.switchDesc}>
              Draws a floating widget over other applications for quick access to schedule, finance, tasks, and AI.
            </Text>
          </View>
          <Switch
            value={isBubbleVisible}
            onValueChange={setBubbleVisible}
            trackColor={{ false: theme.colors.surfaceBorder, true: theme.colors.primary }}
          />
        </View>
      </View>

      {/* University Domain Filter */}
      <Text style={styles.sectionHeader}>ACADEMIC EMAIL INTELLIGENCE</Text>
      <View style={styles.card}>
        <Text style={styles.inputLabel}>University Email Domain</Text>
        <TextInput
          style={styles.input}
          value={universityDomain}
          onChangeText={setUniversityDomain}
          placeholder="university.edu"
          placeholderTextColor="#64748B"
        />
        <Text style={styles.helperText}>
          Only messages from this domain are processed for timetable changes, circulars, and exam notices.
        </Text>
      </View>

      {/* Quiet Hours & Smart Reminders */}
      <Text style={styles.sectionHeader}>QUIET HOURS & STUDY TIME</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Enable Quiet Hours</Text>
            <Text style={styles.switchDesc}>Mutes non-critical reminders during study and sleep time.</Text>
          </View>
          <Switch
            value={quietHoursEnabled}
            onValueChange={setQuietHoursEnabled}
            trackColor={{ false: theme.colors.surfaceBorder, true: theme.colors.primary }}
          />
        </View>

        {quietHoursEnabled && (
          <View style={styles.timeSettings}>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={quietStart}
                  onChangeText={setQuietStart}
                  placeholder="23:00"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>End Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={quietEnd}
                  onChangeText={setQuietEnd}
                  placeholder="07:00"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={[styles.switchRow, { marginTop: 12 }]}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Critical Alert Bypass</Text>
                <Text style={styles.switchDesc}>Allow same-day exam or rescheduled class alerts to sound.</Text>
              </View>
              <Switch
                value={criticalBypass}
                onValueChange={setCriticalBypass}
                trackColor={{ false: theme.colors.surfaceBorder, true: theme.colors.primary }}
              />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSavePreferences}>
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </View>

      {/* Onboarding & Session Actions */}
      <Text style={styles.sectionHeader}>SETUP & ACCOUNT</Text>
      <View style={styles.card}>
        {onRestartOnboarding && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onRestartOnboarding}>
            <Text style={styles.secondaryBtnText}>🔄 Replay Onboarding Walkthrough</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.dangerBtn} onPress={() => logout()}>
          <Text style={styles.dangerBtnText}>🚪 Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 100 },
  sectionHeader: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 10, marginTop: 12 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary },
  profileInfo: { flex: 1 },
  nameText: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text },
  emailText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  deptText: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchTextCol: { flex: 1, paddingRight: 12 },
  switchTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  switchDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 16 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  helperText: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6 },
  timeSettings: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.colors.surfaceBorder },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 4 },
  timeInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 8,
    padding: 10,
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: '#0B0F19', fontWeight: 'bold', fontSize: 13 },
  secondaryBtn: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 },
  dangerBtn: {
    backgroundColor: theme.colors.dangerGlow,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: { color: theme.colors.danger, fontWeight: 'bold', fontSize: 13 },
});
