import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

interface CourseAttendance {
  id: string;
  code: string;
  name: string;
  attended: number;
  total: number;
  faculty: string;
}

const INITIAL_ATTENDANCE: CourseAttendance[] = [
  {
    id: '1',
    code: 'CSE3002',
    name: 'Artificial Intelligence',
    attended: 28,
    total: 30,
    faculty: 'MITHILESH KUMAR DUBEY',
  },
  {
    id: '2',
    code: 'ECE2002',
    name: 'Computer Organization and Architecture',
    attended: 22,
    total: 26,
    faculty: 'PULLURI HARISH',
  },
  {
    id: '3',
    code: 'MAT1003',
    name: 'Discrete Mathematical Structures',
    attended: 21,
    total: 28,
    faculty: 'Venkatrajam Marka',
  },
  {
    id: '4',
    code: 'MGT1040',
    name: 'Entrepreneurship',
    attended: 18,
    total: 20,
    faculty: 'Ishfaq Ahmad Thaku',
  },
];

export const AttendanceScreen: React.FC = () => {
  const [courses, setCourses] = useState(INITIAL_ATTENDANCE);

  const totalAttended = courses.reduce((sum, c) => sum + c.attended, 0);
  const totalClasses = courses.reduce((sum, c) => sum + c.total, 0);
  const overallPct = Math.round((totalAttended / (totalClasses || 1)) * 100);

  const markAttendance = (id: string, isPresent: boolean) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            total: c.total + 1,
            attended: isPresent ? c.attended + 1 : c.attended,
          };
        }
        return c;
      })
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subTitle}>Overall academic attendance tracker & bunk manager</Text>
      </View>

      {/* Overall Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreLeft}>
          <Text style={styles.scoreNumber}>{overallPct}%</Text>
          <Text style={styles.scoreLabel}>OVERALL ATTENDANCE</Text>
          <Text style={styles.scoreDetail}>
            {totalAttended} of {totalClasses} classes attended
          </Text>
        </View>

        <View style={styles.scoreRight}>
          <View
            style={[
              styles.statusBadge,
              overallPct >= 80 ? styles.badgeSuccess : overallPct >= 75 ? styles.badgeWarning : styles.badgeDanger,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {overallPct >= 80 ? 'SAFE ZONE' : overallPct >= 75 ? 'MARGINAL' : 'ATTENDANCE ALERT'}
            </Text>
          </View>
          <Text style={styles.targetNote}>Minimum required: 75%</Text>
        </View>
      </View>

      {/* Course Breakdown */}
      <Text style={styles.sectionHeader}>COURSES & BUNK ADVISOR</Text>

      {courses.map((course) => {
        const pct = Math.round((course.attended / course.total) * 100);
        // Bunk calculation: max classes you can miss while keeping attended / (total + x) >= 0.75
        // attended / (total + x) >= 0.75 => attended / 0.75 - total >= x
        const safeBunks = Math.max(0, Math.floor(course.attended / 0.75 - course.total));

        // Need to attend: if below 75%, how many in a row to reach 75%
        // (attended + y) / (total + y) >= 0.75 => y >= (0.75 * total - attended) / 0.25
        const needToAttend = pct < 75 ? Math.ceil((0.75 * course.total - course.attended) / 0.25) : 0;

        return (
          <View key={course.id} style={styles.courseCard}>
            <View style={styles.courseTopRow}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseCode}>{course.code}</Text>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.facultyName}>{course.faculty}</Text>
              </View>

              <View style={styles.pctBox}>
                <Text style={[styles.pctNumber, pct >= 80 ? styles.textSuccess : pct >= 75 ? styles.textWarning : styles.textDanger]}>
                  {pct}%
                </Text>
                <Text style={styles.classesRatio}>
                  {course.attended}/{course.total}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, pct)}%` },
                  pct >= 80 ? styles.bgSuccess : pct >= 75 ? styles.bgWarning : styles.bgDanger,
                ]}
              />
            </View>

            {/* Bunk Advisor Pill */}
            <View style={styles.advisorRow}>
              {pct >= 75 ? (
                <Text style={styles.bunkSafeText}>
                  🛡️ You can safely bunk <Text style={{ fontWeight: '800' }}>{safeBunks}</Text> more classes
                </Text>
              ) : (
                <Text style={styles.bunkAlertText}>
                  ⚠️ Must attend next <Text style={{ fontWeight: '800' }}>{needToAttend}</Text> classes to hit 75%
                </Text>
              )}

              <View style={styles.btnGroup}>
                <TouchableOpacity style={styles.presentBtn} onPress={() => markAttendance(course.id, true)}>
                  <Text style={styles.btnText}>+ Present</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.absentBtn} onPress={() => markAttendance(course.id, false)}>
                  <Text style={styles.btnText}>- Absent</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  subTitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLeft: { flex: 1 },
  scoreNumber: { fontSize: 36, fontWeight: '900', color: '#60A5FA' },
  scoreLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5, marginTop: 2 },
  scoreDetail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  scoreRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  badgeWarning: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  targetNote: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  courseCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  courseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseInfo: { flex: 1, paddingRight: 10 },
  courseCode: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  courseName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  facultyName: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  pctBox: { alignItems: 'flex-end' },
  pctNumber: { fontSize: 20, fontWeight: '800' },
  classesRatio: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  textSuccess: { color: '#10B981' },
  textWarning: { color: '#F59E0B' },
  textDanger: { color: '#EF4444' },
  progressBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 3,
    marginTop: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  bgSuccess: { backgroundColor: '#10B981' },
  bgWarning: { backgroundColor: '#F59E0B' },
  bgDanger: { backgroundColor: '#EF4444' },
  advisorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  bunkSafeText: { fontSize: 11, color: '#93C5FD', flex: 1 },
  bunkAlertText: { fontSize: 11, color: '#FCA5A5', flex: 1 },
  btnGroup: { flexDirection: 'row', gap: 6 },
  presentBtn: { backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  absentBtn: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  btnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
