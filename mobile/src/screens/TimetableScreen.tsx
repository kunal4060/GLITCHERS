import React, { useState, useRef } from 'react';
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
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore } from '../store/dashboardStore';
import { apiClient } from '../api/client';
import { parseTimeToMinutes, formatTime12h } from '../utils/timetableTimeUtils';
import { NiaHeader, LabelCaps, StatusPill, NiaCard } from '../components/nia';

const C = designTokens.colors;

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

type ClassDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
const FULL_DAYS: ClassDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const TimetableScreen = ({ navigation }: { navigation?: any }) => {
  const { classes, addClass, updateClass, deleteClass } = useDashboardStore();

  const [selectedDay, setSelectedDay] = useState(() => {
    const idx = new Date().getDay(); // 0=Sun
    return DAYS[(idx + 6) % 7]; // MON-first
  });
  const [fabOpen, setFabOpen] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [subjectName, setSubjectName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [room, setRoom] = useState('');
  const [day, setDay] = useState<ClassDay>('MONDAY');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [importing, setImporting] = useState(false);

  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const dayClasses = classes
    .filter((c) => c.day.toUpperCase().slice(0, 3) === selectedDay && !c.isCancelled)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  const isToday = selectedDay === DAYS[(new Date().getDay() + 6) % 7];

  // Horizontal swipe on the day's class list moves between days
  // (swipe left -> next day, swipe right -> previous day, wraps around the week)
  const goToDayRef = useRef<(dir: 1 | -1) => void>(() => {});
  const goToDay = (dir: 1 | -1) => {
    // Functional update avoids the PanResponder stale closure
    setSelectedDay((prev) => DAYS[(DAYS.indexOf(prev) + dir + DAYS.length) % DAYS.length]);
  };
  goToDayRef.current = goToDay;
  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -60) goToDayRef.current(1);
        else if (g.dx > 60) goToDayRef.current(-1);
      },
    })
  ).current;

  const resetForm = () => {
    setSubjectName('');
    setFaculty('');
    setRoom('');
    setDay('MONDAY');
    setStartTime('');
    setEndTime('');
    setEditingClass(null);
  };

  const openEdit = (c: any) => {
    setEditingClass(c);
    setSubjectName(c.subjectName || '');
    setFaculty(c.faculty || '');
    setRoom(c.room || '');
    setDay((c.day as ClassDay) || 'MONDAY');
    setStartTime(c.startTime?.slice(0, 5) || '');
    setEndTime(c.endTime?.slice(0, 5) || '');
    setAddVisible(true);
  };

  const savingRef = useRef(false);
  const saveClass = () => {
    if (savingRef.current) return;
    if (!subjectName.trim()) {
      Alert.alert('Missing subject', 'Please enter a subject name.');
      return;
    }
    if (!startTime || !endTime) {
      Alert.alert('Missing time', 'Please enter start and end times (HH:MM).');
      return;
    }
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRe.test(startTime.trim()) || !timeRe.test(endTime.trim())) {
      Alert.alert('Invalid time', 'Use 24-hour HH:MM format (e.g. 09:30).');
      return;
    }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      Alert.alert('Invalid time', 'End time must be after start time.');
      return;
    }
    savingRef.current = true;
    if (editingClass) {
      updateClass(editingClass.id, { subjectName, faculty, room, day, startTime, endTime });
      Alert.alert('Updated', 'Class updated.');
    } else {
      addClass({ subjectName, faculty, room, day, startTime, endTime });
      Alert.alert('Added', `${subjectName} added to your timetable.`);
    }
    resetForm();
    setAddVisible(false);
    setTimeout(() => { savingRef.current = false; }, 500);
  };

  const confirmDelete = (c: any) => {
    Alert.alert('Delete class', `Remove ${c.subjectName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteClass(c.id) },
    ]);
  };

  const handleAIImport = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Empty prompt', 'Paste your timetable text first.');
      return;
    }
    setImporting(true);
    try {
      const res = await apiClient.sendAIChat(
        `Parse this timetable text into classes. Return JSON array of objects with fields: subjectName, faculty, room, day (full name like Monday), startTime (HH:MM 24h), endTime (HH:MM 24h). Only return the JSON array, nothing else.\n\n${aiPrompt}`
      );
      const text = res?.message || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        let added = 0;
        for (const p of parsed) {
          if (p.subjectName && p.startTime && p.endTime) {
            const rawDay = String(p.day || 'MONDAY').toUpperCase();
            const dayEnum: ClassDay = (FULL_DAYS as string[]).includes(rawDay)
              ? (rawDay as ClassDay)
              : 'MONDAY';
            addClass({
              subjectName: String(p.subjectName),
              faculty: String(p.faculty || ''),
              room: String(p.room || ''),
              day: dayEnum,
              startTime: String(p.startTime),
              endTime: String(p.endTime),
            });
            added++;
          }
        }
        Alert.alert('Import complete', `Added ${added} ${added === 1 ? 'class' : 'classes'} from your timetable.`);
        setAiPrompt('');
      } else {
        Alert.alert('Could not parse', 'NIA could not understand that format. Try adding classes manually.');
      }
    } catch (e) {
      Alert.alert('Import failed', 'Check your connection and try again.');
    } finally {
      setImporting(false);
    }
  };

  const statusFor = (c: any): 'done' | 'now' | 'upcoming' => {
    if (!isToday) return 'upcoming';
    const s = parseTimeToMinutes(c.startTime);
    const e = parseTimeToMinutes(c.endTime);
    if (curMinutes >= s && curMinutes < e) return 'now';
    if (curMinutes >= e) return 'done';
    return 'upcoming';
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <NiaHeader title="Schedule" navigation={navigation} />

          <Text style={styles.title}>Class Schedule</Text>
          <Text style={styles.sub}>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>

          {/* Week strip */}
          <View style={styles.weekStrip}>
            {DAYS.map((d) => {
              const active = d === selectedDay;
              const isCur = d === DAYS[(new Date().getDay() + 6) % 7];
              const count = classes.filter((c) => c.day.toUpperCase().slice(0, 3) === d && !c.isCancelled).length;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayCell, active && styles.dayCellActive]}
                  onPress={() => setSelectedDay(d)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${d} classes`}
                >
                  <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{d}</Text>
                  {isCur && <View style={[styles.todayDot, active && { backgroundColor: '#FFFFFF' }]} />}
                  <Text style={[styles.dayCount, active && styles.dayCountActive]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Import toggle */}
          <View style={styles.importRow}>
            <LabelCaps>{importing ? 'NIA is reading your timetable…' : 'Add classes'}</LabelCaps>
            <TouchableOpacity onPress={() => navigation?.navigate('Attendance')} activeOpacity={0.7}>
              <Text style={styles.linkText}>ATTENDANCE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.aiRow}>
            <TextInput
              style={styles.aiInput}
              placeholder="Paste timetable text → NIA adds the classes"
              placeholderTextColor={C.textSubtle}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              multiline
            />
            <TouchableOpacity
              style={styles.aiBtn}
              onPress={handleAIImport}
              disabled={importing}
              activeOpacity={0.8}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Timeline — swipe left/right to change day */}
          <View {...swipeResponder.panHandlers}>
          <View style={styles.timelineHead}>
            <Text style={styles.timelineTitle}>
              {selectedDay === DAYS[(new Date().getDay() + 6) % 7] ? "Today's" : `${selectedDay}'s`} Classes
            </Text>
            <StatusPill label={`${dayClasses.length} scheduled`} tone="neutral" />
          </View>

          {dayClasses.length === 0 ? (
            <NiaCard>
              <Text style={styles.emptyText}>No classes scheduled. Add one below.</Text>
            </NiaCard>
          ) : (
            dayClasses.map((c) => {
              const st = statusFor(c);
              const active = st === 'now';
              const tint = active ? C.obsidian : '#FFFFFF';
              return (
                <View key={c.id} style={styles.cardRow}>
                  <View style={styles.timeCol}>
                    <Text style={[styles.timeText, active && { color: C.eucalyptus }]}>
                      {c.startTime?.slice(0, 5)}
                    </Text>
                    <Text style={styles.timeEnd}>{c.endTime?.slice(0, 5)}</Text>
                  </View>
                  <View style={styles.railCol}>
                    <View style={[styles.railDot, active && { backgroundColor: C.eucalyptus }]} />
                    <View style={styles.railLine} />
                  </View>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => openEdit(c)}
                    onLongPress={() => confirmDelete(c)}
                    activeOpacity={0.85}
                  >
                    <NiaCard dark={active} style={[styles.classCard, st === 'done' && { opacity: 0.6 }]}>
                      <View style={styles.classTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.classCode, active && { color: '#FFFFFF' }]}>
                            {c.subjectName.split(' ')[0].toUpperCase().slice(0, 8)} · {formatTime12h(c.startTime)}
                          </Text>
                          <Text style={[styles.className, active && { color: '#FFFFFF' }]} numberOfLines={1}>
                            {c.subjectName}
                          </Text>
                        </View>
                        {active && <StatusPill label="Now" tone="success" />}
                        {st === 'done' && <StatusPill label="Done" tone="neutral" />}
                      </View>
                      <View style={styles.classMeta}>
                        {!!c.room && (
                          <View style={styles.metaChip}>
                            <Ionicons name="location-outline" size={13} color={active ? 'rgba(255,255,255,0.7)' : C.textMuted} />
                            <Text style={[styles.metaText, active && { color: 'rgba(255,255,255,0.8)' }]}>Room {c.room}</Text>
                          </View>
                        )}
                        {!!c.faculty && (
                          <View style={styles.metaChip}>
                            <Ionicons name="person-outline" size={13} color={active ? 'rgba(255,255,255,0.7)' : C.textMuted} />
                            <Text style={[styles.metaText, active && { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>{c.faculty}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.classActions}>
                        <TouchableOpacity
                          style={[styles.miniBtn, active && { backgroundColor: 'rgba(255,255,255,0.14)' }]}
                          onPress={() => navigation?.navigate('Docs')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="document-text-outline" size={13} color={active ? '#FFFFFF' : C.eucalyptus} />
                          <Text style={[styles.miniBtnText, active && { color: '#FFFFFF' }]}>Slides</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.miniBtn, active && { backgroundColor: 'rgba(255,255,255,0.14)' }]}
                          onPress={() => openEdit(c)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil-outline" size={13} color={active ? '#FFFFFF' : C.textSecondary} />
                          <Text style={[styles.miniBtnText, { color: active ? '#FFFFFF' : C.textSecondary }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.miniBtn, active && { backgroundColor: 'rgba(255,255,255,0.14)' }]}
                          onPress={() => confirmDelete(c)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={13} color={C.terracotta} />
                          <Text style={[styles.miniBtnText, { color: C.terracotta }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </NiaCard>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          <View style={{ height: 8 }} />
          </View>
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setAddVisible(true); }} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Add / edit modal */}
        <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setAddVisible(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <LabelCaps style={styles.sheetLabel}>{editingClass ? 'Edit Class' : 'Add Class'}</LabelCaps>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput style={styles.input} placeholder="e.g. Data Structures" placeholderTextColor={C.textSubtle} value={subjectName} onChangeText={setSubjectName} />
              <Text style={styles.fieldLabel}>Faculty</Text>
              <TextInput style={styles.input} placeholder="e.g. Dr. Rao" placeholderTextColor={C.textSubtle} value={faculty} onChangeText={setFaculty} />
              <Text style={styles.fieldLabel}>Room</Text>
              <TextInput style={styles.input} placeholder="e.g. 305B" placeholderTextColor={C.textSubtle} value={room} onChangeText={setRoom} />
              <Text style={styles.fieldLabel}>Day</Text>
              <View style={styles.dayPickRow}>
                {FULL_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayPick, day === d && styles.dayPickActive]}
                    onPress={() => setDay(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayPickText, day === d && styles.dayPickTextActive]}>{d.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Start (HH:MM)</Text>
                  <TextInput style={styles.input} placeholder="09:00" placeholderTextColor={C.textSubtle} value={startTime} onChangeText={setStartTime} keyboardType="numbers-and-punctuation" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>End (HH:MM)</Text>
                  <TextInput style={styles.input} placeholder="10:30" placeholderTextColor={C.textSubtle} value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation" />
                </View>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={saveClass} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{editingClass ? 'Save Changes' : 'Add Class'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  content: { paddingBottom: 120 },
  title: { fontSize: 27, fontWeight: '700', color: C.ink, letterSpacing: -0.6, paddingHorizontal: 20 },
  sub: { fontSize: 12, color: C.textMuted, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  weekStrip: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 18 },
  dayCell: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
  },
  dayCellActive: { backgroundColor: C.obsidian, borderColor: C.obsidian },
  dayLabel: { fontSize: 10, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.6 },
  dayLabelActive: { color: '#FFFFFF' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.eucalyptus, marginTop: 3 },
  dayCount: { fontSize: 11, fontWeight: '600', color: C.textMuted, marginTop: 2 },
  dayCountActive: { color: 'rgba(255,255,255,0.7)' },
  importRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 8,
  },
  linkText: { fontSize: 11, fontWeight: '700', color: C.eucalyptus, letterSpacing: 0.8 },
  aiRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 18 },
  aiInput: {
    flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13.5, color: C.ink, minHeight: 46,
  },
  aiBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: C.obsidian,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12,
  },
  timelineTitle: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 8 },
  cardRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
  timeCol: { width: 52, paddingTop: 14, alignItems: 'flex-end' },
  timeText: { fontSize: 12, fontWeight: '700', color: C.ink },
  timeEnd: { fontSize: 10.5, color: C.textMuted, marginTop: 2 },
  railCol: { alignItems: 'center', marginHorizontal: 10, paddingTop: 16 },
  railDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.hairline },
  railLine: { width: 1.5, flex: 1, backgroundColor: C.hairline, marginTop: 4, marginBottom: -4 },
  classCard: { padding: 14, marginBottom: 10 },
  classTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  classCode: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, marginBottom: 3 },
  className: { fontSize: 16, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  classMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.textSecondary, fontWeight: '500' },
  classActions: { flexDirection: 'row', gap: 8 },
  miniBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.eucalyptusFaint, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7,
  },
  miniBtnText: { fontSize: 11.5, fontWeight: '700', color: C.eucalyptus },
  fab: {
    position: 'absolute', right: 20, bottom: 158,
    width: 58, height: 58, borderRadius: 29, backgroundColor: C.obsidian,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25,
    shadowRadius: 16, elevation: 8,
  },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '92%' },
  sheetLabel: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.6, marginBottom: 6, marginTop: 10, textTransform: 'uppercase' },
  input: {
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.ink,
  },
  dayPickRow: { flexDirection: 'row', gap: 6 },
  dayPick: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
  },
  dayPickActive: { backgroundColor: C.obsidian, borderColor: C.obsidian },
  dayPickText: { fontSize: 11, fontWeight: '700', color: C.textSecondary },
  dayPickTextActive: { color: '#FFFFFF' },
  timeRow: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    backgroundColor: C.obsidian, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 20,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
