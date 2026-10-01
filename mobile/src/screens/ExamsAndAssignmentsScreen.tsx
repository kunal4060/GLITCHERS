import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { NiaHeader, LabelCaps, StatusPill, NiaCard } from '../components/nia';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { newUuid } from '../utils/tokenStorage';
import type { Exam, Assignment } from '@glitchers/shared';

const C = designTokens.colors;

// M26: real countdown computed from a YYYY-MM-DD date (local calendar days).
const countdownLabel = (dateStr: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!m) return '';
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return `${-diffDays}d ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays}d`;
};

const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim());

export const ExamsAndAssignmentsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXAMS' | 'ASSIGNMENTS'>('EXAMS');
  const { user } = useAuthStore();
  const currentUserId = user?.id || 'offline-user';

  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  const [newSubject, setNewSubject] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAsgSubject, setNewAsgSubject] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  // M27: load from backend on mount instead of starting empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [exRes, asRes] = await Promise.all([
          apiClient.fetchExams().catch(() => null),
          apiClient.fetchAssignments().catch(() => null),
        ]);
        if (cancelled) return;
        if (exRes?.exams) setExams(exRes.exams);
        if (asRes?.assignments) setAssignments(asRes.assignments);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddExam = async () => {
    if (!newSubject.trim()) return;
    // H5: real date input with validation — never a hardcoded past date.
    if (!isValidDate(newDate)) {
      Alert.alert('Invalid date', 'Enter the exam date as YYYY-MM-DD (e.g. 2026-12-15).');
      return;
    }
    const payload: Exam = {
      id: newUuid(),
      userId: currentUserId,
      subject: newSubject.trim(),
      date: newDate.trim(),
      time: newTime.trim() || '10:00',
      room: newRoom.trim() || null,
      syllabus: null,
      importance: 'HIGH',
    };
    setExams((prev) => [payload, ...prev]);
    setNewSubject('');
    setNewDate('');
    setNewTime('');
    setNewRoom('');
    try {
      const res = await apiClient.createExam({
        subject: payload.subject,
        date: payload.date,
        time: payload.time,
        room: payload.room || undefined,
        importance: payload.importance,
      });
      if (res?.exam) {
        setExams((prev) => prev.map((e) => (e.id === payload.id ? res.exam : e)));
      }
    } catch {
      // stays local-only; will merge on next mount
    }
  };

  const handleAddAssignment = async () => {
    if (!newTitle.trim()) return;
    if (!isValidDate(newDeadline)) {
      Alert.alert('Invalid date', 'Enter the deadline as YYYY-MM-DD (e.g. 2026-11-20).');
      return;
    }
    if (!newAsgSubject.trim()) {
      Alert.alert('Missing subject', 'Enter the subject for this assignment.');
      return;
    }
    const payload: Assignment = {
      id: newUuid(),
      userId: currentUserId,
      title: newTitle.trim(),
      subject: newAsgSubject.trim(),
      deadline: `${newDeadline.trim()}T23:59:00`,
      submissionPlatform: 'University Portal',
      priority: 'HIGH',
      status: 'PENDING',
    };
    setAssignments((prev) => [payload, ...prev]);
    setNewTitle('');
    setNewAsgSubject('');
    setNewDeadline('');
    try {
      const res = await apiClient.createAssignment({
        title: payload.title,
        subject: payload.subject,
        deadline: payload.deadline,
        priority: payload.priority,
      });
      if (res?.assignment) {
        setAssignments((prev) => prev.map((a) => (a.id === payload.id ? res.assignment : a)));
      }
    } catch {
      // stays local-only
    }
  };

  const toggleAssignmentStatus = (id: string) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === 'PENDING' ? 'SUBMITTED' : 'PENDING' } : a))
    );
  };

  const importanceTone = (imp?: string): 'danger' | 'neutral' | 'info' =>
    imp === 'CRITICAL' ? 'danger' : imp === 'HIGH' ? 'info' : 'neutral';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NiaHeader title="Exams & Assignments" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LabelCaps>TRACKER</LabelCaps>

        {/* Segmented tabs */}
        <View style={styles.tabBar}>
          {(['EXAMS', 'ASSIGNMENTS'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab === 'EXAMS' ? `Exams (${exams.length})` : `Assignments (${assignments.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={C.primary} />
        ) : activeTab === 'EXAMS' ? (
          <View>
            {/* Quick add */}
            <NiaCard style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder="Subject (e.g. Computer Networks)"
                placeholderTextColor={C.textMuted}
                value={newSubject}
                onChangeText={setNewSubject}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Date YYYY-MM-DD"
                  placeholderTextColor={C.textMuted}
                  value={newDate}
                  onChangeText={setNewDate}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Time HH:MM"
                  placeholderTextColor={C.textMuted}
                  value={newTime}
                  onChangeText={setNewTime}
                />
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Room (optional)"
                  placeholderTextColor={C.textMuted}
                  value={newRoom}
                  onChangeText={setNewRoom}
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddExam} activeOpacity={0.8}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </NiaCard>

            {exams.length === 0 && (
              <Text style={styles.emptyText}>No exams scheduled. Add your first one above.</Text>
            )}
            {exams.map((ex) => (
              <NiaCard key={ex.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <StatusPill label={ex.importance || 'NORMAL'} tone={importanceTone(ex.importance)} />
                  <Text style={styles.countdown}>{countdownLabel(ex.date)}</Text>
                </View>
                <Text style={styles.cardTitle}>{ex.subject}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={C.primaryDeep} />
                  <Text style={styles.metaText}>
                    {ex.date} at {ex.time}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={C.primaryDeep} />
                  <Text style={styles.metaText}>{ex.room ? `Room ${ex.room}` : 'Room TBA'}</Text>
                </View>
                {!!ex.syllabus && (
                  <View style={styles.syllabusBox}>
                    <Text style={styles.syllabusLabel}>Syllabus</Text>
                    <Text style={styles.syllabusText}>{ex.syllabus}</Text>
                  </View>
                )}
              </NiaCard>
            ))}
          </View>
        ) : (
          <View>
            <NiaCard style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder="Assignment title (e.g. Lab Exercise 3)"
                placeholderTextColor={C.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Subject"
                  placeholderTextColor={C.textMuted}
                  value={newAsgSubject}
                  onChangeText={setNewAsgSubject}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Deadline YYYY-MM-DD"
                  placeholderTextColor={C.textMuted}
                  value={newDeadline}
                  onChangeText={setNewDeadline}
                />
              </View>
              <TouchableOpacity style={[styles.addBtn, styles.addBtnFull]} onPress={handleAddAssignment} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Assignment</Text>
              </TouchableOpacity>
            </NiaCard>

            {assignments.length === 0 && (
              <Text style={styles.emptyText}>No assignments tracked. Add your first one above.</Text>
            )}
            {assignments.map((asg) => (
              <NiaCard key={asg.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.subjectTag}>{asg.subject}</Text>
                  <TouchableOpacity
                    onPress={() => asg.id && toggleAssignmentStatus(asg.id)}
                    activeOpacity={0.8}
                  >
                    <StatusPill
                      label={asg.status || 'PENDING'}
                      tone={asg.status === 'SUBMITTED' ? 'success' : 'neutral'}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardTitle}>{asg.title}</Text>
                {!!asg.description && <Text style={styles.cardDesc}>{asg.description}</Text>}
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={13} color={C.primaryDeep} />
                  <Text style={styles.metaText}>
                    Due {(asg.deadline || '').slice(0, 10)} {countdownLabel((asg.deadline || '').slice(0, 10))}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="globe-outline" size={13} color={C.primaryDeep} />
                  <Text style={styles.metaText}>{asg.submissionPlatform || 'Portal'}</Text>
                </View>
              </NiaCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  content: { padding: 16, paddingBottom: 100 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surfaceCard,
    padding: 6,
    marginTop: 12,
    marginBottom: 14,
    borderRadius: designTokens.radii.card,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: C.primaryPill, borderWidth: 1, borderColor: C.primary },
  tabBtnText: { color: C.textSecondary, fontWeight: '700', fontSize: 13 },
  tabBtnTextActive: { color: C.textPrimary },
  inputCard: { marginBottom: 14 },
  input: {
    backgroundColor: C.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: C.textPrimary,
    marginBottom: 8,
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  inputHalf: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    marginBottom: 8,
  },
  addBtnFull: { marginBottom: 0 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', color: C.textSecondary, fontSize: 13, marginTop: 24 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  countdown: { color: C.warning, fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: C.textSecondary, marginBottom: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 12, color: C.textSecondary, fontWeight: '500' },
  syllabusBox: { backgroundColor: C.surfaceSecondary, borderRadius: 10, padding: 10, marginTop: 10 },
  syllabusLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 2 },
  syllabusText: { fontSize: 12, color: C.textPrimary, lineHeight: 16 },
  subjectTag: { fontSize: 11, fontWeight: '800', color: C.primaryDeep, letterSpacing: 0.5 },
});
