/**
 * AITaskCreatorScreen — ChatGPT-style AI task creator inside the Task Manager.
 *
 * The user just types what they want in natural language (English/Hinglish),
 * NIA analyses it into a structured task (title, due date/time, priority),
 * shows a confirmation card, and creates the task on confirm.
 *
 * Offline-first: taskIntentParser runs on-device. If the rule engine is not
 * confident and an on-device LLM (llama.rn) model is loaded, it asks the model
 * for structured JSON as a fallback.
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import {
  parseTaskIntent,
  isConfirmation,
  isCancellation,
  describeDraft,
  type TaskDraft,
  type TaskPriorityValue,
} from '../services/taskIntentParser';
import { isLlamaModelReady, llamaGenerate } from '../services/llamaInference';

const C = designTokens.colors;

interface CreatorMsg {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  draft?: TaskDraft;
  timestamp: string;
}

type Phase = 'idle' | 'awaiting-date' | 'confirming';

const STARTER_CHIPS = [
  'Kal shaam 5 baje physics assignment submit karna hai',
  'Parso subah 9 baje gym jana hai',
  'Mummy ko phone karna hai aaj raat ko, important hai',
  'Monday ko maths test hai, urgent',
];

const now12 = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const VALID_PRIO: TaskPriorityValue[] = ['LOW', 'NORMAL', 'HIGH', 'EXTREMELY_IMPORTANT'];

/** Ask the on-device LLM to extract a task as strict JSON. Null on any failure. */
async function refineWithLlm(text: string): Promise<TaskDraft | null> {
  try {
    const prompt =
      'Extract a to-do task from the message below. Reply with ONLY a JSON object, no other text. ' +
      'Format: {"title":"short task title","dueDate":"ISO datetime or null","priority":"LOW|NORMAL|HIGH|EXTREMELY_IMPORTANT"}. ' +
      `Today is ${new Date().toISOString().slice(0, 10)}. Message: "${text}"`;
    const out = await llamaGenerate(prompt);
    const start = out.indexOf('{');
    const end = out.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    const parsed = JSON.parse(out.slice(start, end + 1));
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    if (!title) return null;
    const priority: TaskPriorityValue = VALID_PRIO.includes(parsed.priority) ? parsed.priority : 'NORMAL';
    let dueDate: string | null = null;
    if (typeof parsed.dueDate === 'string' && parsed.dueDate) {
      const d = new Date(parsed.dueDate);
      if (!Number.isNaN(d.getTime())) dueDate = d.toISOString();
    }
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      description: '',
      dueDate,
      priority,
      confidence: dueDate ? 'high' : 'medium',
      needsDate: !dueDate,
    };
  } catch {
    return null;
  }
}

