import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useAuthStore } from '../store/authStore';
import type { Exam, Assignment } from '@glitchers/shared';

export const ExamsAndAssignmentsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXAMS' | 'ASSIGNMENTS'>('EXAMS');
  const currentUserId = useAuthStore.getState().user?.id || 'offline-user';

  const [exams, setExams] = useState<Exam[]>([
    {
      id: 'ex_1',
      userId: currentUserId,
      subject: 'CSE3002 — Artificial Intelligence',
      date: '2026-09-25',
      time: '10:00 AM',
      room: 'Main Auditorium',
      syllabus: 'Modules 1 to 4 • Search algorithms & heuristics',
      importance: 'CRITICAL',
    },
    {
      id: 'ex_2',
      userId: currentUserId,
      subject: 'MAT1003 — Discrete Mathematics',
      date: '2026-09-29',
      time: '02:00 PM',
      room: 'Hall 402',
      syllabus: 'Graph theory, combinatorics & recurrence relations',
      importance: 'CRITICAL',
    },
  ]);

  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: 'asg_1',
      userId: currentUserId,
      title: 'Operating Systems Virtual Memory Lab',
      subject: 'Operating Systems',
      deadline: '2026-09-14',
      submissionPlatform: 'Moodle Portal',
      priority: 'HIGH',
      status: 'PENDING',
    },
    {
      id: 'asg_2',
      userId: currentUserId,
      title: 'Database Normalization Problem Set 2',
      subject: 'Database Systems',
      deadline: '2026-09-18',
      submissionPlatform: 'GitHub Classroom',
      priority: 'HIGH',
      status: 'SUBMITTED',
    },
  ]);

  const [newSubject, setNewSubject] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const handleAddExam = () => {
    if (!newSubject.trim()) return;
    const newExam: Exam = {
      id: String(Date.now()),
      userId: currentUserId,
      subject: newSubject.trim(),
      date: '2026-09-30',
      time: '10:00 AM',
      room: 'Main Auditorium',
      syllabus: 'Comprehensive mid-semester syllabus',
      importance: 'CRITICAL',
    };
    setExams([...exams, newExam]);
    setNewSubject('');
    Alert.alert('Exam Added', `Added ${newExam.subject} to your exam schedule.`);
  };

  const handleAddAssignment = () => {
    if (!newTitle.trim()) return;
    const newAsg: Assignment = {
      id: String(Date.now()),
      userId: currentUserId,
      title: newTitle.trim(),
      subject: 'Computer Science',
      deadline: '2026-09-20',
      submissionPlatform: 'University Portal',
      priority: 'HIGH',
      status: 'PENDING',
    };
    setAssignments([...assignments, newAsg]);
    setNewTitle('');
    Alert.alert('Assignment Added', `Added "${newAsg.title}" to submission tracker.`);
  };

  const toggleAssignmentStatus = (id: string) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === 'PENDING' ? 'SUBMITTED' : 'PENDING' } : a))
    );
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTag}>ACADEMIC EVALUATION</Text>
          </View>
          <Text style={styles.title}>Exams & Deadlines</Text>
          <Text style={styles.subTitle}>Semester exam roadmap & assignment submissions</Text>
        </View>

        {/* Segmented Controls */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'EXAMS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('EXAMS')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={activeTab === 'EXAMS' ? '#FFFFFF' : '#76777D'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'EXAMS' && styles.tabBtnTextActive]}>
              Exams ({exams.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ASSIGNMENTS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ASSIGNMENTS')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="document-text"
              size={13}
              color={activeTab === 'ASSIGNMENTS' ? '#FFFFFF' : '#76777D'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'ASSIGNMENTS' && styles.tabBtnTextActive]}>
              Assignments ({assignments.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollPadding}>
          {activeTab === 'EXAMS' ? (
            <View>
              {/* Quick Add Exam Input */}
              <View style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Add exam subject (e.g. Computer Networks)..."
                  placeholderTextColor="#9CA3AF"
                  value={newSubject}
                  onChangeText={setNewSubject}
                />
                <TouchableOpacity
                  style={[styles.addBtn, !newSubject.trim() && { opacity: 0.5 }]}
                  onPress={handleAddExam}
                  disabled={!newSubject.trim()}
                >
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {exams.map((ex) => (
                <View key={ex.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.criticalBadge}>
                      <View style={styles.criticalDot} />
                      <Text style={styles.criticalBadgeText}>{ex.importance}</Text>
                    </View>
                    <Text style={styles.countdownBadge}>Scheduled</Text>
                  </View>

                  <Text style={styles.cardTitle}>{ex.subject}</Text>
                  <View style={styles.cardMetaRow}>
                    <Ionicons name="time-outline" size={13} color="#006A63" />
                    <Text style={styles.cardDate}>
                      {ex.date} at {ex.time}
                    </Text>
                  </View>
                  <View style={styles.cardMetaRow}>
                    <Ionicons name="location-outline" size={13} color="#76777D" />
                    <Text style={styles.cardRoom}>Room: {ex.room || 'TBD'}</Text>
                  </View>

                  {ex.syllabus && (
                    <View style={styles.syllabusBox}>
                      <Text style={styles.syllabusLabel}>SYLLABUS COVERAGE</Text>
                      <Text style={styles.syllabusText}>{ex.syllabus}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View>
              {/* Quick Add Assignment Input */}
              <View style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Add assignment title (e.g. Lab Exercise 3)..."
                  placeholderTextColor="#9CA3AF"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <TouchableOpacity
                  style={[styles.addBtn, !newTitle.trim() && { opacity: 0.5 }]}
                  onPress={handleAddAssignment}
                  disabled={!newTitle.trim()}
                >
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {assignments.map((asg) => (
                <View key={asg.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectTag}>{asg.subject}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.statusPill, asg.status === 'SUBMITTED' ? styles.statusDone : styles.statusPending]}
                      onPress={() => asg.id && toggleAssignmentStatus(asg.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={asg.status === 'SUBMITTED' ? 'checkmark-circle' : 'time-outline'}
                        size={12}
                        color={asg.status === 'SUBMITTED' ? '#006A63' : '#D97706'}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          asg.status === 'SUBMITTED' ? styles.statusDoneText : styles.statusPendingText,
                        ]}
                      >
                        {asg.status}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cardTitle}>{asg.title}</Text>
                  {asg.description && <Text style={styles.cardDesc}>{asg.description}</Text>}

                  <View style={styles.metaRow}>
                    <Text style={styles.metaItem}>⏳ Due: {asg.deadline}</Text>
                    <Text style={styles.metaItem}>🌐 {asg.submissionPlatform || 'Portal'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 8,
  },
  headerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#006A63' },
  headerTag: { fontSize: 10, fontWeight: '800', color: '#76777D', letterSpacing: 0.8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  subTitle: { fontSize: 12, color: '#76777D', marginTop: 3 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: designTokens.radii.pill,
  },
  tabBtnActive: {
    backgroundColor: '#111827',
  },
  tabBtnText: {
    color: '#76777D',
    fontWeight: '700',
    fontSize: 12,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  content: { flex: 1 },
  scrollPadding: { paddingHorizontal: 16, paddingBottom: 100 },
  inputCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
    alignItems: 'center',
    ...designTokens.shadows.card,
  },
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    paddingVertical: 10,
  },
  addBtn: {
    backgroundColor: '#111827',
    borderRadius: designTokens.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    ...designTokens.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  criticalDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#BA1A1A',
  },
  criticalBadgeText: {
    color: '#BA1A1A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownBadge: {
    color: '#76777D',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  cardDate: {
    fontSize: 12,
    color: '#006A63',
    fontWeight: '600',
  },
  cardRoom: {
    fontSize: 12,
    color: '#76777D',
  },
  syllabusBox: {
    backgroundColor: 'rgba(0, 106, 99, 0.04)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.10)',
  },
  syllabusLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#006A63',
    letterSpacing: 0.6,
  },
  syllabusText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
    lineHeight: 16,
  },
  subjectBadge: {
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subjectTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006A63',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: designTokens.radii.pill,
  },
  statusPending: {
    backgroundColor: 'rgba(217, 119, 6, 0.10)',
  },
  statusPendingText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
  },
  statusDone: {
    backgroundColor: 'rgba(0, 106, 99, 0.10)',
  },
  statusDoneText: {
    color: '#006A63',
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 12,
    color: '#76777D',
    marginTop: 6,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 28, 29, 0.05)',
  },
  metaItem: {
    fontSize: 11,
    color: '#76777D',
  },
});
