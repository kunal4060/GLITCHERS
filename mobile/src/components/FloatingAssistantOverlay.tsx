import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { useFloatingStore } from '../store/floatingStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AIGemSymbol } from './common/AIGemSymbol';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../api/client';
import { offlineAiEngine } from '../services/offlineAiEngine';
import type { Task, Expense } from '@glitchers/shared';

export const FloatingAssistantOverlay: React.FC = () => {
  const {
    isBubbleVisible,
    isMenuExpanded,
    activeMiniWindow,
    setMenuExpanded,
    openMiniWindow,
    closeMiniWindow,
  } = useFloatingStore();

  const {
    classes,
    tasks,
    expenses,
    budget,
    debts,
    emails,
    addExpense,
    addTask,
    addDebt,
    aiMode,
    activeOfflineModel,
    queueOfflineAction,
  } = useDashboardStore();

  const [quickInput, setQuickInput] = useState('');
  const [quickAiResponse, setQuickAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleFloatingAI = async () => {
    if (!quickInput.trim()) return;
    const prompt = quickInput.trim();
    setQuickInput('');
    setIsAiLoading(true);
    setQuickAiResponse('Thinking...');

    // OFFLINE MODE: Run 100% on-device via Hugging Face model
    if (aiMode === 'OFFLINE') {
      const offlineRes = offlineAiEngine.processMessage(
        prompt,
        { classes, tasks, expenses, budget, debts },
        activeOfflineModel
      );
      if (offlineRes.actionType === 'EXPENSE' && offlineRes.actionData) {
        if (offlineRes.actionData.expense) {
          addExpense(offlineRes.actionData.expense);
          if (offlineRes.actionData.debt) addDebt(offlineRes.actionData.debt);
          queueOfflineAction({ type: 'SPLIT_EXPENSE', payload: offlineRes.actionData });
        } else {
          addExpense(offlineRes.actionData);
          queueOfflineAction({ type: 'CREATE_EXPENSE', payload: offlineRes.actionData });
        }
      } else if (offlineRes.actionType === 'TASK' && offlineRes.actionData) {
        addTask(offlineRes.actionData);
        queueOfflineAction({ type: 'CREATE_TASK', payload: offlineRes.actionData });
      }
      setQuickAiResponse(offlineRes.message);
      setIsAiLoading(false);
      return;
    }

    try {
      const res = await apiClient.sendAIChat(prompt);
      const resAny = res as any;

      if (res.intent === 'CREATE_TASK' || resAny.toolExecuted === 'create_task') {
        const taskData = resAny.data;
        if (taskData) {
          addTask({
            id: taskData.id || String(Date.now()),
            userId: useAuthStore.getState().user?.id || 'offline-user',
            title: taskData.title || prompt,
            priority: taskData.priority || 'NORMAL',
            status: 'TODO',
            dueDate: taskData.dueDate || new Date(Date.now() + 86400000).toISOString(),
          });
        }
      } else if (res.intent === 'ADD_EXPENSE' || resAny.toolExecuted === 'add_expense' || resAny.toolExecuted === 'split_expense') {
        if (resAny.toolExecuted === 'split_expense' && resAny.data?.expense) {
          addExpense(resAny.data.expense);
          if (resAny.data.debt) addDebt(resAny.data.debt);
        } else if (resAny.data) {
          addExpense({
            id: resAny.data.id || String(Date.now()),
            userId: useAuthStore.getState().user?.id || 'offline-user',
            amount: Number(resAny.data.amount) || 100,
            category: resAny.data.category || 'FOOD',
            description: resAny.data.description || prompt,
            date: new Date().toISOString(),
            type: 'EXPENSE',
          });
        }
      }

      setQuickAiResponse(res.message);
    } catch {
      // Offline fallback: Use local Hugging Face engine and queue for cloud sync
      const offlineRes = offlineAiEngine.processMessage(
        prompt,
        { classes, tasks, expenses, budget, debts },
        activeOfflineModel
      );
      if (offlineRes.actionType === 'EXPENSE' && offlineRes.actionData) {
        if (offlineRes.actionData.expense) {
          addExpense(offlineRes.actionData.expense);
          if (offlineRes.actionData.debt) addDebt(offlineRes.actionData.debt);
          queueOfflineAction({ type: 'SPLIT_EXPENSE', payload: offlineRes.actionData });
        } else {
          addExpense(offlineRes.actionData);
          queueOfflineAction({ type: 'CREATE_EXPENSE', payload: offlineRes.actionData });
        }
      } else if (offlineRes.actionType === 'TASK' && offlineRes.actionData) {
        addTask(offlineRes.actionData);
        queueOfflineAction({ type: 'CREATE_TASK', payload: offlineRes.actionData });
      }
      setQuickAiResponse(`${offlineRes.message}\n\n*(Offline Mode: Saved locally on device. Will push to cloud dataset when online.)*`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const { isAuthenticated, isOnboardingComplete } = useAuthStore();
  if (!isAuthenticated || !isOnboardingComplete || !isBubbleVisible) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlayContainer}>
      {/* 1. Translucent Mini Window (if open) */}
      {activeMiniWindow !== 'NONE' && (
        <View style={styles.miniWindowContainer}>
          <View style={styles.miniWindowHeader}>
            <Text style={styles.miniWindowTitle}>
              {activeMiniWindow === 'EMAIL' && '📧 University Email Notice'}
              {activeMiniWindow === 'FINANCE' && '💰 Quick Expense Entry'}
              {activeMiniWindow === 'TASKS' && '✅ Quick Student Tasks'}
              {activeMiniWindow === 'CALENDAR' && '🗓 Class & Event Schedule'}
              {activeMiniWindow === 'AI' && '🤖 NIA Assistant'}
            </Text>
            <TouchableOpacity onPress={closeMiniWindow} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.miniWindowBody}>
            {activeMiniWindow === 'EMAIL' && (
              <View>
                {emails.map((e) => (
                  <View key={e.id} style={styles.card}>
                    <Text style={styles.badge}>{e.importance} NOTICE</Text>
                    <Text style={styles.cardTitle}>{e.subject}</Text>
                    <Text style={styles.cardText}>{e.summary}</Text>
                    <Text style={styles.cardSender}>{e.sender}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeMiniWindow === 'FINANCE' && (
              <View>
                <Text style={styles.cardText}>Speak or type expense (e.g. "Spent 180 on lunch"):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter expense amount & item..."
                  placeholderTextColor="#94A3B8"
                  value={quickInput}
                  onChangeText={setQuickInput}
                />
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    if (!quickInput.trim()) return;
                    const amtMatch = quickInput.match(/\d+(?:\.\d+)?/);
                    const amount = amtMatch ? parseFloat(amtMatch[0]) : 100;
                    const lower = quickInput.toLowerCase();
                    let category: any = 'OTHER';
                    if (lower.match(/\b(food|dinner|lunch|canteen|coffee|chai|tea|snack|swiggy|zomato|pizza|burger)\b/)) category = 'FOOD';
                    else if (lower.match(/\b(auto|cab|uber|ola|bus|metro|petrol)\b/)) category = 'TRANSPORT';
                    else if (lower.match(/\b(book|books|print|xerox|stationery|notes)\b/)) category = 'EDUCATION';
                    else if (lower.match(/\b(movie|game|party|netflix)\b/)) category = 'ENTERTAINMENT';

                    let desc = quickInput.replace(/(?:spent|paid|bought|rs\.?|₹|\b\d+\b)/gi, '').trim();
                    if (!desc) desc = category === 'FOOD' ? 'Dining' : 'Expense';

                    const newExp: Expense = {
                      id: String(Date.now()),
                      userId: useAuthStore.getState().user?.id || 'offline-user',
                      amount,
                      category,
                      description: desc.charAt(0).toUpperCase() + desc.slice(1),
                      date: new Date().toISOString(),
                      type: 'EXPENSE',
                    };
                    addExpense(newExp);
                    setQuickInput('');
                    closeMiniWindow();
                  }}
                >
                  <Text style={styles.actionBtnText}>Add Expense</Text>
                </TouchableOpacity>
                <Text style={styles.sectionHeader}>Recent Spending</Text>
                {expenses.slice(0, 3).map((exp) => (
                  <View key={exp.id} style={styles.row}>
                    <Text style={styles.cardText}>{exp.description}</Text>
                    <Text style={styles.cardBold}>₹{exp.amount}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeMiniWindow === 'TASKS' && (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Add quick task or assignment..."
                  placeholderTextColor="#94A3B8"
                  value={quickInput}
                  onChangeText={setQuickInput}
                />
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    if (!quickInput.trim()) return;
                    const lower = quickInput.toLowerCase();
                    const priority =
                      lower.includes('urgent') || lower.includes('extremely')
                        ? 'EXTREMELY_IMPORTANT'
                        : lower.includes('important') || lower.includes('high')
                        ? 'HIGH'
                        : 'NORMAL';
                    const cleanTitle = quickInput
                      .replace(/^(?:add task|task|todo|remind me to)\s+/i, '')
                      .replace(/(?:,\s*)?(?:make it|priority:?)\s+(?:extremely )?(?:urgent|important|high|normal)/i, '')
                      .trim();

                    const newTask: Task = {
                      id: String(Date.now()),
                      userId: useAuthStore.getState().user?.id || 'offline-user',
                      title: cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : 'Academic Task',
                      priority,
                      status: 'TODO',
                      dueDate: new Date(Date.now() + 86400000).toISOString(),
                    };
                    addTask(newTask);
                    setQuickInput('');
                  }}
                >
                  <Text style={styles.actionBtnText}>Add Task</Text>
                </TouchableOpacity>
                {tasks.map((t) => (
                  <View key={t.id} style={styles.row}>
                    <Text style={styles.cardText}>• {t.title}</Text>
                    <Text style={styles.priorityBadge}>{t.priority}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeMiniWindow === 'CALENDAR' && (
              <View>
                <Text style={styles.sectionHeader}>Upcoming Classes</Text>
                {classes.map((c) => (
                  <View key={c.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{c.subjectName}</Text>
                    <Text style={styles.cardText}>
                      {c.day} • {c.startTime} - {c.endTime}
                    </Text>
                    <Text style={styles.cardSender}>Room: {c.room || 'TBD'}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeMiniWindow === 'AI' && (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Ask NIA about classes, money, tasks..."
                  placeholderTextColor="#94A3B8"
                  value={quickInput}
                  onChangeText={setQuickInput}
                  onSubmitEditing={handleFloatingAI}
                />
                <TouchableOpacity
                  style={[styles.actionBtn, isAiLoading && { opacity: 0.6 }]}
                  onPress={handleFloatingAI}
                  disabled={isAiLoading}
                >
                  <Text style={styles.actionBtnText}>{isAiLoading ? 'Processing...' : 'Ask NIA'}</Text>
                </TouchableOpacity>
                {quickAiResponse ? (
                  <View style={styles.card}>
                    <Text style={styles.cardText}>{quickAiResponse}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* 2. Expanded Floating Control Dock */}
      {isMenuExpanded && (
        <View style={styles.menuDock}>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('EMAIL')}>
            <Ionicons name="mail-outline" size={16} color="#38BDF8" />
            <Text style={styles.menuItemText}>Notices</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('FINANCE')}>
            <Ionicons name="wallet-outline" size={16} color="#34D399" />
            <Text style={styles.menuItemText}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('TASKS')}>
            <Ionicons name="checkbox-outline" size={16} color="#FBBF24" />
            <Text style={styles.menuItemText}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('CALENDAR')}>
            <Ionicons name="calendar-outline" size={16} color="#60A5FA" />
            <Text style={styles.menuItemText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('AI')}>
            <Ionicons name="sparkles" size={16} color="#C4B5FD" />
            <Text style={styles.menuItemText}>NIA</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Floating AI Assistant Circular Action Button */}
      <TouchableOpacity
        style={[styles.floatingBubble, isMenuExpanded && styles.floatingBubbleActive]}
        activeOpacity={0.85}
        onPress={() => setMenuExpanded(!isMenuExpanded)}
      >
        {isMenuExpanded ? (
          <Ionicons name="close" size={26} color={designTokens.colors.primaryDark} />
        ) : (
          <AIGemSymbol size={42} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 84,
  },
  floatingBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 106, 99, 0.25)',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  floatingBubbleActive: {
    backgroundColor: '#111827',
    borderColor: '#006A63',
  },
  menuDock: {
    position: 'absolute',
    bottom: 150,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.08)',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
    gap: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.04)',
  },
  menuItemText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 13,
  },
  miniWindowContainer: {
    position: 'absolute',
    bottom: 150,
    left: 16,
    right: 16,
    maxHeight: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.2)',
    padding: 18,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },
  miniWindowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  miniWindowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  miniWindowBody: {
    maxHeight: 320,
  },
  card: {
    backgroundColor: '#F9F9FB',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.06)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cardText: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  cardBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#006A63',
  },
  cardSender: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  badge: {
    fontSize: 10,
    color: '#BA1A1A',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9F9FB',
    borderColor: 'rgba(17, 24, 39, 0.10)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: '#111827',
    marginVertical: 8,
  },
  actionBtn: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17, 24, 39, 0.06)',
  },
  priorityBadge: {
    fontSize: 11,
    color: '#006A63',
    fontWeight: '700',
  },
});
