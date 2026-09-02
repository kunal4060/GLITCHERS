import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { theme } from '../theme/theme';
import type { Exam, Assignment } from '@glitchers/shared';

export const ExamsAndAssignmentsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXAMS' | 'ASSIGNMENTS'>('EXAMS');

  const [exams, setExams] = useState<Exam[]>([
    {
      id: 'ex_1',
      userId: 'u1',
      subject: 'Database Management Systems (DBMS)',
      date: '2026-09-15',
      time: '10:00 AM',
      room: 'Exam Hall 3 (Block A)',
      syllabus: 'Modules 1-4: Relational Algebra, SQL, Normalization, Transactions',
      importance: 'CRITICAL',
    },
    {
      id: 'ex_2',
      userId: 'u1',
      subject: 'Operating Systems',
      date: '2026-09-18',
      time: '02:00 PM',
      room: 'Exam Hall 1 (Block B)',
      syllabus: 'Processes, CPU Scheduling, Deadlocks, Memory Management',
      importance: 'CRITICAL',
    },
  ]);

  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: 'as_1',
      userId: 'u1',
      title: 'Machine Learning Project Proposal',
      subject: 'Artificial Intelligence',
      description: 'Submit 3-page problem formulation and dataset selection.',
      deadline: '2026-09-08',
      submissionPlatform: 'Moodle Portal',
      priority: 'HIGH',
      status: 'PENDING',
    },
    {
      id: 'as_2',
      userId: 'u1',
      title: 'DBMS Normalization & BCNF Query Sheet',
      subject: 'Database Systems',
      description: 'Decompose schemas into 3NF and BCNF with functional dependencies.',
      deadline: '2026-09-10',
      submissionPlatform: 'Google Classroom',
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
      userId: 'u1',
      subject: newSubject.trim(),
      date: '2026-09-25',
      time: '10:00 AM',
      room: 'Main Auditorium',
      syllabus: 'Full Course Syllabus',
      importance: 'CRITICAL',
    };
    setExams([...exams, newExam]);
    setNewSubject('');
    Alert.alert('Exam Added', `Added ${newExam.subject} to your exam schedule with priority alerts.`);
  };

  const handleAddAssignment = () => {
    if (!newTitle.trim()) return;
    const newAsg: Assignment = {
      id: String(Date.now()),
      userId: 'u1',
      title: newTitle.trim(),
      subject: 'Computer Science',
      deadline: '2026-09-14',
      submissionPlatform: 'University Portal',
      priority: 'HIGH',
      status: 'PENDING',
    };
    setAssignments([...assignments, newAsg]);
    setNewTitle('');
    Alert.alert('Assignment Added', `Added ${newAsg.title} to submission tracker.`);
  };

  const toggleAssignmentStatus = (id: string) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === 'PENDING' ? 'SUBMITTED' : 'PENDING' } : a))
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Controls */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'EXAMS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('EXAMS')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'EXAMS' && styles.tabBtnTextActive]}>
            📝 Exams ({exams.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ASSIGNMENTS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ASSIGNMENTS')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ASSIGNMENTS' && styles.tabBtnTextActive]}>
            📚 Assignments ({assignments.length})
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
                placeholder="Add Exam Subject (e.g. Computer Networks)..."
                placeholderTextColor="#64748B"
                value={newSubject}
                onChangeText={setNewSubject}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddExam}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {exams.map((ex) => (
              <View key={ex.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.criticalBadge}>
                    <Text style={styles.criticalBadgeText}>{ex.importance}</Text>
                  </View>
                  <Text style={styles.countdownBadge}>Starts in 12 days</Text>
                </View>

                <Text style={styles.cardTitle}>{ex.subject}</Text>
                <Text style={styles.cardDate}>
                  📅 {ex.date} at {ex.time}
                </Text>
                <Text style={styles.cardRoom}>📍 Room: {ex.room || 'TBD'}</Text>
                {ex.syllabus && (
                  <View style={styles.syllabusBox}>
                    <Text style={styles.syllabusLabel}>Syllabus Coverage:</Text>
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
                placeholder="Add Assignment Title (e.g. Lab Exercise 3)..."
                placeholderTextColor="#64748B"
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddAssignment}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {assignments.map((asg) => (
              <View key={asg.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.subjectTag}>{asg.subject}</Text>
                  <TouchableOpacity
                    style={[styles.statusPill, asg.status === 'SUBMITTED' ? styles.statusDone : styles.statusPending]}
                    onPress={() => asg.id && toggleAssignmentStatus(asg.id)}
                  >
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: theme.colors.primary },
  tabBtnText: { color: theme.colors.textSecondary, fontWeight: 'bold', fontSize: 13 },
  tabBtnTextActive: { color: '#0B0F19' },
  content: { flex: 1 },
  scrollPadding: { padding: 16, paddingBottom: 100 },
  inputCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  input: { flex: 1, color: theme.colors.text, paddingHorizontal: 12, fontSize: 13 },
  addBtn: { backgroundColor: theme.colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#0B0F19', fontWeight: 'bold', fontSize: 13 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  criticalBadge: { backgroundColor: theme.colors.dangerGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  criticalBadgeText: { color: theme.colors.danger, fontSize: 10, fontWeight: 'bold' },
  countdownBadge: { color: theme.colors.warning, fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  cardDate: { fontSize: 13, color: theme.colors.primary, marginTop: 6, fontWeight: '500' },
  cardRoom: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  syllabusBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  syllabusLabel: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textSecondary },
  syllabusText: { fontSize: 12, color: theme.colors.text, marginTop: 2, lineHeight: 16 },
  subjectTag: { fontSize: 11, fontWeight: 'bold', color: theme.colors.primary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  statusPending: { backgroundColor: theme.colors.warningGlow },
  statusPendingText: { color: theme.colors.warning, fontSize: 11, fontWeight: 'bold' },
  statusDone: { backgroundColor: theme.colors.successGlow },
  statusDoneText: { color: theme.colors.success, fontSize: 11, fontWeight: 'bold' },
  cardDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.surfaceBorder },
  metaItem: { fontSize: 11, color: theme.colors.textMuted },
});
