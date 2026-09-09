import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';

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
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTag}>ATTENDANCE REGISTRY</Text>
          </View>
          <Text style={styles.title}>Academic Attendance</Text>
          <Text style={styles.subTitle}>Overall course attendance tracking & AI bunk advisor</Text>
        </View>

        {/* Obsidian Hero Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreTopRow}>
            <View>
              <Text style={styles.scoreLabel}>OVERALL ATTENDANCE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <Text style={styles.scoreNumber}>{overallPct}%</Text>
                <Text style={styles.scoreDetail}>
                  {totalAttended} / {totalClasses} sessions
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                overallPct >= 80 ? styles.badgeSuccess : overallPct >= 75 ? styles.badgeWarning : styles.badgeDanger,
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  { backgroundColor: overallPct >= 80 ? '#006A63' : overallPct >= 75 ? '#D97706' : '#BA1A1A' },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  overallPct >= 80 ? styles.badgeTextSuccess : overallPct >= 75 ? styles.badgeTextWarning : styles.badgeTextDanger,
                ]}
              >
                {overallPct >= 80 ? 'SAFE ZONE' : overallPct >= 75 ? 'MARGINAL' : 'ALERT'}
              </Text>
            </View>
          </View>

          {/* Progress Track */}
          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${Math.min(100, overallPct)}%`,
                  backgroundColor: overallPct >= 80 ? '#006A63' : overallPct >= 75 ? '#F59E0B' : '#BA1A1A',
                },
              ]}
            />
          </View>

          <View style={styles.heroFooter}>
            <Text style={styles.targetNote}>Requirement: 75% minimum threshold</Text>
            <Text style={styles.heroSummaryNote}>
              {overallPct >= 75 ? '✓ Criteria Satisfied' : '⚠️ Action Needed'}
            </Text>
          </View>
        </View>

        {/* Course Breakdown */}
        <Text style={styles.sectionHeader}>COURSES & BUNK ADVISOR</Text>

        {courses.map((course) => {
          const pct = Math.round((course.attended / course.total) * 100);
          const safeBunks = Math.max(0, Math.floor(course.attended / 0.75 - course.total));
          const needToAttend = pct < 75 ? Math.ceil((0.75 * course.total - course.attended) / 0.25) : 0;

          return (
            <View key={course.id} style={styles.courseCard}>
              <View style={styles.courseTopRow}>
                <View style={styles.courseInfo}>
                  <View style={styles.courseCodeBadge}>
                    <Text style={styles.courseCode}>{course.code}</Text>
                  </View>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.facultyName}>{course.faculty}</Text>
                </View>

                <View style={styles.pctBox}>
                  <Text
                    style={[
                      styles.pctNumber,
                      pct >= 80 ? styles.textSuccess : pct >= 75 ? styles.textWarning : styles.textDanger,
                    ]}
                  >
                    {pct}%
                  </Text>
                  <Text style={styles.classesRatio}>
                    {course.attended}/{course.total} attended
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

              {/* Bunk Advisor Row */}
              <View style={styles.advisorRow}>
                {pct >= 75 ? (
                  <View style={styles.bunkSafeBox}>
                    <Ionicons name="shield-checkmark" size={12} color="#006A63" />
                    <Text style={styles.bunkSafeText}>
                      Can safely bunk <Text style={{ fontWeight: '800' }}>{safeBunks}</Text> class{safeBunks === 1 ? '' : 'es'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.bunkAlertBox}>
                    <Ionicons name="alert-circle" size={12} color="#BA1A1A" />
                    <Text style={styles.bunkAlertText}>
                      Must attend next <Text style={{ fontWeight: '800' }}>{needToAttend}</Text> class{needToAttend === 1 ? '' : 'es'}
                    </Text>
                  </View>
                )}

                <View style={styles.btnGroup}>
                  <TouchableOpacity
                    style={styles.presentBtn}
                    onPress={() => markAttendance(course.id, true)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="checkmark" size={12} color="#006A63" />
                    <Text style={styles.btnTextPresent}>Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.absentBtn}
                    onPress={() => markAttendance(course.id, false)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="close" size={12} color="#BA1A1A" />
                    <Text style={styles.btnTextAbsent}>Absent</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: designTokens.spacing.lg, paddingBottom: 100 },
  header: { marginBottom: 16 },
  headerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#006A63' },
  headerTag: { fontSize: 10, fontWeight: '800', color: '#76777D', letterSpacing: 0.8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  subTitle: { fontSize: 12, color: '#76777D', marginTop: 3 },
  scoreCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#111827',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  scoreTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scoreNumber: { fontSize: 38, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  scoreLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.8 },
  scoreDetail: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: designTokens.radii.pill,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeSuccess: { backgroundColor: 'rgba(0, 106, 99, 0.20)' },
  badgeWarning: { backgroundColor: 'rgba(217, 119, 6, 0.20)' },
  badgeDanger: { backgroundColor: 'rgba(186, 26, 26, 0.20)' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  badgeTextSuccess: { color: '#34D399' },
  badgeTextWarning: { color: '#FBBF24' },
  badgeTextDanger: { color: '#F87171' },
  heroProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 3,
    marginTop: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroProgressFill: { height: '100%', borderRadius: 3 },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetNote: { fontSize: 11, color: '#9CA3AF' },
  heroSummaryNote: { fontSize: 11, fontWeight: '700', color: '#E5E7EB' },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#76777D',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    ...designTokens.shadows.card,
  },
  courseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseInfo: { flex: 1, paddingRight: 10 },
  courseCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  courseCode: { fontSize: 10, fontWeight: '800', color: '#006A63', letterSpacing: 0.5 },
  courseName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  facultyName: { fontSize: 12, color: '#76777D', marginTop: 2 },
  pctBox: { alignItems: 'flex-end' },
  pctNumber: { fontSize: 22, fontWeight: '800' },
  classesRatio: { fontSize: 11, color: '#76777D', marginTop: 2 },
  textSuccess: { color: '#006A63' },
  textWarning: { color: '#D97706' },
  textDanger: { color: '#BA1A1A' },
  progressBg: {
    height: 5,
    backgroundColor: 'rgba(26, 28, 29, 0.06)',
    borderRadius: 2.5,
    marginTop: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2.5 },
  bgSuccess: { backgroundColor: '#006A63' },
  bgWarning: { backgroundColor: '#D97706' },
  bgDanger: { backgroundColor: '#BA1A1A' },
  advisorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 28, 29, 0.05)',
  },
  bunkSafeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bunkSafeText: { fontSize: 11, color: '#006A63', fontWeight: '500' },
  bunkAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bunkAlertText: { fontSize: 11, color: '#BA1A1A', fontWeight: '500' },
  btnGroup: { flexDirection: 'row', gap: 6 },
  presentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.15)',
  },
  absentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.15)',
  },
  btnTextPresent: { color: '#006A63', fontSize: 11, fontWeight: '700' },
  btnTextAbsent: { color: '#BA1A1A', fontSize: 11, fontWeight: '700' },
});
