import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { designTokens } from '../theme/designTokens';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { confirmAction } from '../utils/alertUtils';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout, gmailConnected, calendarConnected } = useAuthStore();
  const {
    avatarUrl,
    setAvatarUrl,
    cgpa,
    credits,
    aiMode,
    setAiMode,
  } = useDashboardStore();

  const [quietHours, setQuietHours] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const displayName = user?.fullName || 'Kunal Balkrushn Ugale';
  const regNumber = (user as any)?.registrationNumber || '25BCE7607';
  const studentEmail = user?.email || 'vitapstudent.ac.in';
  const displayCgpa = cgpa || '8.71';
  const displayCredits = credits || 42;

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please allow gallery access to select a profile photo.');
        return;
      }
      setIsUploadingPhoto(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setAvatarUrl(res.assets[0].uri);
        Alert.alert('Photo Updated', 'Your student profile photo has been updated.');
      }
    } catch (err: any) {
      console.warn('Profile photo pick error:', err);
      Alert.alert('Upload Error', err?.message || 'Failed to update photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    confirmAction(
      'Sign Out',
      'Are you sure you want to sign out of your student account?',
      () => logout(),
      'Sign Out'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation?.goBack()}
            accessibilityLabel="Go back"
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={designTokens.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Student Profile & Account</Text>
        </View>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>Fall '26</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Profile Card */}
        <View style={styles.heroCard}>
          {/* Avatar Container with Floating Badges */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGradientRing}>
              <View style={styles.avatarInner}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {displayName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Top-Left Floating Badge: CGPA */}
            <View style={styles.floatingCgpaBadge}>
              <Text style={styles.floatingBadgeNumber}>{displayCgpa}</Text>
              <Text style={styles.floatingBadgeLabel}>CGPA</Text>
            </View>

            {/* Bottom-Right Floating Badge: Credits */}
            <View style={styles.floatingCreditsBadge}>
              <Text style={styles.floatingBadgeNumber}>{displayCredits}</Text>
              <Text style={styles.floatingBadgeLabel}>CREDITS</Text>
            </View>

            {/* Camera Overlay Button */}
            <TouchableOpacity
              style={styles.cameraActionBtn}
              onPress={handlePickPhoto}
              disabled={isUploadingPhoto}
              activeOpacity={0.85}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Student Identification */}
          <Text style={styles.studentNameText}>{displayName.toUpperCase()}</Text>
          <View style={styles.regPill}>
            <Text style={styles.regPillPrefix}>REG:</Text>
            <Text style={styles.regPillValue}>{regNumber}</Text>
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            style={styles.uploadPhotoBtn}
            onPress={handlePickPhoto}
            activeOpacity={0.82}
          >
            <Ionicons name="image-outline" size={15} color={designTokens.colors.textSecondary} />
            <Text style={styles.uploadPhotoBtnText}>Upload Photo from Gallery</Text>
          </TouchableOpacity>

          {/* Academic Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricIconBoxAmber}>
                <Ionicons name="school" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.metricLabel}>CGPA</Text>
                <Text style={styles.metricValue}>{displayCgpa}</Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconBoxTeal}>
                <Ionicons name="ribbon" size={16} color="#006A63" />
              </View>
              <View>
                <Text style={styles.metricLabel}>EARNED</Text>
                <Text style={styles.metricValue}>{displayCredits} Credits</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Academic Details Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>ACADEMIC AFFILIATION</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="business-outline" size={18} color={designTokens.colors.textSecondary} />
              <Text style={styles.infoLabel}>University Domain</Text>
            </View>
            <Text style={styles.infoValue}>{studentEmail}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="code-slash-outline" size={18} color={designTokens.colors.textSecondary} />
              <Text style={styles.infoLabel}>Specialization</Text>
            </View>
            <Text style={styles.infoValue}>CSE Specialization</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="layers-outline" size={18} color={designTokens.colors.textSecondary} />
              <Text style={styles.infoLabel}>Current Term</Text>
            </View>
            <Text style={styles.infoValue}>Semester 3 (Autumn '26)</Text>
          </View>
        </View>

        {/* Academic Suite & Platform Modules */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>ACADEMIC SUITE & TOOLS</Text>

          <TouchableOpacity
            style={styles.navRowItem}
            onPress={() => navigation?.navigate('Attendance')}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconBox, { backgroundColor: 'rgba(0, 106, 99, 0.08)' }]}>
                <Ionicons name="school-outline" size={18} color="#006A63" />
              </View>
              <View>
                <Text style={styles.navRowTitle}>Attendance & Bunk Advisor</Text>
                <Text style={styles.navRowSubtitle}>Track 75% thresholds & safe bunks</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#76777D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRowItem}
            onPress={() => navigation?.navigate('Exams')}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconBox, { backgroundColor: 'rgba(186, 26, 26, 0.08)' }]}>
                <Ionicons name="calendar-outline" size={18} color="#BA1A1A" />
              </View>
              <View>
                <Text style={styles.navRowTitle}>Exams & Assignments</Text>
                <Text style={styles.navRowSubtitle}>Midterms, lab submissions & deadlines</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#76777D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRowItem}
            onPress={() => navigation?.navigate('Docs')}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconBox, { backgroundColor: 'rgba(30, 58, 138, 0.08)' }]}>
                <Ionicons name="document-text-outline" size={18} color="#1E3A8A" />
              </View>
              <View>
                <Text style={styles.navRowTitle}>Document Intelligence</Text>
                <Text style={styles.navRowSubtitle}>Analyzed syllabi, PDFs & circulars</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#76777D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRowItem}
            onPress={() => navigation?.navigate('Calendar')}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconBox, { backgroundColor: 'rgba(147, 51, 234, 0.08)' }]}>
                <Ionicons name="today-outline" size={18} color="#9333EA" />
              </View>
              <View>
                <Text style={styles.navRowTitle}>Academic Calendar</Text>
                <Text style={styles.navRowSubtitle}>Google Calendar synchronized feed</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#76777D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRowItem}
            onPress={() => navigation?.navigate('Privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconBox, { backgroundColor: 'rgba(75, 85, 99, 0.08)' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#4B5563" />
              </View>
              <View>
                <Text style={styles.navRowTitle}>Privacy & Data Protection</Text>
                <Text style={styles.navRowSubtitle}>OAuth scopes & zero-ad profiling</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#76777D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRowItem}
            onPress={() => navigation?.navigate('Settings')}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconBox, { backgroundColor: 'rgba(17, 24, 39, 0.08)' }]}>
                <Ionicons name="settings-outline" size={18} color="#111827" />
              </View>
              <View>
                <Text style={styles.navRowTitle}>Account & System Settings</Text>
                <Text style={styles.navRowSubtitle}>Edit CGPA, academic targets & defaults</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#76777D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navRowItem, { borderBottomWidth: 0 }]}
            onPress={() => {
              confirmAction(
                'Re-run Setup Wizard',
                'Do you want to re-open the onboarding process to update your university, timetable, and budget preferences?',
                () => {
                  useAuthStore.getState().resetOnboarding();
                  navigation?.navigate('Onboarding');
                },
                'Open Setup Wizard'
              );
            }}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconBox, { backgroundColor: 'rgba(0, 106, 99, 0.12)' }]}>
                <Ionicons name="refresh-outline" size={18} color="#006A63" />
              </View>
              <View>
                <Text style={styles.navRowTitle}>Re-run Onboarding Wizard</Text>
                <Text style={styles.navRowSubtitle}>Re-configure university, timetable & services</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#76777D" />
          </TouchableOpacity>
        </View>

        {/* AI Engine & System Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>INTELLIGENCE ENGINE & PREFERENCES</Text>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>AI Processing Mode</Text>
              <Text style={styles.settingDesc}>
                {aiMode === 'OFFLINE'
                  ? 'On-Device Private Hugging Face Engine'
                  : aiMode === 'CLOUD'
                  ? 'Cloud Google Gemini 1.5 Flash'
                  : 'Auto Hybrid (Offline First + Cloud Cascade)'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modeToggleBtn}
              onPress={() => {
                const nextMode = aiMode === 'AUTO' ? 'OFFLINE' : aiMode === 'OFFLINE' ? 'CLOUD' : 'AUTO';
                setAiMode(nextMode);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeToggleBtnText}>{aiMode}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Quiet Hours (11:00 PM – 7:00 AM)</Text>
              <Text style={styles.settingDesc}>Mutes routine notifications during sleep & study hours.</Text>
            </View>
            <Switch
              value={quietHours}
              onValueChange={setQuietHours}
              trackColor={{ false: '#E2E2E4', true: designTokens.colors.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Google Identity & Services</Text>
              <Text style={styles.settingDesc}>
                {gmailConnected && calendarConnected ? 'Gmail & Academic Calendar connected' : 'Google account linked'}
              </Text>
            </View>
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={15} color="#006A63" />
              <Text style={styles.connectedBadgeText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#BA1A1A" style={{ marginRight: 6 }} />
          <Text style={styles.logoutBtnText}>Sign Out from NEXA</Text>
        </TouchableOpacity>

        {/* Ideation Credit */}
        <View style={styles.creditBox}>
          <Text style={styles.creditText}>Ideated by Kartiki More</Text>
          <Text style={styles.creditSubText}>NEXA / NIA Academic OS • Build 1.0.4</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 226, 228, 0.6)',
    backgroundColor: 'rgba(249, 249, 251, 0.95)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006A63',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006A63',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarGradientRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    padding: 3,
    backgroundColor: '#006A63',
    shadowColor: '#006A63',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#F3F3F5',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#141B2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingCgpaBadge: {
    position: 'absolute',
    top: -2,
    left: -8,
    backgroundColor: '#D97706',
    borderRadius: 9999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  floatingCreditsBadge: {
    position: 'absolute',
    bottom: -2,
    right: -8,
    backgroundColor: '#1D4ED8',
    borderRadius: 9999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  floatingBadgeNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  floatingBadgeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  cameraActionBtn: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1C1D',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  regPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F3F5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 12,
  },
  regPillPrefix: {
    fontSize: 11,
    fontWeight: '700',
    color: '#76777D',
  },
  regPillValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1C1D',
    fontFamily: 'monospace',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E2E2E4',
    marginBottom: 16,
  },
  uploadPhotoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#45464C',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#EEEEF0',
  },
  metricIconBoxAmber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconBoxTeal: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 106, 99, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F5',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#45464C',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#1A1C1D',
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F5',
    gap: 12,
  },
  settingTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1A1C1D',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 11.5,
    color: '#76777D',
    lineHeight: 16,
  },
  modeToggleBtn: {
    backgroundColor: '#F3F3F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E2E4',
  },
  modeToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006A63',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006A63',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.25)',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  navRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 28, 29, 0.06)',
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  navRowSubtitle: {
    fontSize: 11,
    color: '#76777D',
    marginTop: 1,
  },
  creditBox: {
    alignItems: 'center',
    marginTop: 12,
  },
  creditText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#76777D',
  },
  creditSubText: {
    fontSize: 10,
    color: '#9E9EA4',
    marginTop: 2,
  },
});
