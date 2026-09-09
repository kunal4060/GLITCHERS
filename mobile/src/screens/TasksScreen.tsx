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
import { useAuthStore } from '../store/authStore';
import type { Task } from '@glitchers/shared';

const FILTERS = ['All', 'Important', 'Today', 'Upcoming', 'Completed'];

export const TasksScreen: React.FC = () => {
  const { tasks, addTask, completeTask, deleteTask, updateTaskPriority } = useDashboardStore();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('NORMAL');
  const [starredTaskIds, setStarredTaskIds] = useState<string[]>([]);
  const [isDecomposing, setIsDecomposing] = useState(false);

  const todayDateStr = new Date().toISOString().slice(0, 10);

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    if (selectedFilter === 'Completed') return t.status === 'COMPLETED';
    if (selectedFilter === 'Important') {
      return t.status === 'TODO' && (t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH' || starredTaskIds.includes(t.id));
    }
    if (selectedFilter === 'Today') {
      if (t.status !== 'TODO') return false;
      if (!t.dueDate) return false;
      return t.dueDate.slice(0, 10) === todayDateStr;
    }
    if (selectedFilter === 'Upcoming') {
      if (t.status !== 'TODO') return false;
      if (!t.dueDate) return true;
      return t.dueDate.slice(0, 10) > todayDateStr;
    }
    return true; // All
  });

  const toggleStar = (taskId: string) => {
    setStarredTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleDecomposeMilestones = () => {
    setIsDecomposing(true);
    setTimeout(() => {
      setIsDecomposing(false);
      Alert.alert(
        'Cognitive Load Optimizer',
        'Nia AI analyzed your assignments and split them into 15-minute milestones across your study blocks.'
      );
    }, 1200);
  };

  const handleCreateTask = () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    const currentUserId = useAuthStore.getState().user?.id || 'offline-user';
    const newTask: Task = {
      id: String(Date.now()),
      userId: currentUserId,
      title: newTitle.trim(),
      priority: newPriority,
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    };
    addTask(newTask);
    setNewTitle('');
    setModalVisible(false);
    Alert.alert('Task Created', `"${newTask.title}" added to your workspace.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerFocusRow}>
            <View style={styles.tealPip} />
            <Text style={styles.headerFocusLabel}>WORKSPACE FOCUS</Text>
          </View>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Tasks & Deadlines</Text>
            <Text style={styles.headerPendingCount}>
              ({tasks.filter((t) => t.status === 'TODO').length} pending)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newTaskBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.newTaskBtnText}>New Task</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Segmented Control Bar */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTERS.map((f) => {
              const isActive = f === selectedFilter;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setSelectedFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {f}
                  </Text>
                  {f === 'All' && (
                    <Text style={[styles.filterTabCount, isActive && { color: '#1A1C1D' }]}>
                      {tasks.filter((t) => t.status === 'TODO').length}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Cognitive Load Optimizer Card (AI Decomposition) */}
        <View style={styles.optimizerCard}>
          <View style={styles.optimizerLeft}>
            <View style={styles.optimizerIconBox}>
              <Ionicons name="sparkles" size={18} color="#006A63" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.optimizerHeaderRow}>
                <Text style={styles.optimizerTitle}>COGNITIVE LOAD OPTIMIZER</Text>
                <View style={styles.nexaTag}>
                  <Text style={styles.nexaTagText}>NIA AI</Text>
                </View>
              </View>
              <Text style={styles.optimizerDesc}>
                Split complex assignments into actionable 15-minute telemetry milestones.
              </Text>
              <View style={styles.optimizerActionsRow}>
                <TouchableOpacity
                  style={styles.breakDownBtn}
                  onPress={handleDecomposeMilestones}
                  disabled={isDecomposing}
                  activeOpacity={0.85}
                >
                  <Ionicons name="git-merge-outline" size={14} color="#1A1C1D" />
                  <Text style={styles.breakDownBtnText}>
                    {isDecomposing ? 'Decomposing...' : 'Break Down Tasks'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Task Cards List */}
        <View style={styles.tasksList}>
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle-outline" size={36} color="#006A63" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>Workspace Clear</Text>
              <Text style={styles.emptySub}>No pending tasks found under {selectedFilter}. Great work!</Text>
            </View>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === 'COMPLETED';
              const isHigh = task.priority === 'EXTREMELY_IMPORTANT' || task.priority === 'HIGH';
              const isStarred = starredTaskIds.includes(task.id);

              return (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskCardRow}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      style={[styles.taskCheckbox, isDone && styles.taskCheckboxDone]}
                      onPress={() => completeTask(task.id)}
                      activeOpacity={0.8}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : (
                        <View style={styles.checkboxInnerHole} />
                      )}
                    </TouchableOpacity>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      {/* Priority Badges & Star */}
                      <View style={styles.taskTopMeta}>
                        <View style={styles.badgeGroup}>
                          <View
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: isHigh ? '#FFDADA' : '#EEEEF0' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.priorityBadgeText,
                                { color: isHigh ? '#920028' : '#45464C' },
                              ]}
                            >
                              {task.priority === 'EXTREMELY_IMPORTANT' ? 'HIGH' : task.priority}
                            </Text>
                          </View>

                          <View style={styles.aiPill}>
                            <Ionicons name="sparkles" size={10} color="#006A63" />
                            <Text style={styles.aiPillText}>AI Suggested</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => toggleStar(task.id)}
                          style={styles.starBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isStarred ? 'star' : 'star-outline'}
                            size={18}
                            color={isStarred ? '#D97706' : '#76777D'}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Task Title */}
                      <Text
                        style={[styles.taskTitleText, isDone && styles.taskTitleDone]}
                        numberOfLines={2}
                      >
                        {task.title}
                      </Text>

                      {task.description && (
                        <Text style={styles.taskDescText} numberOfLines={2}>
                          {task.description}
                        </Text>
                      )}

                      {/* Footer Row: Due Date & Actions */}
                      <View style={styles.taskFooterRow}>
                        <View style={styles.dueRow}>
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color={isHigh ? '#BA1A1A' : '#76777D'}
                          />
                          <Text
                            style={[
                              styles.dueText,
                              isHigh && { color: '#BA1A1A', fontWeight: '600' },
                            ]}
                          >
                            Due tomorrow, 11:59 PM
                          </Text>
                        </View>

                        <View style={styles.actionsRight}>
                          <TouchableOpacity
                            onPress={() =>
                              updateTaskPriority(
                                task.id,
                                task.priority === 'EXTREMELY_IMPORTANT' ? 'NORMAL' : 'EXTREMELY_IMPORTANT'
                              )
                            }
                            activeOpacity={0.75}
                          >
                            <Text style={styles.prioritizeBtnText}>
                              {task.priority === 'EXTREMELY_IMPORTANT' ? 'Deprioritize' : 'Prioritize →'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => deleteTask(task.id)}
                            style={{ padding: 3 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={14} color="#76777D" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Task Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalHeading}>Create New Task</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Task Title (e.g. Complete Lab Report)"
              placeholderTextColor="#76777D"
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
                    {p === 'EXTREMELY_IMPORTANT' ? 'CRITICAL' : p}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 226, 228, 0.6)',
    backgroundColor: 'rgba(249, 249, 251, 0.95)',
  },
  headerFocusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  tealPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006A63',
  },
  headerFocusLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.3,
  },
  headerPendingCount: {
    fontSize: 12,
    color: '#76777D',
    fontWeight: '500',
  },
  newTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  newTaskBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  content: {
    padding: 20,
    paddingBottom: 96,
    gap: 14,
  },
  filterBar: {
    marginHorizontal: -20,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#EEEEF0',
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#76777D',
  },
  filterTabTextActive: {
    color: '#1A1C1D',
    fontWeight: '700',
  },
  filterTabCount: {
    fontSize: 10,
    color: '#76777D',
    fontWeight: '500',
  },
  optimizerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  optimizerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  optimizerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 106, 99, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optimizerTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 0.8,
  },
  nexaTag: {
    backgroundColor: '#F3F3F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  nexaTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#76777D',
  },
  optimizerDesc: {
    fontSize: 12.5,
    color: '#45464C',
    lineHeight: 18,
  },
  optimizerActionsRow: {
    marginTop: 10,
  },
  breakDownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEEEF0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  breakDownBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  tasksList: {
    gap: 10,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  taskCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C6C6CD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  taskCheckboxDone: {
    backgroundColor: '#006A63',
    borderColor: '#006A63',
  },
  checkboxInnerHole: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskTopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#006A63',
  },
  starBtn: {
    padding: 2,
  },
  taskTitleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#76777D',
  },
  taskDescText: {
    fontSize: 12,
    color: '#76777D',
    marginTop: 3,
    lineHeight: 16,
  },
  taskFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F3F5',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 11.5,
    color: '#76777D',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prioritizeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#006A63',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1D',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#76777D',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  modalInput: {
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E2E2E4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1C1D',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#76777D',
    marginTop: 4,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F3F5',
  },
  priorityPillActive: {
    backgroundColor: '#111827',
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#45464C',
  },
  priorityPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F3F5',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#76777D',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
