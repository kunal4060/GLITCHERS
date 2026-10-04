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
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.subTitle}>Overall academic attendance tracker & bunk advisor</Text>
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
              <Text
                style={[
                  styles.statusBadgeText,
                  overallPct >= 80 ? styles.badgeTextSuccess : overallPct >= 75 ? styles.badgeTextWarning : styles.badgeTextDanger,
                ]}
              >
                {overallPct >= 80 ? 'SAFE ZONE' : overallPct >= 75 ? 'MARGINAL' : 'ALERT'}
              </Text>
            </View>
            <Text style={styles.targetNote}>Minimum required: 75%</Text>
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
                  <Text style={styles.courseCode}>{course.code}</Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={designTokens.colors.primaryDark} />
                    <Text style={styles.bunkSafeText}>
                      Can safely miss <Text style={{ fontWeight: '800' }}>{safeBunks}</Text> classes
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    <Ionicons name="alert-circle-outline" size={13} color={designTokens.colors.accentPeachDot} />
                    <Text style={styles.bunkAlertText}>
                      Must attend <Text style={{ fontWeight: '800' }}>{needToAttend}</Text> classes to hit 75%
                    </Text>
                  </View>
                )}

                <View style={styles.btnGroup}>
                  <TouchableOpacity style={styles.presentBtn} onPress={() => markAttendance(course.id, true)}>
                    <Text style={styles.btnTextPresent}>+ Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.absentBtn} onPress={() => markAttendance(course.id, false)}>
                    <Text style={styles.btnTextAbsent}>- Absent</Text>
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
  title: { fontSize: 24, fontWeight: '800', color: designTokens.colors.textPrimary },
  subTitle: { fontSize: 13, color: designTokens.colors.textSecondary, marginTop: 4 },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: '#D8E8E7',
    borderRadius: designTokens.radii.card,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(117, 167, 165, 0.20)',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...designTokens.shadows.card,
  },
  scoreLeft: { flex: 1 },
  scoreNumber: { fontSize: 36, fontWeight: '800', color: designTokens.colors.primaryDeep },
  scoreLabel: { fontSize: 11, fontWeight: '700', color: designTokens.colors.textSecondary, letterSpacing: 0.5, marginTop: 2 },
  scoreDetail: { fontSize: 12, color: designTokens.colors.textSecondary, marginTop: 4 },
  scoreRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: designTokens.radii.pill },
  badgeSuccess: { backgroundColor: designTokens.colors.primarySoft },
  badgeWarning: { backgroundColor: designTokens.colors.accentPeachCard },
  badgeDanger: { backgroundColor: '#FADBD8' },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextSuccess: { color: designTokens.colors.primaryDeep },
  badgeTextWarning: { color: designTokens.colors.accentPeachDeep },
  badgeTextDanger: { color: designTokens.colors.accentWine },
  targetNote: { fontSize: 11, color: designTokens.colors.textSecondary, marginTop: 6 },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: designTokens.colors.textPrimary, letterSpacing: 0.6, marginBottom: 12 },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    ...designTokens.shadows.card,
  },
  courseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseInfo: { flex: 1, paddingRight: 10 },
  courseCode: { fontSize: 11, fontWeight: '700', color: designTokens.colors.primaryDark, textTransform: 'uppercase' },
  courseName: { fontSize: 15, fontWeight: '700', color: designTokens.colors.textPrimary, marginTop: 2 },
  facultyName: { fontSize: 12, color: designTokens.colors.textSecondary, marginTop: 3 },
  pctBox: { alignItems: 'flex-end' },
  pctNumber: { fontSize: 20, fontWeight: '800' },
  classesRatio: { fontSize: 12, color: designTokens.colors.textMuted, marginTop: 2 },
  textSuccess: { color: designTokens.colors.primaryDark },
  textWarning: { color: designTokens.colors.accentPeachDot },
  textDanger: { color: designTokens.colors.accentWine },
  progressBg: {
    height: 6,
    backgroundColor: '#E6E0D4',
    borderRadius: 3,
    marginTop: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  bgSuccess: { backgroundColor: designTokens.colors.primary },
  bgWarning: { backgroundColor: designTokens.colors.accentPeachDot },
  bgDanger: { backgroundColor: designTokens.colors.accentWine },
  advisorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 51, 50, 0.06)',
  },
  bunkSafeText: { fontSize: 11, color: designTokens.colors.primaryDeep },
  bunkAlertText: { fontSize: 11, color: designTokens.colors.accentWine },
  btnGroup: { flexDirection: 'row', gap: 6 },
  presentBtn: { backgroundColor: designTokens.colors.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: designTokens.radii.pill },
  absentBtn: { backgroundColor: '#EAE5DB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: designTokens.radii.pill },
  btnTextPresent: { color: designTokens.colors.primaryDeep, fontSize: 11, fontWeight: '700' },
  btnTextAbsent: { color: designTokens.colors.textSecondary, fontSize: 11, fontWeight: '700' },
});
