import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { NinjaAvatar } from '../components/NinjaAvatar';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { apiClient } from '../api/client';
import { confirmAction } from '../utils/alertUtils';

interface SettingsScreenProps {
  onRestartOnboarding?: () => void;
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onRestartOnboarding, navigation }) => {
  const { user, logout } = useAuthStore();
  const { cgpa, credits, setCgpa, setCredits, avatarUrl, setAvatarUrl, syncWithBackend } = useDashboardStore();

  const [semester, setSemester] = useState('FALL SEMESTER 2026-27');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [floatingAssistantEnabled, setFloatingAssistantEnabled] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editType, setEditType] = useState<'CGPA' | 'CREDITS'>('CGPA');
  const [editValue, setEditValue] = useState('');

  const studentName = user?.fullName || 'Student User';

  const handlePickImageFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant access to your photo library to pick a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
        Alert.alert('Profile Updated', 'Your profile picture has been updated from your gallery!');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open photo gallery.');
    }
  };

  const handleResetAvatar = () => {
    setAvatarUrl(null);
    Alert.alert('Avatar Reset', 'Restored to default avatar character.');
  };

  const handleOpenEditCgpa = () => {
    setEditType('CGPA');
    setEditValue(cgpa);
    setModalVisible(true);
  };

  const handleOpenEditCredits = () => {
    setEditType('CREDITS');
    setEditValue(String(credits));
    setModalVisible(true);
  };

  const handleSaveAcademics = () => {
    const val = editValue.trim();
    if (editType === 'CGPA') {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 10) {
        Alert.alert('Invalid CGPA', 'Please enter a valid CGPA between 0.00 and 10.00');
        return;
      }
      setCgpa(num.toFixed(2));
    } else {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0 || num > 300) {
        Alert.alert('Invalid Credits', 'Please enter a valid credit count (e.g. 42)');
        return;
      }
      setCredits(num);
    }
    setModalVisible(false);
  };

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
      await syncWithBackend();
      Alert.alert('Synced', 'All timetable sessions, tasks, and finances are synchronized with cloud backend!');
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
          <NinjaAvatar
            size="large"
            cgpa={cgpa}
            credits={credits}
            showBadges={true}
            customImageUri={avatarUrl}
            onPressAvatar={handlePickImageFromGallery}
            onPressCgpa={handleOpenEditCgpa}
            onPressCredits={handleOpenEditCredits}
          />

          <Text style={styles.studentName}>{studentName}</Text>

          {/* Change Photo / Gallery Action Button */}
          <View style={styles.photoActionRow}>
            <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickImageFromGallery} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={15} color={designTokens.colors.primaryDark} />
              <Text style={styles.changePhotoBtnText}>
                {avatarUrl ? 'Change from Gallery' : 'Upload Photo from Gallery'}
              </Text>
            </TouchableOpacity>

            {avatarUrl ? (
              <TouchableOpacity style={styles.resetPhotoBtn} onPress={handleResetAvatar} activeOpacity={0.7}>
                <Ionicons name="refresh-outline" size={14} color="#B91C1C" />
                <Text style={styles.resetPhotoBtnText}>Reset</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Academic Edit Bar */}
          <View style={styles.academicChipsRow}>
            <TouchableOpacity style={styles.academicChip} onPress={handleOpenEditCgpa} activeOpacity={0.7}>
              <Ionicons name="school-outline" size={14} color={designTokens.colors.primaryDark} />
              <Text style={styles.academicChipLabel}>CGPA: <Text style={styles.academicChipValue}>{cgpa}</Text> ✎</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.academicChip} onPress={handleOpenEditCredits} activeOpacity={0.7}>
              <Ionicons name="ribbon-outline" size={14} color={designTokens.colors.primaryDark} />
              <Text style={styles.academicChipLabel}>Credits: <Text style={styles.academicChipValue}>{credits}</Text> ✎</Text>
            </TouchableOpacity>
          </View>

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
            onPress={() => Alert.alert(
              'Student Profile',
              `Name: ${studentName}\nEmail: ${user?.email || 'student@university.edu'}\nCourse: ${user?.course || 'Computer Science'}\nUniversity: ${user?.university || 'University'}\nYear / Semester: Year ${user?.year || 3}, Sem ${user?.semester || 6}`
            )}
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
              <Text style={styles.toggleTitle}>Floating AI Assistant (NIA)</Text>
              <Text style={styles.toggleSub}>Quick-access NIA floating gem over other apps</Text>
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
        <TouchableOpacity
          style={styles.restartBtn}
          onPress={() => {
            confirmAction(
              'Re-open Onboarding',
              'Do you want to re-open the setup wizard to update your university, timetable, and budget preferences?',
              () => {
                if (onRestartOnboarding) {
                  onRestartOnboarding();
                } else {
                  useAuthStore.getState().resetOnboarding();
                  if (navigation?.navigate) {
                    navigation.navigate('Onboarding');
                  }
                }
              },
              'Open Setup Wizard'
            );
          }}
          activeOpacity={0.82}
        >
          <Ionicons name="refresh-outline" size={16} color={designTokens.colors.primaryDark} style={{ marginRight: 6 }} />
          <Text style={styles.restartBtnText}>Re-open Onboarding Setup</Text>
        </TouchableOpacity>

        {/* Log Out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            confirmAction(
              'Log Out',
              'Are you sure you want to log out of your student account?',
              () => logout(),
              'Log Out'
            );
          }}
          activeOpacity={0.82}
        >
          <Ionicons name="log-out-outline" size={16} color="#BA1A1A" style={{ marginRight: 6 }} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit CGPA / Credits Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editType === 'CGPA' ? 'Edit CGPA' : 'Edit Credits'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {editType === 'CGPA'
                ? 'Enter your current cumulative GPA (0.00 – 10.00)'
                : 'Enter your total completed academic credits'}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="decimal-pad"
              autoFocus
              placeholder={editType === 'CGPA' ? '8.71' : '42'}
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveAcademics}
              >
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
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
    color: '#111827',
    marginTop: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  photoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
  },
  changePhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  resetPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(186, 26, 26, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
  },
  resetPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  academicChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  academicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
  },
  academicChipLabel: {
    fontSize: 12,
    color: '#76777D',
    fontWeight: '600',
  },
  academicChipValue: {
    fontSize: 13,
    color: '#006A63',
    fontWeight: '800',
  },
  semesterPill: {
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: designTokens.radii.pill,
    marginTop: 10,
  },
  semesterText: {
    color: '#006A63',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  changeSemesterText: {
    color: '#006A63',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#76777D',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
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
    color: '#111827',
  },
  chevron: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(26, 28, 29, 0.05)',
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
    color: '#111827',
  },
  toggleSub: {
    fontSize: 11,
    color: '#76777D',
    marginTop: 2,
  },
  restartBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: designTokens.radii.pill,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
  },
  restartBtnText: {
    color: '#76777D',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    ...designTokens.shadows.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#76777D',
    marginBottom: 18,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#F9F9FB',
    borderWidth: 1.5,
    borderColor: '#006A63',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#76777D',
  },
  modalSaveBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: designTokens.radii.pill,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(186, 26, 26, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.15)',
    borderRadius: designTokens.radii.pill,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 20,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BA1A1A',
  },
});
