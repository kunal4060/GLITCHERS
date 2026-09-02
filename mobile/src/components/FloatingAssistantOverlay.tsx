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

export const FloatingAssistantOverlay: React.FC = () => {
  const {
    isBubbleVisible,
    isMenuExpanded,
    activeMiniWindow,
    setMenuExpanded,
    openMiniWindow,
    closeMiniWindow,
  } = useFloatingStore();

  const { classes, tasks, expenses, emails, addExpense, addTask } = useDashboardStore();

  const [quickInput, setQuickInput] = useState('');
  const [quickAiResponse, setQuickAiResponse] = useState('');

  if (!isBubbleVisible) return null;

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
              {activeMiniWindow === 'AI' && '🤖 Quick Student AI'}
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
                <Text style={styles.cardText}>Speak or type expense (e.g. "Spent 150 on lunch"):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter expense..."
                  placeholderTextColor="#94A3B8"
                  value={quickInput}
                  onChangeText={setQuickInput}
                />
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    if (!quickInput.trim()) return;
                    addExpense({
                      id: String(Date.now()),
                      userId: 'u1',
                      amount: 150,
                      category: 'FOOD',
                      description: quickInput,
                      date: new Date().toISOString(),
                      type: 'EXPENSE',
                    });
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
                  placeholder="Add quick task..."
                  placeholderTextColor="#94A3B8"
                  value={quickInput}
                  onChangeText={setQuickInput}
                />
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    if (!quickInput.trim()) return;
                    addTask({
                      id: String(Date.now()),
                      userId: 'u1',
                      title: quickInput,
                      priority: 'HIGH',
                      status: 'TODO',
                      dueDate: new Date(Date.now() + 86400000).toISOString(),
                    });
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
                  placeholder="Ask anything about classes, money, tasks..."
                  placeholderTextColor="#94A3B8"
                  value={quickInput}
                  onChangeText={setQuickInput}
                />
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    if (!quickInput.trim()) return;
                    setQuickAiResponse(
                      `Here's your update for "${quickInput}": You have DBMS at 10:00 AM in room AB1-204, and ₹3,680 remaining in this month's budget.`
                    );
                  }}
                >
                  <Text style={styles.actionBtnText}>Ask AI</Text>
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
            <Text style={styles.menuItemText}>📧 Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('FINANCE')}>
            <Text style={styles.menuItemText}>💰 Finance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('TASKS')}>
            <Text style={styles.menuItemText}>✅ Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('CALENDAR')}>
            <Text style={styles.menuItemText}>🗓 Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => openMiniWindow('AI')}>
            <Text style={styles.menuItemText}>🤖 AI Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Draggable Floating Bubble */}
      <TouchableOpacity
        style={styles.floatingBubble}
        activeOpacity={0.8}
        onPress={() => setMenuExpanded(!isMenuExpanded)}
      >
        <Text style={styles.bubbleIcon}>🎓</Text>
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
  },
  floatingBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  bubbleIcon: {
    fontSize: 28,
  },
  menuDock: {
    position: 'absolute',
    bottom: 85,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 10,
    gap: 6,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  menuItemText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 14,
  },
  miniWindowContainer: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    maxHeight: 380,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38BDF8',
    padding: 16,
    elevation: 12,
  },
  miniWindowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  miniWindowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#38BDF8',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  miniWindowBody: {
    maxHeight: 300,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  cardText: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
  cardBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38BDF8',
  },
  cardSender: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  badge: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#F8FAFC',
    marginVertical: 8,
  },
  actionBtn: {
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  priorityBadge: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
});
