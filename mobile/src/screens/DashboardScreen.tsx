import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { classes, tasks, expenses, budget, debts, emails, isBackendConnected, syncWithBackend } = useDashboardStore();

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = budget ? Math.max(0, budget.monthlyLimit - totalSpent) : 0;
  const toReceive = debts.filter((d) => d.type === 'OWES_ME' && d.status !== 'PAID').reduce((sum, d) => sum + Number(d.amount), 0);
  const toPay = debts.filter((d) => d.type === 'I_OWE' && d.status !== 'PAID').reduce((sum, d) => sum + Number(d.amount), 0);

  const nextClass = classes[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Greeting & Connection Status */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.userName}>{user?.fullName || 'Student'}</Text>
          </View>
          <View style={[styles.statusPill, isBackendConnected ? styles.statusOnline : styles.statusOffline]}>
            <Text style={[styles.statusPillText, isBackendConnected ? styles.statusOnlineText : styles.statusOfflineText]}>
              {isBackendConnected ? '● Live API' : '○ Local Sync'}
            </Text>
          </View>
        </View>
        <Text style={styles.subtext}>{user?.university || 'Engineering College'}</Text>
      </View>

      {/* Next Class Banner */}
      {nextClass && (
        <View style={styles.nextClassCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderLabel}>NEXT CLASS</Text>
            <View style={styles.liveTag}>
              <Text style={styles.liveTagText}>Starts in 18 mins</Text>
            </View>
          </View>
          <Text style={styles.nextClassName}>{nextClass.subjectName}</Text>
          <Text style={styles.nextClassDetails}>
            {nextClass.startTime} – {nextClass.endTime} • Room: {nextClass.room || 'AB1-204'}
          </Text>
          <Text style={styles.nextClassFaculty}>Faculty: {nextClass.faculty || 'Professor'}</Text>
        </View>
      )}

      {/* Today at a Glance Summary */}
      <View style={styles.glanceRow}>
        <View style={styles.glanceBox}>
          <Text style={styles.glanceNumber}>{classes.length}</Text>
          <Text style={styles.glanceLabel}>Classes Today</Text>
        </View>
        <View style={styles.glanceBox}>
          <Text style={styles.glanceNumber}>{tasks.length}</Text>
          <Text style={styles.glanceLabel}>Pending Tasks</Text>
        </View>
        <View style={styles.glanceBox}>
          <Text style={styles.glanceNumber}>{emails.length}</Text>
          <Text style={styles.glanceLabel}>Important Emails</Text>
        </View>
      </View>

      {/* Upcoming Academic Deadlines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>UPCOMING DEADLINES</Text>
        {tasks.slice(0, 2).map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskPriority}>{task.priority}</Text>
            </View>
            <Text style={styles.taskDue}>Due in 2 days</Text>
          </View>
        ))}
      </View>

      {/* Monthly Finance Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FINANCE & BUDGET</Text>
        <View style={styles.financeCard}>
          <View style={styles.financeRow}>
            <View>
              <Text style={styles.financeLabel}>Spent This Month</Text>
              <Text style={styles.financeValue}>₹{totalSpent.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.financeLabel}>Budget Remaining</Text>
              <Text style={styles.remainingValue}>₹{remaining.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (totalSpent / (budget?.monthlyLimit || 10000)) * 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Borrow / Lend Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BORROW & LEND</Text>
        <View style={styles.debtSummaryRow}>
          <View style={[styles.debtBox, { borderColor: '#10B981' }]}>
            <Text style={styles.debtBoxLabel}>To Receive</Text>
            <Text style={[styles.debtBoxValue, { color: '#10B981' }]}>₹{toReceive}</Text>
          </View>
          <View style={[styles.debtBox, { borderColor: '#F43F5E' }]}>
            <Text style={styles.debtBoxLabel}>To Pay</Text>
            <Text style={[styles.debtBoxValue, { color: '#F43F5E' }]}>₹{toPay}</Text>
          </View>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AI Chat')}>
          <Text style={styles.quickBtnText}>🤖 Ask AI Companion</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtnSecondary} onPress={() => navigation.navigate('Timetable')}>
          <Text style={styles.quickBtnSecondaryText}>🗓 View Full Timetable</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusOnline: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  statusOffline: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  statusOnlineText: { color: '#10B981' },
  statusOfflineText: { color: '#94A3B8' },
  greeting: { fontSize: 16, color: '#94A3B8' },
  userName: { fontSize: 26, fontWeight: 'bold', color: '#F8FAFC' },
  subtext: { fontSize: 13, color: '#64748B', marginTop: 2 },
  nextClassCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 16,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderLabel: { fontSize: 12, fontWeight: 'bold', color: '#38BDF8', letterSpacing: 1 },
  liveTag: { backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liveTagText: { fontSize: 11, color: '#38BDF8', fontWeight: 'bold' },
  nextClassName: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', marginTop: 8 },
  nextClassDetails: { fontSize: 14, color: '#CBD5E1', marginTop: 4 },
  nextClassFaculty: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  glanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  glanceBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginHorizontal: 4, alignItems: 'center' },
  glanceNumber: { fontSize: 20, fontWeight: 'bold', color: '#38BDF8' },
  glanceLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748B', letterSpacing: 1, marginBottom: 10 },
  taskCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 8 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 14, fontWeight: '600', color: '#F8FAFC', flex: 1 },
  taskPriority: { fontSize: 10, fontWeight: 'bold', color: '#F59E0B', marginLeft: 8 },
  taskDue: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  financeCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  financeLabel: { fontSize: 12, color: '#94A3B8' },
  financeValue: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', marginTop: 2 },
  remainingValue: { fontSize: 18, fontWeight: 'bold', color: '#10B981', marginTop: 2 },
  progressBarBg: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#38BDF8', borderRadius: 4 },
  debtSummaryRow: { flexDirection: 'row', gap: 12 },
  debtBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, borderWidth: 1 },
  debtBoxLabel: { fontSize: 12, color: '#94A3B8' },
  debtBoxValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  quickActions: { marginTop: 10, gap: 10 },
  quickBtn: { backgroundColor: '#3B82F6', borderRadius: 12, padding: 14, alignItems: 'center' },
  quickBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  quickBtnSecondary: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center' },
  quickBtnSecondaryText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 14 },
});
