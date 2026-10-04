import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';

const C = designTokens.colors;

function pctColor(pct: number): string {
  if (pct >= 75) return '#15803D';
  if (pct >= 60) return '#B45309';
  return '#B91C1C';
}

export const AttendanceScreen: React.FC = () => {
  const { classes, attendance, markAttendance, resetAttendance } = useDashboardStore();
  // H20: 500ms debounce — double-tap Present/Absent must not double-count
  const lastMarkRef = React.useRef<{ name: string; time: number } | null>(null);
  const debouncedMark = (name: string, present: boolean) => {
    const now = Date.now();
    if (lastMarkRef.current && lastMarkRef.current.name === name && now - lastMarkRef.current.time < 500) {
      return;
    }
    lastMarkRef.current = { name, time: now };
    markAttendance(name, present);
  };

  // Real subjects come from the user's own timetable — never hardcoded demo data.
  const subjects = React.useMemo(() => {
    const map = new Map<string, { faculty?: string | null; sessions: number }>();
    for (const c of classes) {
      if (c.isCancelled) continue;
      const e = map.get(c.subjectName) || { faculty: c.faculty, sessions: 0 };
      e.sessions += 1;
      if (!e.faculty && c.faculty) e.faculty = c.faculty;
      map.set(c.subjectName, e);
    }
    return Array.from(map.entries()).map(([name, info]) => ({ name, ...info }));
  }, [classes]);

  const confirmReset = (name: string) => {
    Alert.alert('Reset attendance', `Clear all marked attendance for "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetAttendance(name) },
    ]);
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>ATTENDANCE TRACKER</Text>
        <Text style={styles.sub}>
          Mark each class as attended or missed. Your percentage is computed from your own marks.
        </Text>

        {subjects.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>
              No subjects in your timetable yet. Add classes to start tracking attendance.
            </Text>
          </View>
        ) : (
          subjects.map((s) => {
            const rec = attendance[s.name] || { attended: 0, total: 0 };
            const pct = rec.total > 0 ? Math.round((rec.attended / rec.total) * 100) : 0;
            return (
              <View key={s.name} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{s.name}</Text>
                    {s.faculty ? <Text style={styles.faculty}>{s.faculty}</Text> : null}
                    <Text style={styles.count}>
                      {rec.attended}/{rec.total} classes attended
                    </Text>
                  </View>
                  <View style={[styles.pctBadge, { backgroundColor: pctColor(pct) + '1A' }]}>
                    <Text style={[styles.pctText, { color: pctColor(pct) }]}>{pct}%</Text>
                  </View>
                </View>

                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: pctColor(pct) }]} />
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.markBtn, styles.presentBtn]}
                    onPress={() => debouncedMark(s.name, true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.markText}>Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.markBtn, styles.absentBtn]}
                    onPress={() => debouncedMark(s.name, false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                    <Text style={styles.markText}>Absent</Text>
                  </TouchableOpacity>
                  {rec.total > 0 && (
                    <TouchableOpacity onPress={() => confirmReset(s.name)} style={styles.resetBtn}>
                      <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: designTokens.spacing.lg, paddingBottom: 100 },
  header: { fontSize: 11, fontWeight: '700', color: C.textPrimary, letterSpacing: 0.6, marginBottom: 4 },
  sub: { fontSize: 12, color: C.textSecondary, marginBottom: 16, lineHeight: 18 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: C.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    ...designTokens.shadows.card,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  faculty: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  count: { fontSize: 12, color: C.textMuted, marginTop: 4 },
  pctBadge: { borderRadius: designTokens.radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  pctText: { fontSize: 16, fontWeight: '800' },
  barBg: { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', marginBottom: 12, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  btnRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: designTokens.radii.pill,
    flex: 1,
  },
  presentBtn: { backgroundColor: '#15803D' },
  absentBtn: { backgroundColor: '#B91C1C' },
  markText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  resetBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  resetText: { color: C.textMuted, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
});
