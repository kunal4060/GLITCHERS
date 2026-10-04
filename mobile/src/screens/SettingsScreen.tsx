import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { designTokens } from '../theme/designTokens';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { NiaHeader, LabelCaps, StatusPill } from '../components/nia';
import { initials } from '../utils/niaFormat';

const C = designTokens.colors;

interface SettingsScreenProps {
  onRestartOnboarding?: () => void;
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onRestartOnboarding, navigation }) => {
  const { user, logout } = useAuthStore();
  const {
    cgpa,
    credits,
    setCgpa,
    setCredits,
    avatarUrl,
    setAvatarUrl,
    syncWithBackend,
    quietHours,
    setQuietHours,
  } = useDashboardStore();

  const [semester, setSemester] = useState('SEMESTER 5');
  const [floatingAssistantEnabled, setFloatingAssistantEnabled] = useState(true);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [proactiveTips, setProactiveTips] = useState(true);
  const [chatStyle, setChatStyle] = useState<'concise' | 'detailed'>('concise');
  const [syncing, setSyncing] = useState(false);

  // H50: persist settings — they were plain useState and lost on restart
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@nexa/settings');
        if (raw) {
          const s = JSON.parse(raw);
          if (s.semester) setSemester(s.semester);
          if (typeof s.floatingAssistantEnabled === 'boolean') setFloatingAssistantEnabled(s.floatingAssistantEnabled);
          if (typeof s.voiceReplies === 'boolean') setVoiceReplies(s.voiceReplies);
          if (typeof s.proactiveTips === 'boolean') setProactiveTips(s.proactiveTips);
          if (s.chatStyle === 'concise' || s.chatStyle === 'detailed') setChatStyle(s.chatStyle);
        }
      } catch { /* defaults stand */ }
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem('@nexa/settings', JSON.stringify({
      semester, floatingAssistantEnabled, voiceReplies, proactiveTips, chatStyle,
    })).catch(() => null);
  }, [semester, floatingAssistantEnabled, voiceReplies, proactiveTips, chatStyle]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editType, setEditType] = useState<'CGPA' | 'CREDITS'>('CGPA');
  const [editValue, setEditValue] = useState('');

  const studentName = user?.fullName || 'Student User';
  const studentId = (user as any)?.studentId || (user as any)?.rollNumber || 'NEXA-STUDENT';

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
      if (!result.canceled && result.assets?.[0]) {
        setAvatarUrl(result.assets[0].uri);
        Alert.alert('Profile Updated', 'Your profile picture has been updated.');
      }
    } catch {
      Alert.alert('Error', 'Could not open photo gallery.');
    }
  };

  const handleResetAvatar = () => {
    setAvatarUrl(null);
    Alert.alert('Avatar Reset', 'Restored to your initials avatar.');
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
      { text: 'Semester 3', onPress: () => setSemester('SEMESTER 3') },
      { text: 'Semester 4', onPress: () => setSemester('SEMESTER 4') },
      { text: 'Semester 5', onPress: () => setSemester('SEMESTER 5') },
      { text: 'Semester 6', onPress: () => setSemester('SEMESTER 6') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncWithBackend();
      Alert.alert('Synced', 'All timetable sessions, tasks, and finances are synchronized with the cloud backend!');
    } catch {
      Alert.alert('Local Sync', 'Synced with local cache.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your student account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const Row = ({ icon, label, onPress, danger, right }: { icon: string; label: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7} disabled={!onPress && !right}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIcon, danger && { backgroundColor: C.terracottaSoft }]}>
          <Ionicons name={icon as any} size={17} color={danger ? C.terracotta : C.obsidian} />
        </View>
        <Text style={[styles.menuLabel, danger && { color: C.terracotta }]}>{label}</Text>
      </View>
      {right || (onPress && <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />)}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <NiaHeader title="Account" navigation={navigation} />

          {/* Cover / identity banner */}
          <View style={styles.cover}>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarInit}>
                  <Text style={styles.avatarInitText}>{initials(studentName)}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.avatarEdit} onPress={handlePickImageFromGallery} activeOpacity={0.8}>
                <Ionicons name="pencil" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.name}>{studentName}</Text>
            <Text style={styles.idLine}>{studentId} • NEXA ACADEMIC</Text>
            <Text style={styles.courseLine}>
              {[user?.course || 'B.Tech CSE', user?.university || 'VIT-AP'].filter(Boolean).join(' • ')}
            </Text>
            <View style={styles.metaRow}>
              <StatusPill label={semester} tone="neutral" />
              <StatusPill label={proactiveTips ? 'NIA Tips On' : 'NIA Tips Off'} tone={proactiveTips ? 'success' : 'neutral'} />
            </View>
          </View>

          {/* Academic profile */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Academic Profile</Text>
            <LabelCaps>Synced</LabelCaps>
          </View>
          <View style={styles.card}>
            <Row icon="school-outline" label={`CGPA: ${cgpa}`} onPress={handleOpenEditCgpa}
              right={<Text style={styles.editLink}>EDIT</Text>} />
            <View style={styles.divider} />
            <Row icon="ribbon-outline" label={`Total Credits: ${credits}`} onPress={handleOpenEditCredits}
              right={<Text style={styles.editLink}>EDIT</Text>} />
            <View style={styles.divider} />
            <Row icon="calendar-outline" label={`Semester: ${semester}`} onPress={handleChangeSemester}
              right={<Ionicons name="chevron-down" size={16} color={C.textSubtle} />} />
            <View style={styles.divider} />
            <Row
              icon="images-outline"
              label={avatarUrl ? 'Change Profile Picture' : 'Upload Profile Picture'}
              onPress={handlePickImageFromGallery}
              right={avatarUrl ? (
                <TouchableOpacity onPress={handleResetAvatar} activeOpacity={0.7}>
                  <Text style={[styles.editLink, { color: C.terracotta }]}>RESET</Text>
                </TouchableOpacity>
              ) : undefined}
            />
          </View>

          {/* AI preferences */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>AI Preferences</Text>
            <LabelCaps>NIA</LabelCaps>
          </View>
          <View style={styles.card}>
            <Row
              icon="chatbubble-ellipses-outline"
              label="Chat Style"
              right={
                <View style={styles.segment}>
                  {(['concise', 'detailed'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.segBtn, chatStyle === s && styles.segBtnActive]}
                      onPress={() => setChatStyle(s)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.segText, chatStyle === s && styles.segTextActive]}>
                        {s === 'concise' ? 'Concise' : 'Detailed'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
            <View style={styles.divider} />
            <Row
              icon="volume-medium-outline"
              label="Voice Replies"
              right={
                <Switch value={voiceReplies} onValueChange={setVoiceReplies}
                  trackColor={{ false: '#E4E4EA', true: C.eucalyptus }} thumbColor="#FFFFFF" />
              }
            />
            <View style={styles.divider} />
            <Row
              icon="sparkles-outline"
              label="Proactive Tips"
              right={
                <Switch value={proactiveTips} onValueChange={setProactiveTips}
                  trackColor={{ false: '#E4E4EA', true: C.eucalyptus }} thumbColor="#FFFFFF" />
              }
            />
          </View>

          {/* Notifications */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <LabelCaps>In-app</LabelCaps>
          </View>
          <View style={styles.card}>
            <Row
              icon="moon-outline"
              label="Quiet Hours"
              right={
                <Switch value={quietHours} onValueChange={setQuietHours}
                  trackColor={{ false: '#E4E4EA', true: C.eucalyptus }} thumbColor="#FFFFFF" />
              }
            />
            <Text style={styles.rowHint}>
              {quietHours
                ? 'On — non-critical notices are muted between 11 PM and 7 AM.'
                : 'Off — notices arrive as usual, day and night.'}
            </Text>
            <View style={styles.divider} />
            <Row icon="notifications-outline" label="All Notifications" onPress={() => navigation?.navigate('Alerts')} />
            <View style={styles.divider} />
            <Row
              icon="sync-outline"
              label="Sync with Backend"
              onPress={handleSyncNow}
              right={syncing ? undefined : <Text style={styles.editLink}>SYNC</Text>}
            />
          </View>

          {/* Device */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Device</Text>
            <LabelCaps>Controls</LabelCaps>
          </View>
          <View style={styles.card}>
            <Row
              icon="sparkle-outline"
              label="Floating AI Assistant"
              right={
                <Switch value={floatingAssistantEnabled} onValueChange={setFloatingAssistantEnabled}
                  trackColor={{ false: '#E4E4EA', true: C.eucalyptus }} thumbColor="#FFFFFF" />
              }
            />
            <Text style={styles.rowHint}>Quick-access NIA bubble that floats over the app.</Text>
          </View>

          {/* Account actions */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Account</Text>
            <LabelCaps>Support</LabelCaps>
          </View>
          <View style={styles.card}>
            <Row
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => navigation?.navigate('Privacy')}
            />
            <View style={styles.divider} />
            <Row
              icon="mail-outline"
              label="Contact Support"
              onPress={() => Alert.alert('Contact Support', 'Write to us at support@nexa.app and the team will respond within 24 hours.')}
            />
            {onRestartOnboarding ? (
              <>
                <View style={styles.divider} />
                <Row icon="refresh-outline" label="Replay Onboarding" onPress={onRestartOnboarding} />
              </>
            ) : null}
            <View style={styles.divider} />
            <Row icon="log-out-outline" label="Log Out" onPress={handleLogout} danger />
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Edit CGPA / Credits modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editType === 'CGPA' ? 'Edit CGPA' : 'Edit Credits'}</Text>
            <Text style={styles.modalSub}>
              {editType === 'CGPA' ? 'Enter your current cumulative GPA (0.00 – 10.00)' : 'Enter your total completed academic credits'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="decimal-pad"
              autoFocus
              placeholder={editType === 'CGPA' ? '8.71' : '42'}
              placeholderTextColor={C.textSubtle}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveAcademics} activeOpacity={0.85}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  content: { paddingBottom: 120 },
  cover: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, marginBottom: 8 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  avatarInit: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: C.obsidian,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitText: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  avatarEdit: {
    position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.eucalyptus, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: C.porcelain,
  },
  name: { fontSize: 21, fontWeight: '700', color: C.ink, letterSpacing: -0.4 },
  idLine: { fontSize: 11, fontWeight: '600', color: C.textMuted, letterSpacing: 1.2, marginTop: 5 },
  courseLine: { fontSize: 12.5, color: C.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10, marginTop: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: C.hairline,
    marginHorizontal: 20, paddingHorizontal: 6, paddingVertical: 4,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04,
    shadowRadius: 10, elevation: 2,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 13,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.porcelain,
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 14.5, fontWeight: '600', color: C.ink, flex: 1 },
  editLink: { fontSize: 11, fontWeight: '700', color: C.eucalyptus, letterSpacing: 0.8 },
  divider: { height: 1, backgroundColor: C.hairline, marginHorizontal: 12 },
  rowHint: { fontSize: 11.5, color: C.textMuted, lineHeight: 16, paddingHorizontal: 12, paddingBottom: 12, marginTop: -6 },
  segment: { flexDirection: 'row', backgroundColor: C.porcelain, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: C.hairline },
  segBtn: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  segBtnActive: { backgroundColor: C.obsidian },
  segText: { fontSize: 11.5, fontWeight: '700', color: C.textSecondary },
  segTextActive: { color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.4)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 22, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 6 },
  modalSub: { fontSize: 12.5, color: C.textSecondary, marginBottom: 14, lineHeight: 18 },
  modalInput: {
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 17, fontWeight: '600', color: C.ink,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: {
    flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12,
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  modalSave: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: C.obsidian },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
