import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { useDashboardStore } from '../store/dashboardStore';
import type { Task } from '@glitchers/shared';

const FILTERS = ['All', 'Important', 'Today', 'Upcoming', 'Completed'];

export const TasksScreen: React.FC = () => {
  const { tasks, addTask, completeTask, deleteTask, updateTaskPriority } = useDashboardStore();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('NORMAL');
  const [newDue, setNewDue] = useState('Tomorrow');

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    if (selectedFilter === 'Completed') return t.status === 'COMPLETED';
    if (selectedFilter === 'Important') {
      return t.status === 'TODO' && (t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH');
    }
    if (selectedFilter === 'Today') return t.status === 'TODO';
    if (selectedFilter === 'Upcoming') return t.status === 'TODO';
    return true; // All
  });

  const handleCreateTask = () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    const newTask: Task = {
      id: String(Date.now()),
      userId: 'u1',
      title: newTitle.trim(),
      priority: newPriority,
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    };
    addTask(newTask);
    setNewTitle('');
    setModalVisible(false);
    Alert.alert('Task Created', `"${newTask.title}" added with ${newTask.priority} priority.`);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks & Deadlines</Text>
          <Text style={styles.headerSubtitle}>
            {tasks.filter((t) => t.status === 'TODO').length} pending actions
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => {
            const isActive = f === selectedFilter;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedFilter(f)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Task List */}
      <ScrollView contentContainerStyle={styles.taskList}>
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>You're all clear</Text>
            <Text style={styles.emptySub}>No pending tasks found under {selectedFilter}.</Text>
          </View>
        ) : (
          filteredTasks.map((t) => {
            const isDone = t.status === 'COMPLETED';
            let priorityBadge = <StatusBadge label="Normal" variant="countdown" />;
            if (t.priority === 'EXTREMELY_IMPORTANT') {
              priorityBadge = <StatusBadge label="Extremely Important" variant="urgent" />;
            } else if (t.priority === 'HIGH') {
              priorityBadge = <StatusBadge label="High Priority" variant="warning" />;
            }

            return (
              <GlassCard key={t.id} style={styles.taskCard}>
                <View style={styles.taskCardRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, isDone && styles.checkboxDone]}
                    onPress={() => completeTask(t.id)}
                  >
                    <Text style={styles.checkIcon}>{isDone ? '✓' : '○'}</Text>
                  </TouchableOpacity>

                  <View style={styles.taskContent}>
                    <View style={styles.badgeRow}>
                      {priorityBadge}
                      <Text style={styles.deadlineTag}>Due tomorrow</Text>
                    </View>

                    <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                      {t.title}
                    </Text>

                    {t.description && (
                      <Text style={styles.taskDesc} numberOfLines={2}>{t.description}</Text>
                    )}

                    <View style={styles.taskFooter}>
                      <View style={styles.aiTag}>
                        <Text style={styles.aiTagText}>✨ Created by AI Companion</Text>
                      </View>

                      <View style={styles.taskActions}>
                        <TouchableOpacity
                          onPress={() =>
                            updateTaskPriority(
                              t.id,
                              t.priority === 'EXTREMELY_IMPORTANT' ? 'NORMAL' : 'EXTREMELY_IMPORTANT'
                            )
                          }
                        >
                          <Text style={styles.priorityToggle}>
                            {t.priority === 'EXTREMELY_IMPORTANT' ? 'Lower Priority' : '⭐ Prioritize'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteTask(t.id)}>
                          <Text style={styles.deleteText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* New Task Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalHeading}>Create New Task</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Task Title (e.g. Complete AI Assignment 3)"
              placeholderTextColor="#64748B"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Priority Level</Text>
            <View style={styles.prioritySelector}>
              {(['NORMAL', 'HIGH', 'EXTREMELY_IMPORTANT'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityPill, newPriority === p && styles.priorityPillActive]}
                  onPress={() => setNewPriority(p)}
                >
                  <Text style={[styles.priorityPillText, newPriority === p && styles.priorityPillTextActive]}>
                    {p === 'EXTREMELY_IMPORTANT' ? 'Urgent' : p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCreateTask}>
                <Text style={styles.modalSaveText}>Schedule Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: designTokens.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.sm,
  },
  headerTitle: { ...designTokens.typography.hero, fontSize: 22 },
  headerSubtitle: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary, marginTop: 2 },
  addBtn: {
    backgroundColor: designTokens.colors.primary,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 2,
    borderRadius: designTokens.radii.sm,
  },
  addBtnText: { ...designTokens.typography.cardTitle, fontSize: 12, color: '#FFFFFF' },
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.surfaceBorder,
    marginBottom: designTokens.spacing.md,
  },
  filterContent: {
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 2,
    borderRadius: designTokens.radii.pill,
    backgroundColor: designTokens.colors.surfaceCard,
  },
  filterChipActive: { backgroundColor: designTokens.colors.primary },
  filterText: { ...designTokens.typography.bodyMedium, fontSize: 12, color: designTokens.colors.textSecondary },
  filterTextActive: { color: '#FFFFFF', fontWeight: '700' },
  taskList: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: 110,
    gap: designTokens.spacing.sm,
  },
  taskCard: {
    padding: designTokens.spacing.md,
  },
  taskCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: designTokens.spacing.md,
  },
  checkboxDone: {
    opacity: 0.6,
  },
  checkIcon: {
    fontSize: 18,
    color: designTokens.colors.textMuted,
  },
  taskContent: { flex: 1 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: 4,
  },
  deadlineTag: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary },
  taskTitle: { ...designTokens.typography.cardTitle, fontSize: 14 },
  taskTitleDone: { textDecorationLine: 'line-through', color: designTokens.colors.textMuted },
  taskDesc: { ...designTokens.typography.body, fontSize: 12, marginTop: 4 },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiTagText: { ...designTokens.typography.micro, color: designTokens.colors.aiSecondary, fontSize: 10 },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md },
  priorityToggle: { ...designTokens.typography.micro, color: '#60A5FA', fontWeight: '700' },
  deleteText: { color: designTokens.colors.textMuted, fontSize: 13, padding: 2 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.hero,
  },
  emptyIcon: { fontSize: 32, marginBottom: designTokens.spacing.sm },
  emptyTitle: { ...designTokens.typography.sectionTitle, fontSize: 16 },
  emptySub: { ...designTokens.typography.body, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: designTokens.colors.surfaceCard,
    borderTopLeftRadius: designTokens.radii.xl,
    borderTopRightRadius: designTokens.radii.xl,
    padding: designTokens.spacing.xl,
    paddingBottom: 36,
    gap: designTokens.spacing.md,
  },
  modalHeading: { ...designTokens.typography.sectionTitle, fontSize: 18 },
  modalInput: {
    backgroundColor: designTokens.colors.surfaceElevated,
    borderRadius: designTokens.radii.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    color: designTokens.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
  },
  inputLabel: { ...designTokens.typography.label, marginTop: 4 },
  prioritySelector: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  priorityPill: {
    flex: 1,
    backgroundColor: designTokens.colors.surfaceElevated,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
  },
  priorityPillActive: {
    backgroundColor: designTokens.colors.primary,
    borderColor: designTokens.colors.primary,
  },
  priorityPillText: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary, fontWeight: '700' },
  priorityPillTextActive: { color: '#FFFFFF' },
  modalActionRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.surfaceSubtle,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  modalCancelText: { ...designTokens.typography.cardTitle, fontSize: 13, color: designTokens.colors.textSecondary },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.primary,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  modalSaveText: { ...designTokens.typography.cardTitle, fontSize: 13, color: '#FFFFFF' },
});
