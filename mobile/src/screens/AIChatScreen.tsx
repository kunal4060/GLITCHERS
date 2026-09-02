import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useDashboardStore } from '../store/dashboardStore';

interface ChatBubble {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolData?: any;
}

export const AIChatScreen: React.FC = () => {
  const { classes, expenses, budget } = useDashboardStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello Kunal! I am your AI Student Life Companion. Ask me about your class schedule, expenses, tasks, or email notices.',
    },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userText = input.trim();
    const userMsg: ChatBubble = { id: String(Date.now()), sender: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Process with assistant logic
    setTimeout(() => {
      let replyText = '';
      const lower = userText.toLowerCase();

      if (lower.includes('today') && (lower.includes('class') || lower.includes('schedule'))) {
        const list = classes.map((c) => `• ${c.subjectName} (${c.startTime} - ${c.endTime}) in Room ${c.room || 'AB1-204'}`).join('\n');
        replyText = `Here is your schedule for today:\n${list}`;
      } else if (lower.includes('spent') || lower.includes('spend') || lower.includes('budget')) {
        const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        replyText = `You have spent ₹${total} this month. You have ₹${(budget?.monthlyLimit || 10000) - total} remaining in your budget.`;
      } else if (lower.includes('task') || lower.includes('assignment')) {
        replyText = 'You have 2 pending assignments: AI Assignment 2 (due in 2 days) and DBMS Lab Report.';
      } else {
        replyText = `I understand your request for "${userText}". I am synchronizing with your university schedule and student records.`;
      }

      const assistantMsg: ChatBubble = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: replyText,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 400);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <View style={styles.container}>
      {/* Messages Feed */}
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.sender === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={styles.bubbleText}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Suggested Quick Prompts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptScroll}>
        <TouchableOpacity style={styles.promptChip} onPress={() => handleQuickPrompt('What classes do I have today?')}>
          <Text style={styles.promptChipText}>🗓 Today's Classes?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.promptChip} onPress={() => handleQuickPrompt('How much did I spend this month?')}>
          <Text style={styles.promptChipText}>💰 Monthly Spending?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.promptChip} onPress={() => handleQuickPrompt('What assignments are due?')}>
          <Text style={styles.promptChipText}>✅ Upcoming Tasks?</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask anything..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 14, marginBottom: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#3B82F6' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  bubbleText: { color: '#F8FAFC', fontSize: 14, lineHeight: 20 },
  promptScroll: { maxHeight: 50, paddingHorizontal: 12 },
  promptChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  promptChipText: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    paddingHorizontal: 16,
    color: '#F8FAFC',
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
