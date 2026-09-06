import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { GradientBackground } from '../components/common/GradientBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDashboardStore } from '../store/dashboardStore';
import type { ClassSession } from '@glitchers/shared';
import { getClassStatus } from '../utils/timetableTimeUtils';
import { apiClient } from '../api/client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getTodayDayName = () => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[new Date().getDay()];
  return DAYS.includes(today) ? today : 'Monday';
};

export const TimetableScreen: React.FC = () => {
  const { classes, setClasses } = useDashboardStore();
  const [selectedDay, setSelectedDay] = useState<string>(getTodayDayName);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newTime, setNewTime] = useState('14:00 - 15:00');
  const [newFaculty, setNewFaculty] = useState('');

  const dayUpper = selectedDay.toUpperCase();
  const dayClasses = classes.filter((c) => c.day === dayUpper);

  const processTimetableAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsScanModalVisible(false);
    setIsScanning(true);
    try {
      let base64 = asset.base64;
      const mimeType = asset.mimeType || 'image/jpeg';

      if (!base64 && asset.uri) {
        try {
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const str = reader.result as string;
              resolve(str.replace(/^data:[^;]+;base64,/, ''));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (readErr) {
          console.warn('Could not read asset uri as blob:', readErr);
        }
      }

      if (!base64) {
        setIsScanning(false);
        Alert.alert('Scan Notice', 'Could not read image file. Please try again.');
        return;
      }

      const result = await apiClient.analyzeTimetableImage(base64, mimeType);
      setIsScanning(false);

      if (result && result.classes && result.classes.length > 0) {
        const incoming = result.classes.map((c: any, idx: number) => ({
          ...c,
          id: String(Date.now() + idx),
          userId: 'u1',
          isCancelled: false,
        }));

        setClasses(incoming);
        // Persist to backend database as well
        apiClient.saveTimetableClasses(incoming).catch((e) => console.warn('Sync classes failed:', e));

        const firstDay = incoming[0]?.day;
        if (firstDay) {
          const matchedDay = DAYS.find((d) => d.toUpperCase() === firstDay.toUpperCase());
          if (matchedDay) setSelectedDay(matchedDay);
        }

        Alert.alert(
          'Timetable Imported! 🎉',
          `Successfully extracted ${incoming.length} classes using AI Vision OCR.`
        );
      } else {
        Alert.alert('Scan Notice', 'Could not detect courses in this photo. Please ensure good lighting and legible text.');
      }
    } catch (err: any) {
      setIsScanning(false);
      console.warn('Timetable scan error:', err);
      Alert.alert('Scan Notice', err?.message || 'Failed to process timetable image.');
    }
  };

  const handlePickGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please grant photo library access to upload a timetable.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processTimetableAsset(result.assets[0]);
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Could not open photo library.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please grant camera access to take a timetable photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processTimetableAsset(result.assets[0]);
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Could not open camera.');
    }
  };

  const handleAddClass = () => {
    if (!newSubject.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }
    const [start = '14:00', end = '15:00'] = newTime.split('-').map((s) => s.trim());
    const newSession: ClassSession = {
      id: String(Date.now()),
      userId: 'u1',
      subjectName: newSubject.trim(),
      day: dayUpper as any,
      startTime: start,
      endTime: end,
      room: newRoom.trim() || 'AB1-101',
      faculty: newFaculty.trim() || 'Faculty',
      classType: 'LECTURE',
      isCancelled: false,
    };
    setClasses([...classes, newSession]);
    setNewSubject('');
    setNewRoom('');
    setNewFaculty('');
    setIsAddModalVisible(false);
    Alert.alert('Class Added', `${newSession.subjectName} added to ${selectedDay}'s schedule.`);
  };

  const handleDeleteClass = (id: string, name: string) => {
    Alert.alert('Delete Class', `Remove ${name} from schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setClasses(classes.filter((c) => c.id !== id)),
      },
    ]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Timetable</Text>
            <Text style={styles.headerSubtitle}>
              {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'} on {selectedDay}
            </Text>
          </View>

          <View style={styles.headerRightButtons}>
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => setIsScanModalVisible(true)}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color={designTokens.colors.primaryDeep} />
              ) : (
                <Ionicons name="scan-outline" size={15} color={designTokens.colors.primaryDeep} />
              )}
              <Text style={styles.scanBtnText}>{isScanning ? 'Scanning...' : 'Scan'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real-time scanning feedback banner */}
        {isScanning && (
          <View style={styles.scanningBanner}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.scanningBannerText}>Analyzing timetable photo with AI Vision OCR...</Text>
          </View>
        )}

        {/* Monday - Saturday Tabs */}
        <View style={styles.dayTabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabsContent}
          >
            {DAYS.map((day) => {
              const isActive = day === selectedDay;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayTab, isActive && styles.dayTabActive]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Class Schedule List */}
        <ScrollView contentContainerStyle={styles.scheduleList}>
          {dayClasses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cafe-outline" size={32} color="#64748B" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No classes scheduled for {selectedDay}</Text>
              <Text style={styles.emptySub}>Enjoy your free academic hours or catch up on project work.</Text>
            </View>
          ) : (
            dayClasses.map((item, index) => {
              // Real-time live status calculation
              const now = new Date();
              const live = getClassStatus(item, now);
              const statusBadge =
                live.status === 'DIFFERENT_DAY' ? (
                  <StatusBadge label="Scheduled" variant="safe" />
                ) : (
                  <StatusBadge label={live.label} variant={live.badgeVariant} />
                );

              return (
                <GlassCard key={item.id} style={styles.classCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.timeBlock}>
                      <Ionicons name="time-outline" size={13} color="#60A5FA" />
                      <Text style={styles.timeStart}>{item.startTime}</Text>
                      <Text style={styles.timeDivider}>–</Text>
                      <Text style={styles.timeEnd}>{item.endTime}</Text>
                    </View>

                    <View style={styles.cardHeaderRight}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{item.classType || 'LECTURE'}</Text>
                      </View>
                      {statusBadge}
                    </View>
                  </View>

                <Text style={styles.subjectName}>{item.subjectName}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={13} color="#38BDF8" />
                    <Text style={styles.metaText}>{item.room || 'Room TBD'}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={13} color="#94A3B8" />
                    <Text style={styles.metaText}>{item.faculty || 'Faculty'}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteIconBtn}
                    onPress={() => handleDeleteClass(item.id, item.subjectName)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* Add Class Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Class for {selectedDay}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Course Name (e.g. Compiler Design)"
              placeholderTextColor="#64748B"
              value={newSubject}
              onChangeText={setNewSubject}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Time Range (e.g. 14:00 - 15:00)"
              placeholderTextColor="#64748B"
              value={newTime}
              onChangeText={setNewTime}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Room Number (e.g. AB1-204)"
              placeholderTextColor="#64748B"
              value={newRoom}
              onChangeText={setNewRoom}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Faculty Name (e.g. Dr. K. Sharma)"
              placeholderTextColor="#64748B"
              value={newFaculty}
              onChangeText={setNewFaculty}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddClass}>
                <Text style={styles.modalSaveText}>Add Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Scan Timetable Options */}
      <Modal
        visible={isScanModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsScanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>📷 Scan Timetable Schedule</Text>
            <Text style={styles.scanSubtitle}>
              Upload a clear photo or screenshot of your college timetable. Our Gemini AI Vision OCR automatically parses class timings, courses, and venues.
            </Text>

            <TouchableOpacity style={styles.scanOptionCard} onPress={handleTakePhoto}>
              <View style={styles.scanIconBox}>
                <Ionicons name="camera" size={24} color={designTokens.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanOptionTitle}>Take Photo</Text>
                <Text style={styles.scanOptionSub}>Use your camera to snap your printed schedule</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.scanOptionCard} onPress={handlePickGallery}>
              <View style={styles.scanIconBox}>
                <Ionicons name="images" size={24} color={designTokens.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.scanOptionSub}>Select screenshot, image, or syllabus table</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancelBtn, { marginTop: 4 }]}
              onPress={() => setIsScanModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: 8,
    paddingBottom: designTokens.spacing.md,
  },
  headerTitle: {
    ...designTokens.typography.hero,
    fontSize: 22,
  },
  headerSubtitle: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(117, 167, 165, 0.15)',
    borderWidth: 1,
    borderColor: designTokens.colors.primary,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 2,
    borderRadius: designTokens.radii.pill,
  },
  scanBtnText: {
    ...designTokens.typography.cardTitle,
    fontSize: 12,
    color: designTokens.colors.primaryDeep,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: designTokens.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 2,
    borderRadius: designTokens.radii.pill,
  },
  addBtnText: {
    ...designTokens.typography.cardTitle,
    fontSize: 12,
    color: '#FFFFFF',
  },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designTokens.colors.primary,
    marginHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: 8,
    borderRadius: designTokens.radii.sm,
  },
  scanningBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scanSubtitle: {
    ...designTokens.typography.body,
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.xs,
  },
  scanOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
    backgroundColor: '#FFFFFF',
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radii.card,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  scanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designTokens.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOptionTitle: {
    ...designTokens.typography.cardTitle,
    fontSize: 14,
    color: designTokens.colors.textPrimary,
  },
  scanOptionSub: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  dayTabsWrapper: {
    marginBottom: designTokens.spacing.md,
  },
  dayTabsContent: {
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.xs,
  },
  dayTab: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 3,
    borderRadius: designTokens.radii.pill,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  dayTabActive: {
    backgroundColor: designTokens.colors.primaryPill,
    borderColor: designTokens.colors.primary,
  },
  dayTabText: {
    ...designTokens.typography.bodyMedium,
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  dayTabTextActive: {
    color: designTokens.colors.textPrimary,
    fontWeight: '700',
  },
  scheduleList: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: 100,
    gap: designTokens.spacing.md,
  },
  classCard: {
    marginBottom: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeStart: {
    ...designTokens.typography.cardTitle,
    fontSize: 13,
    color: designTokens.colors.textPrimary,
  },
  timeDivider: {
    color: designTokens.colors.textMuted,
    fontSize: 12,
  },
  timeEnd: {
    ...designTokens.typography.bodyMedium,
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  typeBadge: {
    backgroundColor: designTokens.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: designTokens.radii.xs,
  },
  typeBadgeText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.primaryDeep,
    fontSize: 9,
    fontWeight: '800',
  },
  subjectName: {
    ...designTokens.typography.hero,
    fontSize: 17,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 51, 50, 0.06)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: { fontSize: 12 },
  metaText: {
    ...designTokens.typography.bodyMedium,
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(41, 51, 50, 0.1)',
    marginHorizontal: designTokens.spacing.md,
  },
  deleteIconBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  deleteIconText: {
    color: designTokens.colors.textMuted,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.hero,
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.card,
    paddingHorizontal: designTokens.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    ...designTokens.shadows.card,
  },
  emptyIcon: { fontSize: 32, marginBottom: designTokens.spacing.sm },
  emptyTitle: { ...designTokens.typography.sectionTitle, fontSize: 15, textAlign: 'center' },
  emptySub: { ...designTokens.typography.body, textAlign: 'center', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(35, 45, 43, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: designTokens.radii.xl,
    borderTopRightRadius: designTokens.radii.xl,
    padding: designTokens.spacing.xl,
    paddingBottom: 36,
    gap: designTokens.spacing.md,
  },
  modalTitle: { ...designTokens.typography.sectionTitle, fontSize: 18, marginBottom: designTokens.spacing.xs },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    color: designTokens.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.10)',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#EAE5DB',
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  modalCancelText: { ...designTokens.typography.cardTitle, fontSize: 13, color: designTokens.colors.textSecondary },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.primary,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  modalSaveText: { ...designTokens.typography.cardTitle, fontSize: 13, color: '#FFFFFF' },
});
