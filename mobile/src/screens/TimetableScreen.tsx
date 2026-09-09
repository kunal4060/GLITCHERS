import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import type { ClassSession } from '@glitchers/shared';
import { getClassStatus } from '../utils/timetableTimeUtils';
import { apiClient } from '../api/client';
import { confirmAction } from '../utils/alertUtils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

const getTodayDayName = () => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[new Date().getDay()];
  return today === 'Sunday' ? 'Monday' : today;
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
        const currentUserId = useAuthStore.getState().user?.id || 'offline-user';
        const incoming = result.classes.map((c: any, idx: number) => ({
          ...c,
          id: String(Date.now() + idx),
          userId: currentUserId,
          isCancelled: false,
        }));

        setClasses(incoming);
        apiClient.saveTimetableClasses(incoming).catch((e) => console.warn('Sync classes failed:', e));

        const firstDay = incoming[0]?.day;
        if (firstDay) {
          const matchedDay = DAYS.find((d) => d.toUpperCase() === firstDay.toUpperCase());
          if (matchedDay) setSelectedDay(matchedDay);
        }

        Alert.alert(
          'Timetable Imported! 🎉',
          `Successfully extracted ${incoming.length} classes using Nia Vision OCR.`
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
        quality: 0.85,
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
        quality: 0.85,
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
    const currentUserId = useAuthStore.getState().user?.id || 'offline-user';
    const newSession: ClassSession = {
      id: String(Date.now()),
      userId: currentUserId,
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
    confirmAction(
      'Delete Class',
      `Remove ${name} from schedule?`,
      () => {
        setClasses(classes.filter((c) => c.id !== id));
        apiClient.deleteClass(id).catch(() => null);
      },
      'Delete'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header Section */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Timetable</Text>
            <View style={styles.todayPill}>
              <Text style={styles.todayPillText}>{selectedDay === getTodayDayName() ? 'Today' : selectedDay}</Text>
            </View>
          </View>
          <View style={styles.subtextRow}>
            <View style={styles.greenPip} />
            <Text style={styles.headerSubtitle}>
              {dayClasses.length} scheduled sessions • Fall Term 2024
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.scanAiBtn}
            onPress={() => setIsScanModalVisible(true)}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#006A63" />
            ) : (
              <Ionicons name="document-text-outline" size={15} color="#006A63" />
            )}
            <Text style={styles.scanAiBtnText}>Scan AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive AI Scan Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => setIsScanModalVisible(true)}
          activeOpacity={0.88}
        >
          <View style={styles.aiBannerLeft}>
            <View style={styles.aiBannerIconBox}>
              <Ionicons name="sparkles" size={18} color="#006A63" />
            </View>
            <View>
              <Text style={styles.aiBannerTitle}>Auto-sync with Syllabus or PDF</Text>
              <Text style={styles.aiBannerSub}>Tap to import changes via Nia Vision</Text>
            </View>
          </View>
          <View style={styles.aiBannerActionPill}>
            <Text style={styles.aiBannerActionText}>Scan</Text>
            <Ionicons name="arrow-forward" size={12} color="#1A1C1D" />
          </View>
        </TouchableOpacity>

        {/* Day Selector Bar */}
        <View style={styles.daySelectorSection}>
          <View style={styles.daySelectorHeader}>
            <Text style={styles.weekLabel}>WEEK 08 • OCTOBER</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="funnel-outline" size={12} color="#006A63" />
              <Text style={styles.filterText}>Filter (AB-1)</Text>
            </View>
          </View>

          <View style={styles.dayTabsGrid}>
            {DAYS.map((day, idx) => {
              const isActive = day === selectedDay;
              const dateNumber = 21 + idx;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayTabCell, isActive && styles.dayTabCellActive]}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={[styles.dayTabName, isActive && styles.dayTabNameActive]}>
                      {DAY_SHORT[day]}
                    </Text>
                    {isActive && <View style={styles.activeDot} />}
                  </View>
                  <Text style={[styles.dayTabDate, isActive && styles.dayTabDateActive]}>
                    {dateNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Status Needle Indicator */}
        <View style={styles.statusNeedleCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.liveNeedlePip} />
            <Text style={styles.statusNeedleText}>
              {dayClasses.length === 0 ? `Free Day on ${selectedDay}` : `Schedule active for ${selectedDay}`}
            </Text>
          </View>
          <Text style={styles.statusNeedleCount}>{dayClasses.length} Sessions</Text>
        </View>

        {/* Chronological Class Cards */}
        {dayClasses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={32} color="#006A63" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>Day Off • {selectedDay}</Text>
            <Text style={styles.emptySub}>
              No lectures scheduled for {selectedDay}. Catch up on study or assignments!
            </Text>
          </View>
        ) : (
          dayClasses.map((item) => {
            const now = new Date();
            const live = getClassStatus(item, now);
            const courseCode = item.subjectName.includes(' ')
              ? item.subjectName.split(' ')[0]
              : 'STS2010';

            return (
              <View key={item.id} style={styles.classCard}>
                {/* Top Meta Line */}
                <View style={styles.classCardTop}>
                  <View style={styles.timeSchedulePill}>
                    <Text style={styles.timeScheduleText}>
                      {item.startTime} – {item.endTime}
                    </Text>
                  </View>
                  <View style={styles.cardTopRight}>
                    <View style={styles.statusCompletedBadge}>
                      <View style={styles.completedGreenDot} />
                      <Text style={styles.statusCompletedText}>{live.label || 'Active'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteClass(item.id, item.subjectName)}
                      style={styles.moreOptionsBtn}
                    >
                      <Ionicons name="ellipsis-vertical" size={15} color="#76777D" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Course Name & Details */}
                <View style={styles.courseInfoRow}>
                  <Text style={styles.courseTitleText} numberOfLines={1}>
                    {item.subjectName}
                  </Text>
                  <View style={styles.courseCodeBadge}>
                    <Text style={styles.courseCodeText}>{courseCode}</Text>
                  </View>
                </View>
                <Text style={styles.moduleDescText} numberOfLines={1}>
                  Module IV: Quantitative Problem Solving & Verbal Fluency
                </Text>

                {/* Card Footer */}
                <View style={styles.classCardFooter}>
                  <View style={styles.facultyRow}>
                    <View style={styles.facultyInitialsCircle}>
                      <Text style={styles.facultyInitialsText}>
                        {item.faculty
                          ? item.faculty.split(' ').map((w) => w[0]).slice(0, 2).join('')
                          : 'DR'}
                      </Text>
                    </View>
                    <Text style={styles.facultyNameText}>{item.faculty || 'Prof. R. Sengupta'}</Text>
                  </View>

                  <View style={styles.roomBadge}>
                    <Ionicons name="location-outline" size={12} color="#006A63" />
                    <Text style={styles.roomBadgeText}>{item.room || 'CB-102'}</Text>
                  </View>
                </View>
              </View>
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
              placeholderTextColor="#76777D"
              value={newSubject}
              onChangeText={setNewSubject}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Time Range (e.g. 14:00 - 15:00)"
              placeholderTextColor="#76777D"
              value={newTime}
              onChangeText={setNewTime}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Room Number (e.g. AB1-204)"
              placeholderTextColor="#76777D"
              value={newRoom}
              onChangeText={setNewRoom}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Faculty Name (e.g. Dr. K. Sharma)"
              placeholderTextColor="#76777D"
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

      {/* Scan Timetable Modal */}
      <Modal visible={isScanModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>📷 Scan Timetable Schedule</Text>
            <Text style={styles.modalSub}>
              Snap a clear photo or screenshot of your timetable. Nia AI Vision OCR parses class hours, venues, and professor names.
            </Text>

            <TouchableOpacity style={styles.scanOptionCard} onPress={handleTakePhoto}>
              <View style={styles.scanIconCircle}>
                <Ionicons name="camera" size={22} color="#111827" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanOptionTitle}>Take Photo</Text>
                <Text style={styles.scanOptionSub}>Use camera to snap printed schedule</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.scanOptionCard} onPress={handlePickGallery}>
              <View style={styles.scanIconCircle}>
                <Ionicons name="images" size={22} color="#111827" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.scanOptionSub}>Pick saved schedule screenshot or photo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsScanModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 226, 228, 0.6)',
    backgroundColor: 'rgba(249, 249, 251, 0.95)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.3,
  },
  todayPill: {
    backgroundColor: 'rgba(0, 106, 99, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006A63',
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  greenPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006A63',
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#76777D',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEEEF0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  scanAiBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  content: {
    padding: 20,
    paddingBottom: 96,
    gap: 14,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiBannerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEEEF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  aiBannerSub: {
    fontSize: 11,
    color: '#76777D',
    marginTop: 1,
  },
  aiBannerActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F3F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  aiBannerActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  daySelectorSection: {
    gap: 8,
  },
  daySelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  weekLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 0.8,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006A63',
  },
  dayTabsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F5',
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  dayTabCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  dayTabCellActive: {
    backgroundColor: '#111827',
  },
  dayTabName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#76777D',
    textTransform: 'uppercase',
  },
  dayTabNameActive: {
    color: '#DCE2F7',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#80D5CB',
  },
  dayTabDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1C1D',
    marginTop: 2,
  },
  dayTabDateActive: {
    color: '#FFFFFF',
  },
  statusNeedleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  liveNeedlePip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006A63',
  },
  statusNeedleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  statusNeedleCount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#006A63',
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  classCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeSchedulePill: {
    backgroundColor: '#F3F3F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeScheduleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F3F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  completedGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#006A63',
  },
  statusCompletedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#006A63',
  },
  moreOptionsBtn: {
    padding: 2,
  },
  courseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1D',
    flex: 1,
  },
  courseCodeBadge: {
    backgroundColor: '#F3F3F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  courseCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  moduleDescText: {
    fontSize: 12,
    color: '#76777D',
    marginTop: 4,
    marginBottom: 12,
  },
  classCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F3F5',
  },
  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  facultyInitialsCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCE2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facultyInitialsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#141B2B',
  },
  facultyNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006A63',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1D',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#76777D',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  modalSub: {
    fontSize: 12,
    color: '#76777D',
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E2E2E4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1C1D',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F3F5',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#76777D',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scanOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E2E2E4',
    borderRadius: 14,
    padding: 14,
  },
  scanIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEEEF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  scanOptionSub: {
    fontSize: 11,
    color: '#76777D',
    marginTop: 2,
  },
  modalCloseBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#76777D',
  },
});
