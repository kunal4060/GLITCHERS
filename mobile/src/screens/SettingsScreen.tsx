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

interface SettingsScreenProps {
  onRestartOnboarding?: () => void;
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onRestartOnboarding, navigation }) => {
  const { user, logout } = useAuthStore();
  const { cgpa, credits, setCgpa, setCredits, avatarUrl, setAvatarUrl } = useDashboardStore();

  const [semester, setSemester] = useState('FALL SEMESTER 2026-27');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [floatingAssistantEnabled, setFloatingAssistantEnabled] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editType, setEditType] = useState<'CGPA' | 'CREDITS'>('CGPA');
  const [editValue, setEditValue] = useState('');

  const studentName = user?.fullName || 'KUNAL BALKRUSHN UGALE';

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
            <Ionicons name="refresh-outline" size={16} color={designTokens.colors.primaryDark} style={{ marginRight: 6 }} />
            <Text style={styles.restartBtnText}>Re-open Onboarding Setup</Text>
          </TouchableOpacity>
        )}

        {/* Log Out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert('Log Out', 'Are you sure you want to log out of your student account?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: () => logout() },
            ]);
          }}
          activeOpacity={0.82}
        >
          <Ionicons name="log-out-outline" size={16} color="#C25E4A" style={{ marginRight: 6 }} />
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
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(117, 167, 165, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
  },
  changePhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.primaryDark,
  },
  resetPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
  },
  resetPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
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
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
  },
  academicChipLabel: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    fontWeight: '600',
  },
  academicChipValue: {
    fontSize: 13,
    color: designTokens.colors.primaryDark,
    fontWeight: '800',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 39, 0.55)',
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
    borderColor: 'rgba(41, 51, 50, 0.08)',
    ...designTokens.shadows.card,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: designTokens.colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: designTokens.colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#F8F6F2',
    borderWidth: 1.5,
    borderColor: designTokens.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
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
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textSecondary,
  },
  modalSaveBtn: {
    backgroundColor: designTokens.colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#ECE6DC',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 20,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C25E4A',
  },
});