export const AITaskCreatorScreen = ({ navigation }: { navigation?: any }) => {
  const { addTask } = useDashboardStore();
  const [messages, setMessages] = useState<CreatorMsg[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! 🙋 Main tumhara task assistant hoon.\n\nBas aise likho jaise mujhse baat kar rahe ho —\n"Kal shaam 5 baje assignment submit karna hai"\n\nMain samajh ke task bana dunga. ✅',
      timestamp: now12(),
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingDraft, setPendingDraft] = useState<TaskDraft | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const pushMsg = (m: Omit<CreatorMsg, 'id' | 'timestamp'>) =>
    setMessages((prev) => [
      ...prev,
      { ...m, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: now12() },
    ]);

  const scrollDown = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const showDraftCard = (draft: TaskDraft) => {
    const { dueText, prioText } = describeDraft(draft);
    pushMsg({
      sender: 'assistant',
      text: `Ye task banau? 👇\n\n📌 ${draft.title}\n🗓️ ${dueText}\n⚡ ${prioText}`,
      draft,
    });
    setPendingDraft(draft);
    setPhase('confirming');
    scrollDown();
  };

  const confirmDraft = async (draft: TaskDraft) => {
    const userId = useAuthStore.getState().user?.id || 'offline-user';
    try {
      await addTask({
        title: draft.title,
        description: draft.description || undefined,
        dueDate: draft.dueDate || undefined,
        priority: draft.priority,
        status: 'TODO',
        userId,
      } as any);
      pushMsg({
        sender: 'assistant',
        text: `✅ Task add ho gaya!\n\n📌 ${draft.title}\n\nTasks list me dekh sakte ho. Kuch aur add karna hai?`,
      });
    } catch {
      pushMsg({
        sender: 'assistant',
        text: '⚠️ Task save nahi ho paya. Dobara try karo.',
      });
    }
    setPendingDraft(null);
    setPhase('idle');
    scrollDown();
  };

  const cancelDraft = () => {
    pushMsg({ sender: 'assistant', text: 'Theek hai, cancel kar diya. 👍 Naya task likho jab chaho.' });
    setPendingDraft(null);
    setPhase('idle');
    scrollDown();
  };

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || thinking) return;
    pushMsg({ sender: 'user', text });
    if (!customText) setInput('');
    scrollDown();

    // --- confirmation / cancellation shortcuts ---
    if (phase === 'confirming' && pendingDraft) {
      if (isConfirmation(text)) { await confirmDraft(pendingDraft); return; }
      if (isCancellation(text)) { cancelDraft(); return; }
      // Anything else: treat as a fresh request (drop the old draft).
      setPendingDraft(null);
      setPhase('idle');
    }
    if (phase === 'awaiting-date' && pendingDraft) {
      if (isCancellation(text)) { cancelDraft(); return; }
      const dateOnly = parseTaskIntent(`task ${text}`);
      if (dateOnly.dueDate) {
        // User typed a whole new task instead of just a date -> start fresh.
        if (dateOnly.title && dateOnly.title.toLowerCase() !== pendingDraft.title.toLowerCase()) {
          setPendingDraft(null);
          setPhase('idle');
          await processNewRequest(text);
          return;
        }
        const merged: TaskDraft = { ...pendingDraft, dueDate: dateOnly.dueDate, confidence: 'high', needsDate: false };
        showDraftCard(merged);
      } else {
        pushMsg({
          sender: 'assistant',
          text: 'Date samajh nahi aayi. 😅 Aise likho: "kal", "parso", "monday", "5 oct" ya "12/10".',
        });
        scrollDown();
      }
      return;
    }

    await processNewRequest(text);
  };

  const processNewRequest = async (text: string) => {
    // --- fresh parse ---
    setThinking(true);
    let draft = parseTaskIntent(text);

    // LLM fallback when the rule engine is unsure and a model is loaded.
    if (draft.confidence === 'low' && isLlamaModelReady()) {
      const llmDraft = await refineWithLlm(text);
      if (llmDraft && llmDraft.title) draft = llmDraft;
    }
    setThinking(false);

    if (draft.confidence === 'low' || !draft.title) {
      pushMsg({
        sender: 'assistant',
        text: 'Hmm, samajh nahi aaya. 😅 Thoda detail me likho, jaise:\n"Kal shaam 5 baje library se books lani hain"',
      });
      scrollDown();
      return;
    }
    if (draft.needsDate) {
      pushMsg({
        sender: 'assistant',
        text: `Samajh gaya: "${draft.title}" 👍\n\nYe **kab tak** karna hai? (jaise: kal, parso, monday, 5 oct)`,
      });
      setPendingDraft(draft);
      setPhase('awaiting-date');
      scrollDown();
      return;
    }
    showDraftCard(draft);
  };

  const renderDraftCard = (draft: TaskDraft) => {
    const { dueText, prioText } = describeDraft(draft);
    const active = phase === 'confirming' && pendingDraft === draft;
    return (
      <View style={styles.draftCard}>
        <View style={styles.draftRow}>
          <Ionicons name="clipboard-outline" size={16} color={C.eucalyptus} />
          <Text style={styles.draftTitle} numberOfLines={2}>{draft.title}</Text>
        </View>
        <Text style={styles.draftMeta}>🗓️ {dueText}</Text>
        <Text style={styles.draftMeta}>⚡ {prioText}</Text>
        {active && (
          <View style={styles.draftBtns}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => confirmDraft(draft)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Add task"
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Add kar do</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={cancelDraft}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Cancel task"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation?.goBack?.()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to tasks"
          >
            <Ionicons name="chevron-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle}>✨ AI Task Creator</Text>
            <Text style={styles.headerSub}>Bolo, NIA task bana degi</Text>
          </View>
          <View style={styles.aiDot}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => (
            <View
              key={m.id}
              style={[styles.msgWrap, m.sender === 'user' ? styles.msgRight : styles.msgLeft]}
            >
              <View
                style={[
                  styles.bubble,
                  m.sender === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={[styles.bubbleText, m.sender === 'user' ? styles.userText : styles.assistantText]}>
                  {m.text}
                </Text>
                {m.draft ? renderDraftCard(m.draft) : null}
              </View>
              <Text style={[styles.msgTime, m.sender === 'user' && styles.msgTimeUser]}>
                {m.timestamp}
              </Text>
            </View>
          ))}
          {thinking && (
            <View style={[styles.msgWrap, styles.msgLeft]}>
              <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={C.eucalyptus} />
                <Text style={styles.loadingText}>NIA samajh rahi hai…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Starter chips */}
        {messages.length <= 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {STARTER_CHIPS.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.chip}
                onPress={() => handleSend(c)}
                activeOpacity={0.8}
              >
                <Text style={styles.chipText} numberOfLines={2}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder='Jaise: "Kal 5 baje gym jana hai"'
            placeholderTextColor={C.textSubtle}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || thinking}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.hairline, backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.porcelain,
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  headerSub: { fontSize: 11.5, color: C.textMuted, marginTop: 1 },
  aiDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.eucalyptus,
    alignItems: 'center', justifyContent: 'center',
  },
  chatScroll: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  msgWrap: { marginBottom: 10, maxWidth: '88%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 18, padding: 13, borderWidth: 1 },
  assistantBubble: {
    backgroundColor: '#FFFFFF', borderColor: C.hairline, borderBottomLeftRadius: 6,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04,
    shadowRadius: 6, elevation: 1,
  },
  userBubble: { backgroundColor: C.obsidian, borderColor: C.obsidian, borderBottomRightRadius: 6 },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  assistantText: { color: C.ink },
  userText: { color: '#FFFFFF' },
  msgTime: { fontSize: 10, color: C.textSubtle, marginTop: 6 },
  msgTimeUser: { color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12.5, color: C.textSecondary, fontStyle: 'italic' },
  draftCard: {
    marginTop: 10, backgroundColor: C.porcelain, borderWidth: 1,
    borderColor: C.hairline, borderRadius: 14, padding: 12,
  },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  draftTitle: { fontSize: 14, fontWeight: '700', color: C.ink, flex: 1 },
  draftMeta: { fontSize: 12.5, color: C.textSecondary, marginBottom: 3 },
  draftBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.eucalyptus, borderRadius: 12, paddingVertical: 10,
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 },
  cancelBtn: {
    paddingHorizontal: 16, justifyContent: 'center',
    borderWidth: 1, borderColor: C.hairline, borderRadius: 12, backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { color: C.textSecondary, fontWeight: '600', fontSize: 13.5 },
  chipsRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, maxWidth: 250,
  },
  chipText: { fontSize: 12.5, color: C.textSecondary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.hairline, backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1, backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 14.5, color: C.ink, maxHeight: 110,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.eucalyptus,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
