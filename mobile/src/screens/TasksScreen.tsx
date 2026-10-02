import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore } from '../store/dashboardStore';
import { NiaHeader, LabelCaps, StatusPill, NiaCard } from '../components/nia';
import { formatDue, inr } from '../utils/niaFormat';

const C = designTokens.colors;

const FILTERS = ['All', 'Today', 'Overdue', 'Completed'] as const;
type Filter = (typeof FILTERS)[number];

type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREMELY_IMPORTANT';
const PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'EXTREMELY_IMPORTANT'];

const FOCUS_BLOCKS = [
  { time: '09:00 – 10:30', label: 'Deep Work', sub: 'MIT 6.006: Divide & Conquer', color: C.eucalyptus },
  { time: '11:00 – 12:00', label: 'Admin Hour', sub: 'Fees, forms & email sweep', color: '#4F46E5' },
  { time: '14:00 – 15:30', label: 'Light Tasks', sub: 'Review notes & flashcards', color: C.textMuted },
];

const CAMPUS_SUGGESTIONS = [
  { title: 'Pick up library books', sub: 'Hold expires tomorrow', icon: 'book-outline' },
  { title: 'Charge laptop at hub', sub: 'Free 2h before lab', icon: 'battery-charging-outline' },
  { title: 'Print lab records', sub: 'Print shop, Innovation Quad', icon: 'print-outline' },
];

