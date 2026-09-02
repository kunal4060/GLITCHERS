import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useDashboardStore } from '../store/dashboardStore';
import type { Task } from '@glitchers/shared';

export const TasksScreen: React.FC = () => {
  const { tasks, addTask, setTasks } = useDashboardStore();
  const [taskInput, setTaskInput] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'TODO' | 'COMPLETED'>('ALL');

  const handleCreateTask = () => {
    if (!taskInput.trim()) return;

    let priority: Task['priority'] = 'NORMAL';
    const lower = taskInput.toLowerCase();
    if (lower.includes('urgent') || lower.includes('extremely important')) {
      priority = 'EXTREMELY_IMPORTANT';
    } else if (lower.includes('important') || lower.includes('high priority')) {
      priority = 'HIGH';
    }

    const newTask: Task = {
      id: String(Date.now()),
      userId: 'u1',
      title: taskInput.trim(),
      priority,
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    };

    addTask(newTask);
    setTaskInput('');
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: t.status === 'COMPLETED' ? 'TODO' : 'COMPLETED',
              completedAt: t.status === 'COMPLETED' ? null : new Date().toISOString(),
            }
          : t
      )
    );
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'TODO') return t.status === 'TODO';
    if (filter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Natural Language Task Input Bar */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          placeholder="Speak or type: 'Complete DBMS lab report by Friday...'"
          placeholderTextColor="#64748B"
          value={taskInput}
          onChangeText={setTaskInput}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleCreateTask}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'TODO', 'COMPLETED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <ScrollView style={styles.taskList}>
        {filteredTasks.map((t) => {
          const isDone = t.status === 'COMPLETED';
          return (
            <View key={t.id} style={[styles.taskItem, isDone && styles.taskItemDone]}>
              <TouchableOpacity style={styles.checkbox} onPress={() => t.id && toggleTaskStatus(t.id)}>
                <Text style={styles.checkboxText}>{isDone ? '✓' : ''}</Text>
              </TouchableOpacity>

              <View style={styles.taskDetails}>
                <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{t.title}</Text>
                <View style={styles.tagRow}>
                  <Text
                    style={[
                      styles.priorityBadge,
                      t.priority === 'EXTREMELY_IMPORTANT' && styles.pExtreme,
                      t.priority === 'HIGH' && styles.pHigh,
                    ]}
                  >
                    {t.priority}
                  </Text>
                  <Text style={styles.reminderTag}>⏰ Reminders Active</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  inputCard: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 6, marginBottom: 12 },
  input: { flex: 1, color: '#F8FAFC', paddingHorizontal: 12, fontSize: 13 },
  addBtn: { backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterTab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#1E293B' },
  filterTabActive: { backgroundColor: '#3B82F6' },
  filterText: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold' },
  filterTextActive: { color: '#FFFFFF' },
  taskList: { flex: 1 },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  taskItemDone: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 14 },
  taskDetails: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: 'bold', color: '#F8FAFC' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  priorityBadge: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8' },
  pHigh: { color: '#F59E0B' },
  pExtreme: { color: '#EF4444' },
  reminderTag: { fontSize: 10, color: '#38BDF8' },
});
