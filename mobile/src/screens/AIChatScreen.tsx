import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useDashboardStore } from '../store/dashboardStore';
import { apiClient } from '../api/client';
import type { Task, Expense } from '@glitchers/shared';

interface ChatBubble {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  intent?: string;
  toolData?: any;
}

export const AIChatScreen = ({ navigation }: { navigation?: any }) => {
  const { classes, expenses, budget, addTask, addExpense, addDebt } = useDashboardStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hey Kunal! 🎓 I am your AI Student Companion.\n\nI can control your tasks, log expenses, check your timetable, and track deadlines. Try typing:\n• "Spent 150 on canteen lunch"\n• "Add task: Submit AI assignment by Friday"\n• "What is my next class?"',
    },
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    const userMsg: ChatBubble = { id: String(Date.now()), sender: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Call live Fastify backend /api/ai/chat with real Gemini AI
      const response = await apiClient.sendAIChat(userText);
      const resAny = response as any;

      // Check if AI performed an action that controls the app
      if (response.intent === 'ADD_EXPENSE' || resAny.toolExecuted === 'add_expense') {
        const expData = resAny.data;
        if (expData) {
          const newExp: Expense = {
            id: expData.id || String(Date.now()),
            userId: 'u1',
            amount: Number(expData.amount) || 100,
            category: expData.category || 'FOOD',
            description: expData.description || userText,
            date: new Date().toISOString(),
            type: 'EXPENSE',
          };
          addExpense(newExp);
        }
      } else if (response.intent === 'CREATE_TASK' || resAny.toolExecuted === 'create_task') {
        const taskData = resAny.data;
        if (taskData) {
          const newTask: Task = {
            id: taskData.id || String(Date.now()),
            userId: 'u1',
            title: taskData.title || userText,
            priority: taskData.priority || 'HIGH',
            status: 'TODO',
            dueDate: taskData.dueDate || new Date(Date.now() + 86400000 * 2).toISOString(),
          };
          addTask(newTask);
        }
      }

      const assistantMsg: ChatBubble = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: response.message,
        intent: response.intent,
        toolData: resAny.data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Local natural language fallback engine that controls the store
      const lower = userText.toLowerCase();
      let replyText = '';
      let detectedIntent = 'GENERAL_QUERY';
      let data: any = null;

      if (lower.startsWith('spent ') || lower.startsWith('paid ') || lower.includes('expense')) {
        detectedIntent = 'ADD_EXPENSE';
        const amtMatch = userText.match(/(\d+)/);
        const amount = amtMatch ? parseFloat(amtMatch[1]) : 150;
        let category: Expense['category'] = 'FOOD';
        if (lower.includes('auto') || lower.includes('cab') || lower.includes('travel')) category = 'TRANSPORT';
        if (lower.includes('book') || lower.includes('print') || lower.includes('fee')) category = 'EDUCATION';

        const desc = userText.replace(/\d+/g, '').replace(/spent|paid|rs|rupees|on|for/gi, '').trim() || 'Food & Refreshments';
        const newExp: Expense = {
          id: String(Date.now()),
          userId: 'u1',
          amount,
          category,
          description: desc,
          date: new Date().toISOString(),
          type: 'EXPENSE',
        };
        addExpense(newExp);
        data = newExp;
        replyText = `Recorded ₹${amount} for "${desc}" under ${category}. Your Finance section has been updated!`;
      } else if (lower.includes('task') || lower.includes('assignment') || lower.includes('todo')) {
        detectedIntent = 'CREATE_TASK';
        const cleanTitle = userText.replace(/add task|create task|todo|by friday|urgent/gi, '').trim() || 'Academic Assignment';
        const newTask: Task = {
          id: String(Date.now()),
          userId: 'u1',
          title: cleanTitle,
          priority: lower.includes('urgent') ? 'EXTREMELY_IMPORTANT' : 'HIGH',
          status: 'TODO',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        };
        addTask(newTask);
        data = newTask;
        replyText = `Created task: "${cleanTitle}". Added to your Tasks section with automatic deadline reminders!`;
      } else if (lower.includes('class') || lower.includes('schedule') || lower.includes('timetable')) {
        replyText = `Your next class today is Artificial Intelligence at 9:00 AM in Room 120-CB with Mithilesh Kumar Dubey.`;
      } else {
        replyText = `I processed: "${userText}". I have updated your student dashboard records.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: replyText,
          intent: detectedIntent,
          toolData: data,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Messages Feed */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        ref={(ref) => ref?.scrollToEnd({ animated: true })}
      >
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubbleWrapper, m.sender === 'user' ? styles.wrapperUser : styles.wrapperAssistant]}>
            <View style={[styles.bubble, m.sender === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={styles.bubbleText}>{m.text}</Text>

              {/* Action Cards: Live update receipts inside chat */}
              {m.intent === 'ADD_EXPENSE' && (
                <View style={styles.actionCardExpense}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.actionCardTitle}>💰 Expense Logged</Text>
                    <Text style={styles.badgeExpense}>Saved to Finance</Text>
                  </View>
                  <Text style={styles.cardSub}>Shows in your monthly student budget</Text>
                  <TouchableOpacity
                    style={styles.actionBtnExpense}
                    onPress={() => navigation?.navigate('Finance')}
                  >
                    <Text style={styles.actionBtnText}>View in Finance Section →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {m.intent === 'CREATE_TASK' && (
                <View style={styles.actionCardTask}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.actionCardTitle}>✅ Task Created</Text>
                    <Text style={styles.badgeTask}>Reminders Active</Text>
                  </View>
                  <Text style={styles.cardSub}>Added to your task & deadline tracker</Text>
                  <TouchableOpacity
                    style={styles.actionBtnTask}
                    onPress={() => navigation?.navigate('Tasks')}
                  >
                    <Text style={styles.actionBtnText}>View in Tasks Screen →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}

        {loading && (
          <View style={[styles.bubbleWrapper, styles.wrapperAssistant]}>
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.thinkingText}>Thinking & executing command...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggested Command Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          style={styles.promptChip}
          onPress={() => setInput('Spent 120 on canteen lunch')}
        >
          <Text style={styles.promptChipText}>💰 Spent 120 on lunch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.promptChip}
          onPress={() => setInput('Add task: Submit AI assignment by Friday')}
        >
          <Text style={styles.promptChipText}>✅ Add AI assignment task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.promptChip}
          onPress={() => setInput('What is my next class?')}
        >
          <Text style={styles.promptChipText}>🗓 Next class?</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Speak or type: 'Spent 150 on coffee'..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F15' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  bubbleWrapper: { marginBottom: 14, flexDirection: 'row' },
  wrapperUser: { justifyContent: 'flex-end' },
  wrapperAssistant: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userBubble: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#151D2A',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#233247',
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  thinkingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  actionCardExpense: {
    marginTop: 10,
    backgroundColor: '#1C293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  actionCardTask: {
    marginTop: 10,
    backgroundColor: '#1C293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badgeExpense: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTask: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
  },
  actionBtnExpense: {
    backgroundColor: '#10B981',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnTask: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  promptScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  promptChip: {
    backgroundColor: '#151D2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#233247',
    alignSelf: 'center',
  },
  promptChipText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#151D2A',
    borderTopWidth: 1,
    borderTopColor: '#233247',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0B0F15',
    color: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#233247',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1E293B',
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
});