export const TasksScreen = ({ navigation }: { navigation?: any }) => {
  const { tasks, addTask, updateTask, completeTask, deleteTask } = useDashboardStore();

  const [filter, setFilter] = useState<Filter>('All');
  const [addVisible, setAddVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const isOverdue = (t: any) => {
    if (!t.dueDate || t.status === 'COMPLETED') return false;
    const d = new Date(t.dueDate);
    return !Number.isNaN(d.getTime()) && new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() < startOfToday;
  };
  const isDueToday = (t: any) => {
    if (!t.dueDate || t.status === 'COMPLETED') return false;
    const d = new Date(t.dueDate);
    return !Number.isNaN(d.getTime()) && new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() === startOfToday;
  };

  const pending = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS');
  const completed = tasks.filter((t) => t.status === 'COMPLETED');

  const filtered: any[] =
    filter === 'All'
      ? [...pending].sort((a, b) => prioW(a.priority) - prioW(b.priority))
      : filter === 'Today'
      ? pending.filter(isDueToday)
      : filter === 'Overdue'
      ? pending.filter(isOverdue)
      : [...completed];

  const todayCount = pending.filter(isDueToday).length;
  const overdueCount = pending.filter(isOverdue).length;
  const focusToday = Math.min(3, pending.length);

  const openEdit = (t: any) => {
    setEditing(t);
    setTitle(t.title || '');
    setDescription(t.description || '');
    setDueDate(t.dueDate ? t.dueDate.slice(0, 10) : '');
    setPriority(t.priority || 'NORMAL');
    setAddVisible(true);
  };

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('NORMAL');
  };

  const saveTask = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give the task a name.');
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate + 'T23:59:00').toISOString() : undefined,
      priority,
    };
    if (editing) {
      updateTask(editing.id, payload);
      Alert.alert('Updated', 'Task updated.');
    } else {
      addTask(payload as any);
      Alert.alert('Added', 'Task added to your list.');
    }
    resetForm();
    setAddVisible(false);
  };

  const confirmDelete = (t: any) => {
    Alert.alert('Delete task', `Remove "${t.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(t.id) },
    ]);
  };

  const pillFor = (t: any): { label: string; tone: 'success' | 'danger' | 'neutral' | 'info' } => {
    if (t.status === 'COMPLETED') return { label: 'Done', tone: 'success' };
    if (isOverdue(t)) return { label: 'Overdue', tone: 'danger' };
    if (t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH') return { label: 'High', tone: 'danger' };
    if (t.priority === 'NORMAL') return { label: 'Normal', tone: 'neutral' };
    return { label: 'Low', tone: 'info' };
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <NiaHeader title="Tasks" navigation={navigation} />

          <Text style={styles.title}>Tasks & Focus</Text>
          <Text style={styles.sub}>Your workload, prioritized by NIA</Text>

          {/* AI task creator entry */}
          <TouchableOpacity
            style={styles.aiBanner}
            onPress={() => navigation?.navigate('AITaskCreator')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create task with AI chat"
          >
            <View style={styles.aiBannerIcon}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.aiBannerText}>
              <Text style={styles.aiBannerTitle}>✨ AI se task banao</Text>
              <Text style={styles.aiBannerSub}>Bas likho — NIA samajh ke task set kar degi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textSubtle} />
          </TouchableOpacity>

          {/* Filter row */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const active = f === filter;
              const count = f === 'All' ? pending.length : f === 'Today' ? todayCount : f === 'Overdue' ? overdueCount : completed.length;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter ${f}`}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
                  <Text style={[styles.filterCount, active && styles.filterCountActive]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status banner */}
          <NiaCard style={styles.bannerCard}>
            <View style={styles.bannerRow}>
              <View>
                <Text style={styles.bannerTitle}>
                  {overdueCount > 0 ? `${overdueCount} overdue need attention` : 'All deadlines on track'}
                </Text>
                <Text style={styles.bannerSub}>
                  {todayCount > 0
                    ? `${todayCount} due today • ${focusToday} in focus`
                    : 'Nothing due today'}
                </Text>
              </View>
              <StatusPill label={overdueCount > 0 ? 'Urgent' : 'All Clear'} tone={overdueCount > 0 ? 'danger' : 'success'} />
            </View>
          </NiaCard>

          {/* Focus today */}
          {filter === 'All' && focusToday > 0 && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Focus Today</Text>
                <LabelCaps>NIA picks</LabelCaps>
              </View>
              {[...pending]
                .sort((a, b) => prioW(a.priority) - prioW(b.priority))
                .slice(0, 3)
                .map((t, i) => {
                  const pill = pillFor(t);
                  const due = formatDue(t.dueDate);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.focusCard}
                      onPress={() => openEdit(t)}
                      onLongPress={() => confirmDelete(t)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.focusRank}>
                        <Text style={styles.focusRankText}>{i + 1}</Text>
                      </View>
                      <View style={styles.taskMain}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{t.title}</Text>
                        <Text style={[styles.taskDue, due.urgent && { color: C.terracotta }]}>{due.text}</Text>
                      </View>
                      <StatusPill label={pill.label} tone={pill.tone} />
                      <TouchableOpacity
                        onPress={() => completeTask(t.id)}
                        style={styles.checkBtn}
                        activeOpacity={0.7}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Complete ${t.title}`}
                      >
                        <Ionicons name="checkmark" size={14} color={C.eucalyptus} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
            </>
          )}

          {/* Task list */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{filter === 'All' ? 'All Tasks' : filter}</Text>
            <LabelCaps>{filtered.length} items</LabelCaps>
          </View>

          {filtered.length === 0 ? (
            <NiaCard>
              <Text style={styles.emptyText}>
                {filter === 'Completed' ? 'Nothing completed yet — start with a small win.' : 'Nothing here. Add a task to get going.'}
              </Text>
            </NiaCard>
          ) : (
            filter !== 'All' &&
            filtered.map((t) => {
              const pill = pillFor(t);
              const due = formatDue(t.dueDate);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.taskRow}
                  onPress={() => openEdit(t)}
                  onLongPress={() => confirmDelete(t)}
                  activeOpacity={0.85}
                >
                  <TouchableOpacity
                    onPress={() => completeTask(t.id)}
                    style={[styles.checkBtn, t.status === 'COMPLETED' && styles.checkBtnDone]}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Complete ${t.title}`}
                  >
                    {t.status === 'COMPLETED' && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <View style={styles.taskMain}>
                    <View style={styles.taskTitleRow}>
                      <Text
                        style={[styles.taskTitle, t.status === 'COMPLETED' && styles.taskTitleDone]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                      <StatusPill label={pill.label} tone={pill.tone} />
                    </View>
                    {!!t.description && <Text style={styles.taskDesc} numberOfLines={1}>{t.description}</Text>}
                    <Text style={[styles.taskDue, due.urgent && { color: C.terracotta }]}>{due.text}</Text>
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={16} color={C.textSubtle} />
                </TouchableOpacity>
              );
            })
          )}

          {/* Pomodoro blocks */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Focus Blocks</Text>
            <LabelCaps>Pomodoro</LabelCaps>
          </View>
          <View style={styles.pomoRow}>
            {FOCUS_BLOCKS.map((b) => (
              <View key={b.label} style={styles.pomoCard}>
                <View style={[styles.pomoStripe, { backgroundColor: b.color }]} />
                <Text style={styles.pomoTime}>{b.time}</Text>
                <Text style={styles.pomoLabel}>{b.label}</Text>
                <Text style={styles.pomoSub} numberOfLines={2}>{b.sub}</Text>
              </View>
            ))}
          </View>

          {/* Campus suggestions */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Campus Suggestions</Text>
            <LabelCaps>NIA notices</LabelCaps>
          </View>
          {CAMPUS_SUGGESTIONS.map((s) => (
            <View key={s.title} style={styles.taskRow}>
              <View style={styles.suggIcon}>
                <Ionicons name={s.icon as any} size={18} color={C.eucalyptus} />
              </View>
              <View style={styles.taskMain}>
                <Text style={styles.taskTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.taskDesc}>{s.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />
            </View>
          ))}
          <View style={{ height: 8 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setAddVisible(true); }} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Add / edit modal */}
        <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setAddVisible(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <LabelCaps style={styles.sheetLabel}>{editing ? 'Edit Task' : 'New Task'}</LabelCaps>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput style={styles.input} placeholder="e.g. Submit OS assignment" placeholderTextColor={C.textSubtle} value={title} onChangeText={setTitle} />
              <Text style={styles.fieldLabel}>Details</Text>
              <TextInput style={styles.input} placeholder="Optional notes" placeholderTextColor={C.textSubtle} value={description} onChangeText={setDescription} multiline />
              <Text style={styles.fieldLabel}>Due date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} placeholder="2026-10-05" placeholderTextColor={C.textSubtle} value={dueDate} onChangeText={setDueDate} keyboardType="numbers-and-punctuation" />
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.prioRow}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.prioPill, priority === p && styles.prioPillActive]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.prioText, priority === p && styles.prioTextActive]}>
                      {p === 'EXTREMELY_IMPORTANT' ? 'Critical' : p[0] + p.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={saveTask} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Task'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

function prioW(p?: string): number {
  return p === 'EXTREMELY_IMPORTANT' ? 0 : p === 'HIGH' ? 1 : p === 'NORMAL' ? 2 : 3;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  content: { paddingBottom: 120 },
  title: { fontSize: 27, fontWeight: '700', color: C.ink, letterSpacing: -0.6, paddingHorizontal: 20 },
  sub: { fontSize: 12, color: C.textMuted, paddingHorizontal: 20, marginTop: 4, marginBottom: 14 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 14 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8,
  },
  filterPillActive: { backgroundColor: C.obsidian, borderColor: C.obsidian },
  filterText: { fontSize: 12.5, fontWeight: '600', color: C.textSecondary },
  filterTextActive: { color: '#FFFFFF' },
  filterCount: {
    fontSize: 10.5, fontWeight: '700', color: C.textMuted,
    backgroundColor: '#F1F1F4', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  filterCountActive: { color: C.obsidian, backgroundColor: 'rgba(255,255,255,0.9)' },
  bannerCard: { marginHorizontal: 20, marginBottom: 18 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginTop: 14, marginBottom: 4,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 16, padding: 14,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 2,
  },
  aiBannerIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.eucalyptus,
    alignItems: 'center', justifyContent: 'center',
  },
  aiBannerText: { flex: 1 },
  aiBannerTitle: { fontSize: 15, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },
  aiBannerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 3 },
  bannerSub: { fontSize: 12, color: C.textMuted },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10, marginTop: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  focusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: C.hairline,
    padding: 14, marginHorizontal: 20, marginBottom: 8,
  },
  focusRank: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: C.eucalyptusFaint,
    alignItems: 'center', justifyContent: 'center',
  },
  focusRankText: { fontSize: 13, fontWeight: '700', color: C.eucalyptus },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: C.hairline,
    padding: 14, marginHorizontal: 20, marginBottom: 8,
  },
  checkBtn: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.hairline,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  checkBtnDone: { backgroundColor: C.eucalyptus, borderColor: C.eucalyptus },
  taskMain: { flex: 1 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  taskTitle: { fontSize: 14.5, fontWeight: '600', color: C.ink, flex: 1 },
  taskTitleDone: { textDecorationLine: 'line-through', color: C.textMuted },
  taskDesc: { fontSize: 12, color: C.textMuted, marginBottom: 3 },
  taskDue: { fontSize: 11.5, fontWeight: '600', color: C.textSecondary },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 8 },
  pomoRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  pomoCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: C.hairline,
    padding: 12,
  },
  pomoStripe: { height: 4, borderRadius: 2, marginBottom: 10 },
  pomoTime: { fontSize: 10.5, fontWeight: '700', color: C.textMuted, letterSpacing: 0.4 },
  pomoLabel: { fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 2, marginBottom: 3 },
  pomoSub: { fontSize: 11, color: C.textMuted, lineHeight: 15 },
  suggIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.eucalyptusFaint,
    alignItems: 'center', justifyContent: 'center',
  },
  fab: {
    position: 'absolute', right: 20, bottom: 104,
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
  prioRow: { flexDirection: 'row', gap: 8 },
  prioPill: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
  },
  prioPillActive: { backgroundColor: C.obsidian, borderColor: C.obsidian },
  prioText: { fontSize: 11.5, fontWeight: '700', color: C.textSecondary },
  prioTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: C.obsidian, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
