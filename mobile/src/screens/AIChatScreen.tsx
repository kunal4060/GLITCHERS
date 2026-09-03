import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { GradientBackground } from '../components/common/GradientBackground';
import { AIGemSymbol } from '../components/common/AIGemSymbol';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDashboardStore } from '../store/dashboardStore';
import { apiClient } from '../api/client';
import type { Task, Expense, Debt } from '@glitchers/shared';

interface ActionCardPayload {
  type: 'EXPENSE' | 'TASK' | 'DEBT' | 'CALENDAR' | 'SCHEDULE';
  title: string;
  subtitle?: string;
  primaryValue?: string;
  secondaryValue?: string;
  badge?: string;
  navigationScreen?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionCard?: ActionCardPayload;
  timestamp: string;
}

export const AIChatScreen = ({ navigation }: { navigation?: any }) => {
  const { classes, tasks, expenses, budget, debts, addTask, addExpense, addDebt, splitExpense, updateTaskPriority } =
    useDashboardStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  // Dynamic contextual prompt chips
  const lastUserText = messages.filter((m) => m.sender === 'user').slice(-1)[0]?.text.toLowerCase() || '';
  const getContextChips = () => {
    if (lastUserText.includes('spent') || lastUserText.includes('budget') || lastUserText.includes('food')) {
      return [
        { label: 'Food spending this month', prompt: 'What did I spend on food this month?' },
        { label: 'Split dinner with Rahul', prompt: 'Spent ₹500 on dinner with Rahul. Split it equally' },
        { label: 'View monthly budget', prompt: 'What is my budget status?' },
      ];
    }
    if (lastUserText.includes('class') || lastUserText.includes('schedule') || lastUserText.includes('tomorrow')) {
      return [
        { label: 'Classes tomorrow', prompt: 'What classes do I have tomorrow?' },
        { label: 'Add class to calendar', prompt: 'Add tomorrow DBMS class to my calendar' },
        { label: 'Next class room', prompt: 'Where is my next class?' },
      ];
    }
    if (lastUserText.includes('task') || lastUserText.includes('assignment')) {
      return [
        { label: 'Make urgent', prompt: 'Make that task extremely important' },
        { label: 'Mark complete', prompt: 'Mark AI assignment complete' },
        { label: 'Show all tasks', prompt: 'What tasks are pending?' },
      ];
    }
    // Default starter chips
    return [
      { label: 'Yesterday expenses', prompt: 'What amount did I expense yesterday?' },
      { label: 'Which classes do I have', prompt: 'Which classes do I have?' },
      { label: 'Daily expense budget', prompt: 'Calculate my daily expense allowance and remaining budget' },
      { label: 'Spent ₹180 on dinner', prompt: 'Spent ₹180 on dinner' },
      { label: 'Submit AI assignment', prompt: 'Remind me to submit AI assignment tomorrow. Make it extremely important' },
      { label: 'Split ₹600 with Rahul', prompt: 'Spent ₹600 on lunch with Rahul. Split it equally' },
    ];
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend) return;

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      // 1. Call real backend Fastify API
      const response = await apiClient.sendAIChat(textToSend);
      const resAny = response as any;

      let actionCard: ActionCardPayload | undefined;

      // Handle Cross-Module Split Expense
      if (resAny.toolExecuted === 'split_expense' && resAny.data) {
        const { expense, debt } = resAny.data;
        if (expense) addExpense(expense);
        if (debt) addDebt(debt);

        actionCard = {
          type: 'EXPENSE',
          title: '⚡ Bill Split Recorded',
          subtitle: `${expense?.description || 'Bill Split'}`,
          primaryValue: `₹${expense?.amount}`,
          secondaryValue: `${debt?.person} owes ₹${debt?.amount}`,
          badge: 'Finance + Debt Updated',
          navigationScreen: 'Finance',
        };
      }
      // Handle Single Expense
      else if (response.intent === 'ADD_EXPENSE' || resAny.toolExecuted === 'add_expense') {
        const expData = resAny.data;
        if (expData) {
          const newExp: Expense = {
            id: expData.id || String(Date.now()),
            userId: 'u1',
            amount: Number(expData.amount) || 100,
            category: expData.category || 'FOOD',
            description: expData.description || textToSend,
            date: new Date().toISOString(),
            type: 'EXPENSE',
          };
          addExpense(newExp);
          actionCard = {
            type: 'EXPENSE',
            title: '✓ Expense Added',
            subtitle: newExp.description,
            primaryValue: `₹${newExp.amount}`,
            secondaryValue: `${newExp.category} • Today`,
            badge: 'Added to Finance',
            navigationScreen: 'Finance',
          };
        }
      }
      // Handle Task Creation
      else if (response.intent === 'CREATE_TASK' || resAny.toolExecuted === 'create_task') {
        const taskData = resAny.data;
        if (taskData) {
          const newTask: Task = {
            id: taskData.id || String(Date.now()),
            userId: 'u1',
            title: taskData.title || textToSend,
            priority: taskData.priority || 'NORMAL',
            status: 'TODO',
            dueDate: taskData.dueDate || new Date(Date.now() + 86400000).toISOString(),
          };
          addTask(newTask);
          actionCard = {
            type: 'TASK',
            title: '✓ Task Created',
            subtitle: newTask.title,
            primaryValue: newTask.priority,
            secondaryValue: 'Due tomorrow',
            badge: 'Reminders Active',
            navigationScreen: 'Tasks',
          };
        }
      }
      // Handle Task Priority Update
      else if (response.intent === 'UPDATE_TASK' || resAny.toolExecuted === 'update_task_priority') {
        const updatedTask = resAny.data;
        if (updatedTask) {
          updateTaskPriority(updatedTask.id, updatedTask.priority);
          actionCard = {
            type: 'TASK',
            title: '✓ Priority Updated',
            subtitle: updatedTask.title,
            primaryValue: updatedTask.priority,
            badge: 'Urgent Alert Active',
            navigationScreen: 'Tasks',
          };
        }
      }
      // Handle Debt Creation
      else if (response.intent === 'ADD_DEBT' || resAny.toolExecuted === 'add_debt') {
        const debtData = resAny.data;
        if (debtData) {
          const newDebt: Debt = {
            id: debtData.id || String(Date.now()),
            userId: 'u1',
            person: debtData.person,
            type: debtData.type,
            amount: Number(debtData.amount),
            status: 'PENDING',
            paidAmount: 0,
            notes: debtData.notes,
            createdAt: new Date().toISOString(),
          };
          addDebt(newDebt);
          actionCard = {
            type: 'DEBT',
            title: '✓ Debt Ledger Updated',
            subtitle: `${newDebt.person} (${newDebt.type === 'OWES_ME' ? 'To Receive' : 'To Pay'})`,
            primaryValue: `₹${newDebt.amount}`,
            badge: 'Recorded in Debts',
            navigationScreen: 'Finance',
          };
        }
      }
      // Handle Calendar Event
      else if (response.intent === 'CREATE_CALENDAR_EVENT' || resAny.toolExecuted === 'create_calendar_event') {
        const ev = resAny.data || resAny.confirmationPayload;
        actionCard = {
          type: 'CALENDAR',
          title: '📅 Calendar Event Added',
          subtitle: ev?.title || 'Academic Session',
          primaryValue: `${ev?.startTime || '10:00 AM'} - ${ev?.location || 'Room'}`,
          badge: 'Synced to Schedule',
          navigationScreen: 'Calendar',
        };
      }

      // Safety Guard: If no action card was created but the user clearly asked for a task or expense
      if (!actionCard) {
        const lower = textToSend.toLowerCase();
        if (
          lower.startsWith('spent') ||
          lower.startsWith('paid') ||
          lower.startsWith('bought') ||
          (/\b(dinner|lunch|canteen|coffee|chai|tea|food|auto|cab|uber|ola|swiggy|zomato|stationery|book|books)\b/i.test(lower) && /\d+/.test(lower))
        ) {
          const amtMatch = textToSend.match(/\d+(?:\.\d+)?/);
          const amt = amtMatch ? parseFloat(amtMatch[0]) : 100;
          let cat: any = 'OTHER';
          if (/\b(dinner|lunch|canteen|coffee|chai|tea|food|swiggy|zomato|pizza|burger|snack)\b/i.test(lower)) cat = 'FOOD';
          else if (/\b(auto|cab|uber|ola|bus|metro|petrol|fuel)\b/i.test(lower)) cat = 'TRANSPORT';
          else if (/\b(book|books|stationery|print|xerox|notes)\b/i.test(lower)) cat = 'EDUCATION';

          let desc = textToSend.replace(/^(?:spent|paid|bought)\s+/i, '').trim();
          if (!desc) desc = cat === 'FOOD' ? 'Dining' : 'Expense';

          const newExp: Expense = {
            id: String(Date.now()),
            userId: 'u1',
            amount: amt,
            category: cat,
            description: desc,
            date: new Date().toISOString(),
            type: 'EXPENSE',
          };
          addExpense(newExp);
          actionCard = {
            type: 'EXPENSE',
            title: '✓ Expense Added',
            subtitle: newExp.description,
            primaryValue: `₹${newExp.amount}`,
            secondaryValue: `${newExp.category} • Today`,
            badge: 'Added to Finance',
            navigationScreen: 'Finance',
          };
        } else if (
          /\b(submit|complete|finish|prepare|study|read|write|homework|assignment|task|lab report|project|quiz|todo)\b/i.test(lower) ||
          lower.startsWith('remind me') ||
          lower.startsWith('i need to') ||
          lower.startsWith('i have to')
        ) {
          const cleanTitle = textToSend
            .replace(/^(?:remind me to|remember to|i need to|i have to|add task|create task)\s+/i, '')
            .replace(/(?:,\s*)?(?:make it|set priority to|priority:?)\s+(?:extremely )?(?:important|urgent|high|normal)/i, '')
            .trim();

          const newTask: Task = {
            id: String(Date.now()),
            userId: 'u1',
            title: cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : 'Academic Task',
            priority:
              lower.includes('urgent') || lower.includes('extremely')
                ? 'EXTREMELY_IMPORTANT'
                : lower.includes('important') || lower.includes('high')
                ? 'HIGH'
                : 'NORMAL',
            status: 'TODO',
            dueDate: new Date(Date.now() + 86400000).toISOString(),
          };
          addTask(newTask);
          actionCard = {
            type: 'TASK',
            title: '✓ Task Created',
            subtitle: newTask.title,
            primaryValue: newTask.priority,
            secondaryValue: 'Due tomorrow',
            badge: 'Reminders Active',
            navigationScreen: 'Tasks',
          };
        }
      }

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: response.message,
        actionCard,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Local natural language fallback engine
      const lower = textToSend.toLowerCase();
      let replyText = '';
      let actionCard: ActionCardPayload | undefined;

      if (lower.includes('split') && /\d+/.test(lower)) {
        const amt = parseFloat(textToSend.match(/\d+(?:\.\d+)?/)?.[0] || '500');
        let person = 'Rahul';
        const withM = textToSend.match(/with\s+([A-Za-z]+)/i);
        if (withM && withM[1]) person = withM[1];
        splitExpense(amt, 'Split bill', person);
        replyText = `Split ₹${amt}: Your share is ₹${Math.round(amt / 2)}, and ${person} owes you ₹${Math.round(amt / 2)}.`;
        actionCard = {
          type: 'EXPENSE',
          title: '⚡ Bill Split Recorded',
          subtitle: `Split with ${person}`,
          primaryValue: `₹${amt} Total`,
          secondaryValue: `${person} owes ₹${Math.round(amt / 2)}`,
          badge: 'Finance + Debt',
          navigationScreen: 'Finance',
        };
      } else if (
        lower.startsWith('spent') ||
        lower.startsWith('paid') ||
        lower.startsWith('bought') ||
        (/\b(dinner|lunch|canteen|coffee|chai|tea|food|auto|cab|uber|ola|swiggy|zomato|stationery|book|books)\b/i.test(lower) && /\d+/.test(lower))
      ) {
        const amtMatch = textToSend.match(/\d+(?:\.\d+)?/);
        const amt = amtMatch ? parseFloat(amtMatch[0]) : 100;
        let cat: any = 'FOOD';
        if (/\b(auto|cab|uber|ola|bus|metro|petrol)\b/i.test(lower)) cat = 'TRANSPORT';
        else if (/\b(book|books|stationery|print|xerox|notes)\b/i.test(lower)) cat = 'EDUCATION';

        let desc = textToSend.replace(/(?:spent|paid|bought|rs\.?|₹|\b\d+\b)/gi, '').trim();
        if (!desc) desc = cat === 'FOOD' ? 'Food & Dining' : 'Expense';

        const newExp: Expense = {
          id: String(Date.now()),
          userId: 'u1',
          amount: amt,
          category: cat,
          description: desc.charAt(0).toUpperCase() + desc.slice(1),
          date: new Date().toISOString(),
          type: 'EXPENSE',
        };
        addExpense(newExp);
        replyText = `Recorded ₹${amt} for ${newExp.description} under ${cat}. Added to your finance tracker.`;
        actionCard = {
          type: 'EXPENSE',
          title: '✓ Expense Added',
          subtitle: newExp.description,
          primaryValue: `₹${amt}`,
          secondaryValue: `${cat} • Today`,
          badge: 'Finance Updated',
          navigationScreen: 'Finance',
        };
      } else if (
        /\b(submit|complete|finish|prepare|study|read|write|homework|assignment|task|lab report|project|quiz|todo)\b/i.test(lower) ||
        lower.startsWith('remind me') ||
        lower.startsWith('i need to') ||
        lower.startsWith('i have to')
      ) {
        const cleanTitle = textToSend
          .replace(/^(?:remind me to|remember to|i need to|i have to|add task|create task)\s+/i, '')
          .replace(/(?:,\s*)?(?:make it|set priority to|priority:?)\s+(?:extremely )?(?:important|urgent|high|normal)/i, '')
          .trim();

        const newTask: Task = {
          id: String(Date.now()),
          userId: 'u1',
          title: cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : 'Academic Task',
          priority:
            lower.includes('urgent') || lower.includes('extremely')
              ? 'EXTREMELY_IMPORTANT'
              : lower.includes('important') || lower.includes('high')
              ? 'HIGH'
              : 'NORMAL',
          status: 'TODO',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        };
        addTask(newTask);
        replyText = `Task "${newTask.title}" scheduled for tomorrow with ${newTask.priority} priority. Added to task manager.`;
        actionCard = {
          type: 'TASK',
          title: '✓ Task Created',
          subtitle: newTask.title,
          primaryValue: newTask.priority,
          secondaryValue: 'Due tomorrow',
          badge: 'Reminders Active',
          navigationScreen: 'Tasks',
        };
      } else {
        replyText = `I processed: "${textToSend}". Your student companion records have been synchronized.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: replyText,
          actionCard,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AIGemSymbol size={34} />
          <View>
            <Text style={styles.headerTitle}>AI Student Companion</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Universal Command Center Active</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Chat Messages Feed or Empty State */}
      {messages.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <View style={{ marginBottom: 16 }}>
            <AIGemSymbol size={64} />
          </View>
          <Text style={styles.emptyTitle}>Universal Student Command Center</Text>
          <Text style={styles.emptyDescription}>
            Speak or type naturally. I can log your expenses, schedule assignments, split bills, and fetch live timetables.
          </Text>

          <Text style={styles.tryExamplesLabel}>TRY SAYING:</Text>
          <View style={styles.examplesList}>
            {getContextChips().map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.exampleCard}
                onPress={() => handleSend(chip.prompt)}
              >
                <Text style={styles.exampleText}>{chip.label}</Text>
                <Text style={styles.exampleArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
        >
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <View
                key={m.id}
                style={[styles.messageWrapper, isUser ? styles.msgRight : styles.msgLeft]}
              >
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.assistantBubbleText]}>{m.text}</Text>

                  {/* Visual Action Card */}
                  {m.actionCard && (
                    <GlassCard elevated style={styles.actionCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardActionTitle}>{m.actionCard.title}</Text>
                        {m.actionCard.badge && (
                          <View style={styles.cardBadge}>
                            <Text style={styles.cardBadgeText}>{m.actionCard.badge}</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.cardSub}>{m.actionCard.subtitle}</Text>

                      <View style={styles.cardValuesRow}>
                        <Text style={styles.cardPrimaryVal}>{m.actionCard.primaryValue}</Text>
                        {m.actionCard.secondaryValue && (
                          <Text style={styles.cardSecondaryVal}>{m.actionCard.secondaryValue}</Text>
                        )}
                      </View>

                      {m.actionCard.navigationScreen && (
                        <TouchableOpacity
                          style={styles.cardNavBtn}
                          onPress={() => navigation?.navigate(m.actionCard!.navigationScreen)}
                        >
                          <Text style={styles.cardNavBtnText}>
                            View in {m.actionCard.navigationScreen} →
                          </Text>
                        </TouchableOpacity>
                      )}
                    </GlassCard>
                  )}

                  <Text style={styles.msgTime}>{m.timestamp}</Text>
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={[styles.messageWrapper, styles.msgLeft]}>
              <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={designTokens.colors.aiSecondary} />
                <Text style={styles.loadingText}>Understanding context & executing tools...</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Dynamic Context Prompt Chips */}
      <View style={styles.chipsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {getContextChips().map((chip, i) => (
            <TouchableOpacity
              key={i}
              style={styles.chipPill}
              onPress={() => handleSend(chip.prompt)}
            >
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask or command anything..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  </GradientBackground>
);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.surfaceBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: designTokens.colors.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: { fontSize: 18 },
  headerTitle: { ...designTokens.typography.cardTitle, fontSize: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: designTokens.colors.success },
  statusText: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary },
  emptyContainer: {
    padding: designTokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyGlowCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: designTokens.colors.aiSubtle,
    borderWidth: 1.5,
    borderColor: designTokens.colors.aiBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { ...designTokens.typography.sectionTitle, fontSize: 18, textAlign: 'center' },
  emptyDescription: {
    ...designTokens.typography.body,
    textAlign: 'center',
    marginTop: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.xl,
    maxWidth: 320,
    lineHeight: 19,
  },
  tryExamplesLabel: { ...designTokens.typography.label, fontSize: 10, marginBottom: designTokens.spacing.sm, alignSelf: 'flex-start' },
  examplesList: { width: '100%', gap: designTokens.spacing.sm },
  exampleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    ...designTokens.shadows.card,
  },
  exampleText: { ...designTokens.typography.bodyMedium, fontSize: 13, color: designTokens.colors.textPrimary },
  exampleArrow: { color: designTokens.colors.primary, fontWeight: '800' },
  chatScroll: { flex: 1 },
  chatContent: { padding: designTokens.spacing.lg, paddingBottom: 20 },
  messageWrapper: { marginBottom: designTokens.spacing.md, flexDirection: 'row' },
  msgRight: { justifyContent: 'flex-end' },
  msgLeft: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    borderRadius: designTokens.radii.lg,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
  },
  userBubble: {
    backgroundColor: designTokens.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
    ...designTokens.shadows.card,
  },
  bubbleText: { ...designTokens.typography.bodyMedium, lineHeight: 20 },
  userBubbleText: { color: '#FFFFFF' },
  assistantBubbleText: { color: designTokens.colors.textPrimary },
  msgTime: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  actionCard: {
    marginTop: designTokens.spacing.md,
    backgroundColor: '#FAF7F2',
    borderColor: 'rgba(117, 167, 165, 0.25)',
    padding: designTokens.spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardActionTitle: { ...designTokens.typography.cardTitle, fontSize: 13, color: designTokens.colors.textPrimary },
  cardBadge: {
    backgroundColor: designTokens.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: designTokens.radii.xs,
  },
  cardBadgeText: { ...designTokens.typography.micro, color: designTokens.colors.primaryDeep, fontWeight: '800', fontSize: 9 },
  cardSub: { ...designTokens.typography.body, fontSize: 12, marginBottom: designTokens.spacing.sm },
  cardValuesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
  },
  cardPrimaryVal: { ...designTokens.typography.cardTitle, fontSize: 16, color: designTokens.colors.primaryDark },
  cardSecondaryVal: { ...designTokens.typography.micro, color: designTokens.colors.textMuted },
  cardNavBtn: {
    backgroundColor: designTokens.colors.primary,
    paddingVertical: 6,
    borderRadius: designTokens.radii.sm,
    alignItems: 'center',
  },
  cardNavBtnText: { ...designTokens.typography.micro, color: '#FFFFFF', fontWeight: '800' },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  loadingText: { ...designTokens.typography.body, fontSize: 12, color: designTokens.colors.textSecondary },
  chipsBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 51, 50, 0.06)',
    paddingVertical: designTokens.spacing.xs + 2,
  },
  chipsContent: {
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  chipPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  chipText: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: '#FAF7F2',
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 51, 50, 0.08)',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.pill,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: 10,
    color: designTokens.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.10)',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: designTokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: designTokens.colors.surfaceSubtle,
    opacity: 0.5,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
});
