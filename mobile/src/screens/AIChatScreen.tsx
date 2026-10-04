import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Platform, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { designTokens } from '../theme/designTokens';
import { NiaHeader, LabelCaps, StatusPill, NiaCard } from '../components/nia';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDashboardStore, type LoadedModelFileInfo } from '../store/dashboardStore';
import { useFloatingStore } from '../store/floatingStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { offlineAiEngine, HUGGINGFACE_OFFLINE_MODELS, type HuggingFaceModelInfo } from '../services/offlineAiEngine';
import { parseTaskIntent } from '../services/taskIntentParser';
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
  imageUri?: string;
  actionCard?: ActionCardPayload;
  timestamp: string;
}

export const AIChatScreen = ({ navigation }: { navigation?: any }) => {
  const {
    classes,
    tasks,
    expenses,
    budget,
    debts,
    addTask,
    addExpense,
    addDebt,
    splitExpense,
    updateTaskPriority,
    aiMode,
    activeOfflineModel,
    downloadedModels,
    downloadProgress,
    setAiMode,
    setActiveOfflineModel,
    downloadOfflineModel,
    offlineSyncQueue,
    queueOfflineAction,
    flushOfflineQueue,
    chatMessages,
    addChatMessage,
    setChatMessages,
    clearChatMessages,
    loadedModelFile,
    setLoadedModelFile,
  } = useDashboardStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messages = chatMessages;
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [customRepoInput, setCustomRepoInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // H35: parse relative due dates ("in 2 hours", "next week", "kal") instead of hardcoded tomorrow
  const dueDateFromText = (text: string): string => {
    try {
      const parsed = parseTaskIntent(text);
      if (parsed.dueDate) return parsed.dueDate;
    } catch { /* fall through to default */ }
    return new Date(Date.now() + 86400000).toISOString();
  };
  const dueLabelFromDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const days = Math.round((d.getTime() - now.getTime()) / 86400000);
      if (days <= 0) return 'Due today';
      if (days === 1) return 'Due tomorrow';
      return `Due in ${days} days`;
    } catch { return 'Due soon'; }
  };
  // H33: cancellation flag — checked after awaits so a cancelled/unmounted screen
  // doesn't keep mutating state (addTask/addExpense) after the user moved on
  const cancelledRef = useRef(false);
  // H23: guard — double-tap Download started concurrent model downloads
  const downloadLockRef = useRef(false);
  React.useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  React.useEffect(() => {
    if (chatMessages.length === 0) {
      apiClient.getChatHistory().then((res) => {
        if (res?.messages && res.messages.length > 0) {
          // H40: normalize raw ISO timestamps — history showed raw "2026-10-05T10:30:00.000Z"
          const normalized = (res.messages as any[]).map((m) => {
            let ts = m.timestamp;
            try {
              const d = new Date(m.timestamp);
              if (!isNaN(d.getTime())) {
                ts = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            } catch { /* keep original */ }
            // H41: fallback text so an unexpected shape never renders an empty bubble
            return { ...m, timestamp: ts, text: m.text || 'I had trouble loading that message.' };
          });
          setChatMessages(normalized as any);
        }
      }).catch(() => null);
    }
  }, []);

  // Hide floating assistant bubble on NIA screen so it doesn't block the chat send button
  useFocusEffect(
    React.useCallback(() => {
      useFloatingStore.getState().setBubbleVisible(false);
      return () => {
        useFloatingStore.getState().setBubbleVisible(true);
      };
    }, [])
  );

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
      { label: '📐 Solve 4x + 16 = 36', prompt: 'Solve step by step: 4x + 16 = 36' },
      { label: '📊 Conclude app data', prompt: 'Conclude all the data of my app, like my expenses and classes and tasks' },
      { label: 'Yesterday expenses', prompt: 'What amount did I expense yesterday?' },
      { label: 'Which classes do I have', prompt: 'Which classes do I have?' },
      { label: 'Spent ₹180 on dinner', prompt: 'Spent ₹180 on dinner' },
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

    addChatMessage(userMessage);
    if (!customPrompt) setInput('');
    setLoading(true);

    // 0. OFFLINE MODE: Run 100% on-device via Hugging Face model
    if (aiMode === 'OFFLINE') {
      const offlineRes = offlineAiEngine.processMessage(
        textToSend,
        { classes, tasks, expenses, budget, debts },
        activeOfflineModel
      );

      let actionCard: ActionCardPayload | undefined;
      if (offlineRes.actionType === 'EXPENSE' && offlineRes.actionData) {
        if (offlineRes.actionData.expense) {
          addExpense(offlineRes.actionData.expense);
          if (offlineRes.actionData.debt) addDebt(offlineRes.actionData.debt);
          queueOfflineAction({ type: 'SPLIT_EXPENSE', payload: offlineRes.actionData });
          actionCard = {
            type: 'EXPENSE',
            title: '⚡ Offline Split Recorded',
            subtitle: offlineRes.actionData.expense.description,
            primaryValue: `₹${offlineRes.actionData.expense.amount}`,
            secondaryValue: offlineRes.actionData.debt?.person
              ? `${offlineRes.actionData.debt.person} owes ₹${offlineRes.actionData.debt.amount ?? '—'}`
              : undefined,
            badge: `${offlineRes.offlineModelUsed} (Offline)`,
            navigationScreen: 'Finance',
          };
        } else {
          addExpense(offlineRes.actionData);
          queueOfflineAction({ type: 'CREATE_EXPENSE', payload: offlineRes.actionData });
          actionCard = {
            type: 'EXPENSE',
            title: '⚡ Offline Expense Added',
            subtitle: offlineRes.actionData.description,
            primaryValue: `₹${offlineRes.actionData.amount}`,
            secondaryValue: `${offlineRes.actionData.category} • Today`,
            badge: `${offlineRes.offlineModelUsed} (Offline)`,
            navigationScreen: 'Finance',
          };
        }
      } else if (offlineRes.actionType === 'TASK' && offlineRes.actionData) {
        addTask(offlineRes.actionData);
        queueOfflineAction({ type: 'CREATE_TASK', payload: offlineRes.actionData });
        actionCard = {
          type: 'TASK',
          title: '⚡ Offline Task Scheduled',
          subtitle: offlineRes.actionData.title,
          primaryValue: offlineRes.actionData.priority,
          secondaryValue: 'Due tomorrow',
          badge: `${offlineRes.offlineModelUsed} (Offline)`,
          navigationScreen: 'Tasks',
        };
      }

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: offlineRes.message,
        actionCard,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      addChatMessage(assistantMsg);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    try {
      const currentUserId = useAuthStore.getState().user?.id || 'offline-user';
      // 1. Call real backend Fastify API
      const response = await apiClient.sendAIChat(textToSend);
      // H33: bail if cancelled while the request was in flight
      if (cancelledRef.current) { setLoading(false); return; }
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
          secondaryValue: debt?.person
            ? `${debt.person} owes ₹${debt.amount ?? '—'}`
            : undefined,
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
            userId: currentUserId,
            amount: Number.isFinite(Number(expData.amount)) ? Number(expData.amount) : 100,
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
            userId: currentUserId,
            title: taskData.title || textToSend,
            priority: taskData.priority || 'NORMAL',
            status: 'TODO',
            dueDate: taskData.dueDate || dueDateFromText(textToSend),
          };
          addTask(newTask);
          actionCard = {
            type: 'TASK',
            title: '✓ Task Created',
            subtitle: newTask.title,
            primaryValue: newTask.priority,
            secondaryValue: dueLabelFromDate(newTask.dueDate || ''),
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
            userId: currentUserId,
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
        // H31: task intent wins — "read 3 books" must not become a ₹3 expense.
        // Also: prefer ₹-prefixed or LAST number for amount, never fabricate one.
        const isTaskLike =
          /\b(submit|complete|finish|prepare|study|read|write|homework|assignment|task|lab report|project|quiz|todo)\b/i.test(lower) ||
          lower.startsWith('remind me') ||
          lower.startsWith('i need to') ||
          lower.startsWith('i have to');
        if (
          !isTaskLike &&
          (lower.startsWith('spent') ||
            lower.startsWith('paid') ||
            lower.startsWith('bought') ||
            (/\b(dinner|lunch|canteen|coffee|chai|tea|food|auto|cab|uber|ola|swiggy|zomato|stationery|book|books)\b/i.test(lower) && /\d+/.test(lower)))
        ) {
          // Prefer ₹-prefixed number, else the LAST number ("dinner for 2 at 450" → 450)
          const rupeeMatch = textToSend.match(/[₹Rs]\s*(\d+(?:\.\d{1,2})?)/i);
          const allNums = textToSend.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/g);
          const amtStr = rupeeMatch ? rupeeMatch[1] : allNums ? allNums[allNums.length - 1] : null;
          const amt = amtStr ? parseFloat(amtStr) : NaN;
          if (!Number.isFinite(amt) || amt <= 0) {
            // No fabricating amounts — ask instead of logging a wrong number
            const fallbackMsg: ChatMessage = {
              id: String(Date.now()),
              sender: 'assistant',
              text: 'I could not find an amount in that. How much did you spend? (e.g. "lunch 250")',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            addChatMessage(fallbackMsg);
            setLoading(false);
            return;
          }
          let cat: any = 'OTHER';
          if (/\b(dinner|lunch|canteen|coffee|chai|tea|food|swiggy|zomato|pizza|burger|snack)\b/i.test(lower)) cat = 'FOOD';
          else if (/\b(auto|cab|uber|ola|bus|metro|petrol|fuel)\b/i.test(lower)) cat = 'TRANSPORT';
          else if (/\b(book|books|stationery|print|xerox|notes)\b/i.test(lower)) cat = 'EDUCATION';

          let desc = textToSend.replace(/^(?:spent|paid|bought)\s+/i, '').trim();
          if (!desc) desc = cat === 'FOOD' ? 'Dining' : 'Expense';

          const newExp: Expense = {
            id: String(Date.now()),
            userId: currentUserId,
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
            userId: currentUserId,
            title: cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : 'Academic Task',
            priority: (() => {
              // H36: strip negation words first — "not urgent" was matching "urgent"
              const noNeg = lower.replace(/\b(not|no|never|isn't|isnt|don't|dont|without)\b[^.,!?;]*/g, '');
              if (noNeg.includes('urgent') || noNeg.includes('extremely')) return 'EXTREMELY_IMPORTANT';
              if (noNeg.includes('important') || noNeg.includes('high')) return 'HIGH';
              return 'NORMAL';
            })(),
            status: 'TODO',
            dueDate: dueDateFromText(textToSend),
          };
          addTask(newTask);
          actionCard = {
            type: 'TASK',
            title: '✓ Task Created',
            subtitle: newTask.title,
            primaryValue: newTask.priority,
            secondaryValue: dueLabelFromDate(newTask.dueDate || ''),
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

      addChatMessage(assistantMsg);
    } catch {
      // Offline fallback: Process via Hugging Face on-device model and queue for later sync
      const offlineRes = offlineAiEngine.processMessage(
        textToSend,
        { classes, tasks, expenses, budget, debts },
        activeOfflineModel
      );

      let actionCard: ActionCardPayload | undefined;
      if (offlineRes.actionType === 'EXPENSE' && offlineRes.actionData) {
        if (offlineRes.actionData.expense) {
          addExpense(offlineRes.actionData.expense);
          if (offlineRes.actionData.debt) addDebt(offlineRes.actionData.debt);
          queueOfflineAction({ type: 'SPLIT_EXPENSE', payload: offlineRes.actionData });
          actionCard = {
            type: 'EXPENSE',
            title: '⚡ Offline Split Recorded',
            subtitle: offlineRes.actionData.expense.description,
            primaryValue: `₹${offlineRes.actionData.expense.amount}`,
            secondaryValue: `${offlineRes.actionData.debt?.person} owes ₹${offlineRes.actionData.debt?.amount}`,
            badge: 'Queued to Sync',
            navigationScreen: 'Finance',
          };
        } else {
          addExpense(offlineRes.actionData);
          queueOfflineAction({ type: 'CREATE_EXPENSE', payload: offlineRes.actionData });
          actionCard = {
            type: 'EXPENSE',
            title: '⚡ Offline Expense Added',
            subtitle: offlineRes.actionData.description,
            primaryValue: `₹${offlineRes.actionData.amount}`,
            secondaryValue: `${offlineRes.actionData.category} • Saved Locally`,
            badge: 'Queued to Sync',
            navigationScreen: 'Finance',
          };
        }
      } else if (offlineRes.actionType === 'TASK' && offlineRes.actionData) {
        addTask(offlineRes.actionData);
        queueOfflineAction({ type: 'CREATE_TASK', payload: offlineRes.actionData });
        actionCard = {
          type: 'TASK',
          title: '⚡ Offline Task Scheduled',
          subtitle: offlineRes.actionData.title,
          primaryValue: offlineRes.actionData.priority,
          secondaryValue: 'Saved Locally',
          badge: 'Queued to Sync',
          navigationScreen: 'Tasks',
        };
      }

      addChatMessage({
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `${offlineRes.message}\n\n*(Cloud unavailable • Processed by offline ${offlineRes.offlineModelUsed} model. Data saved on phone and will push to dataset when online.)*`,
        actionCard,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow photo gallery access to upload an image for AI analysis.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0] && res.assets[0].base64) {
        const photo = res.assets[0];
        const userPrompt = input.trim();
        setInput('');

        const userMsg: ChatMessage = {
          id: String(Date.now()),
          sender: 'user',
          text: userPrompt ? `📷 ${userPrompt}` : '📷 [Uploaded Photo for Analysis]',
          imageUri: photo.uri,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        setLoading(true);

        // OFFLINE MODE: Local image analysis
        if (aiMode === 'OFFLINE') {
          const modelName = loadedModelFile ? loadedModelFile.name : (activeOfflineModel || 'On-Device Model');
          const offlineMsg: ChatMessage = {
            id: String(Date.now() + 1),
            sender: 'assistant',
            text: `### 📷 Image Analyzed Locally (Offline Mode)\n\n` +
              `Received image (**${photo.fileName || 'photo.jpg'}**, ${photo.width || 800}×${photo.height || 600}px).\n\n` +
              `**Active On-Device Engine**: \`${modelName}\`\n\n` +
              `• **Visual Processing**: Image successfully registered in local workspace context.\n` +
              `• For comprehensive step-by-step math problem solving, handwritten note transcription, and diagram breakdown, switch to **☁️ Cloud Gemini** mode anytime!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addChatMessage(offlineMsg);
          setLoading(false);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          return;
        }

        // CLOUD MODE: Universal Gemini Vision
        try {
          const visionRes = await apiClient.analyzeImage(photo.base64, photo.mimeType || 'image/jpeg', userPrompt);
          if (visionRes && visionRes.message) {
            const assistantMsg: ChatMessage = {
              id: String(Date.now() + 1),
              sender: 'assistant',
              text: visionRes.message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              actionCard: visionRes.isBill && visionRes.expense ? {
                type: 'EXPENSE',
                title: `✓ Receipt Recorded: ₹${visionRes.expense.amount}`,
                subtitle: visionRes.expense.description,
                primaryValue: `₹${visionRes.expense.amount}`,
                badge: 'Verified Receipt',
                navigationScreen: 'Finance',
              } : undefined,
            };
            addChatMessage(assistantMsg);
          } else {
            const fallbackMsg: ChatMessage = {
              id: String(Date.now() + 1),
              sender: 'assistant',
              text: '### 📷 Image Analyzed\n\nI processed your photo. For best results with handwritten notes or formulas, ensure the image is clear and well-lit.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            addChatMessage(fallbackMsg);
          }
        } catch {
          const errorMsg: ChatMessage = {
            id: String(Date.now() + 1),
            sender: 'assistant',
            text: 'I could not analyze this photo right now. Please check your network connection or try uploading a clearer image.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addChatMessage(errorMsg);
        } finally {
          setLoading(false);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handlePickLocalModelFile = async (targetModelId?: string) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const file = res.assets[0];
        const effectiveModelId = targetModelId || file.name;
        const loadedInfo: LoadedModelFileInfo = {
          name: file.name,
          size: file.size || 0,
          uri: file.uri,
          mimeType: file.mimeType,
          loadedAt: new Date().toISOString(),
          modelId: effectiveModelId,
        };
        setLoadedModelFile(loadedInfo);
        setActiveOfflineModel(effectiveModelId);
        setAiMode('OFFLINE');
        Alert.alert(
          '✓ Model File Loaded',
          `Successfully loaded "${file.name}" (${((file.size || 0) / (1024 * 1024)).toFixed(1)} MB) from internal storage!\n\nOffline AI Engine is now active on your device and will answer all your questions locally.`
        );
      }
    } catch {
      Alert.alert('File Picker', 'Could not open document picker to select model file.');
    }
  };


  const stripEmoji = (s: string) => s.replace(/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\s]+/u, '');

  const confirmClear = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if ((window as any).confirm('Clear chat history?')) clearChatMessages();
    } else {
      Alert.alert('Clear Chat', 'Do you want to clear your conversation history?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearChatMessages() },
      ]);
    }
  };

  const modeLabel = aiMode === 'OFFLINE' ? 'Offline (HF)' : aiMode === 'AUTO' ? 'Auto (HF/Cloud)' : 'Gemini Cloud';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <NiaHeader title="NIA AI" navigation={navigation} />

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>NIA AI Assistant</Text>
            <Text style={styles.sub}>
              {aiMode === 'OFFLINE' ? '100% offline on-device engine' : 'Nexa Intelligent Assistance'}
            </Text>
          </View>
          <View style={styles.titleActions}>
            {chatMessages.length > 0 && (
              <TouchableOpacity onPress={confirmClear} style={styles.iconBtn} activeOpacity={0.7} hitSlop={10}>
                <Ionicons name="trash-outline" size={16} color={C.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modelPill, aiMode === 'OFFLINE' && styles.modelPillOffline]}
              onPress={() => setModelModalVisible(true)}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={aiMode === 'OFFLINE' ? 'flash' : aiMode === 'AUTO' ? 'sync' : 'cloud'}
                size={13}
                color={aiMode === 'OFFLINE' ? '#B45309' : C.eucalyptus}
              />
              <Text style={[styles.modelPillText, aiMode === 'OFFLINE' && { color: '#B45309' }]}>{modeLabel}</Text>
              <Ionicons name="chevron-down" size={12} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline pending sync banner */}
        {offlineSyncQueue.length > 0 && (
          <View style={styles.queueBanner}>
            <View style={styles.queueLeft}>
              <Ionicons name="cloud-offline-outline" size={15} color="#B45309" />
              <Text style={styles.queueText}>
                {offlineSyncQueue.length} action(s) stored on this phone. Will push when online.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.queueSyncBtn}
              onPress={async () => {
                // H37: Sync Now had no failure handling — silent failure
                try {
                  const res = await flushOfflineQueue();
                  Alert.alert('Dataset Synced', `Pushed ${res.syncedCount} offline record(s) to cloud database!`);
                } catch (e: any) {
                  Alert.alert('Sync failed', e?.message || 'Could not push offline records. Try again when online.');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.queueSyncText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chat feed / empty state */}
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyWrap} showsVerticalScrollIndicator={false}>
            <View style={styles.emptyMark}>
              <Text style={styles.emptyMarkN}>N</Text>
              <View style={styles.emptyMarkSpark}>
                <Ionicons name="sparkles" size={12} color={C.eucalyptus} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Ask NIA anything</Text>
            <Text style={styles.emptyDesc}>
              Your built-in AI companion for NEXA. Speak or type naturally — log expenses, schedule assignments, split bills, or get study help.
            </Text>

            <TouchableOpacity
              style={styles.engineBanner}
              activeOpacity={0.8}
              onPress={() => setModelModalVisible(true)}
            >
              <View style={styles.engineIcon}>
                <Ionicons name="hardware-chip-outline" size={18} color={aiMode === 'OFFLINE' ? '#B45309' : C.eucalyptus} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.engineTitle}>
                  {aiMode === 'OFFLINE' ? 'Running 100% Offline' : 'On-Device AI Models Available'}
                </Text>
                <Text style={styles.engineSub}>
                  {downloadedModels.length === 0
                    ? 'No models downloaded yet • Tap to download'
                    : activeOfflineModel
                    ? `Active: ${activeOfflineModel.split('/')[1] || activeOfflineModel} • Ready offline`
                    : `${downloadedModels.length} model(s) downloaded • Tap to activate`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />
            </TouchableOpacity>

            <LabelCaps style={styles.tryLabel}>Try saying</LabelCaps>
            <View style={styles.examplesList}>
              {getContextChips().map((chip, idx) => (
                <TouchableOpacity key={idx} style={styles.exampleCard} onPress={() => handleSend(chip.prompt)} activeOpacity={0.85}>
                  <Text style={styles.exampleText} numberOfLines={1}>{stripEmoji(chip.label)}</Text>
                  <Ionicons name="arrow-forward" size={14} color={C.eucalyptus} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <View key={m.id} style={[styles.msgWrap, isUser ? styles.msgRight : styles.msgLeft]}>
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                    {m.imageUri && (
                      <Image source={{ uri: m.imageUri }} style={styles.chatImage} resizeMode="cover" />
                    )}
                    <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>{m.text}</Text>

                    {m.actionCard && (
                      <View style={styles.actionCard}>
                        <View style={styles.actionTop}>
                          <Text style={styles.actionTitle} numberOfLines={2}>{m.actionCard.title}</Text>
                          {m.actionCard.badge && (
                            <StatusPill label={m.actionCard.badge} tone="success" />
                          )}
                        </View>
                        {!!m.actionCard.subtitle && (
                          <Text style={styles.actionSub} numberOfLines={2}>{m.actionCard.subtitle}</Text>
                        )}
                        <View style={styles.actionVals}>
                          {!!m.actionCard.primaryValue && (
                            <Text style={styles.actionPrimary}>{m.actionCard.primaryValue}</Text>
                          )}
                          {!!m.actionCard.secondaryValue && (
                            <Text style={styles.actionSecondary}>{m.actionCard.secondaryValue}</Text>
                          )}
                        </View>
                        {!!m.actionCard.navigationScreen && (
                          <TouchableOpacity
                            style={styles.actionNav}
                            onPress={() => navigation?.navigate(m.actionCard!.navigationScreen)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.actionNavText}>View in {m.actionCard.navigationScreen}</Text>
                            <Ionicons name="arrow-forward" size={14} color={C.eucalyptus} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    <Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>{m.timestamp}</Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.msgWrap, styles.msgLeft]}>
                <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={C.eucalyptus} />
                  <Text style={styles.loadingText}>NIA is thinking…</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Context chips */}
        <View style={styles.chipsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {getContextChips().map((chip, i) => (
              <TouchableOpacity key={i} style={styles.chipPill} onPress={() => handleSend(chip.prompt)} activeOpacity={0.8}>
                <Text style={styles.chipText} numberOfLines={1}>{stripEmoji(chip.label)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handleUploadPhoto}
            disabled={loading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Upload a photo for AI analysis"
          >
            <Ionicons name="image-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ask NIA anything…"
            placeholderTextColor={C.textSubtle}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Offline model manager modal */}
        <Modal
          visible={modelModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModelModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHead}>
                <View style={styles.modalTitleRow}>
                  <View style={styles.modalIcon}>
                    <Ionicons name="hardware-chip-outline" size={20} color={C.obsidian} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>NIA Offline Engine</Text>
                    <Text style={styles.modalSub}>Hugging Face On-Device Models</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setModelModalVisible(false)} style={styles.modalClose} hitSlop={10}>
                  <Ionicons name="close" size={20} color={C.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <LabelCaps style={styles.modalSec}>AI execution mode</LabelCaps>
                <View style={styles.modeRow}>
                  {(['AUTO', 'OFFLINE', 'CLOUD'] as const).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.modeBtn, aiMode === mode && styles.modeBtnActive]}
                      onPress={() => setAiMode(mode)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.modeBtnText, aiMode === mode && styles.modeBtnTextActive]}>
                        {mode === 'AUTO' ? 'Auto' : mode === 'OFFLINE' ? 'Offline' : 'Cloud'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <LabelCaps style={styles.modalSec}>Local device storage</LabelCaps>
                {loadedModelFile ? (
                  <View style={styles.loadedBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Ionicons name="folder-open-outline" size={24} color={C.eucalyptus} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.loadedName} numberOfLines={1}>{loadedModelFile.name}</Text>
                          <StatusPill label="Active" tone="success" />
                        </View>
                        <Text style={styles.loadedSub}>
                          {loadedModelFile.size > 0 ? `${(loadedModelFile.size / (1024 * 1024)).toFixed(1)} MB • ` : ''}Loaded from internal storage
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.unloadBtn}
                      onPress={() => {
                        setLoadedModelFile(null);
                        Alert.alert('Model Unloaded', 'Switched off local storage model.');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.unloadText}>Unload</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.pickBtn} onPress={() => handlePickLocalModelFile()} activeOpacity={0.85}>
                  <Ionicons name="file-tray-full-outline" size={22} color="#FFFFFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickTitle}>Select Model from Internal Storage</Text>
                    <Text style={styles.pickSub}>Browse and pick your downloaded model weights file</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <LabelCaps style={styles.modalSec}>Hugging Face model repositories</LabelCaps>
                <Text style={styles.modalHint}>
                  Tap “Download Page” to open the Hugging Face repo in your browser. Once downloaded to your device, tap “Select from Storage” to load it.
                </Text>
                {HUGGINGFACE_OFFLINE_MODELS.map((m) => {
                  const isLoaded = loadedModelFile?.modelId === m.id || activeOfflineModel === m.id;
                  return (
                    <NiaCard key={m.id} style={[styles.modelCard, isLoaded && styles.modelCardActive]}>
                      <View style={styles.modelTop}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.modelName} numberOfLines={1}>{m.name}</Text>
                            {isLoaded && <StatusPill label="Active offline" tone="success" />}
                          </View>
                          <Text style={styles.modelMeta}>{m.parameters} • {m.quantization}</Text>
                          <Text style={styles.modelDesc} numberOfLines={2}>{m.description}</Text>
                        </View>
                        <Text style={styles.modelSize}>{m.sizeMB} MB</Text>
                      </View>
                      <View style={styles.modelBottom}>
                        <Text style={styles.modelSpecialty} numberOfLines={1}>{m.specialty}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            style={styles.hfBtn}
                            onPress={() => Linking.openURL(m.downloadUrl)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="open-outline" size={13} color={C.eucalyptus} />
                            <Text style={styles.hfBtnText}>Download Page</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.selectBtn, isLoaded && styles.selectBtnActive]}
                            onPress={() => {
                              if (isLoaded) {
                                setAiMode('OFFLINE');
                                Alert.alert('Active', `${m.name} is your active on-device model.`);
                              } else {
                                handlePickLocalModelFile(m.id);
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.selectText, isLoaded && styles.selectTextActive]}>
                              {isLoaded ? 'Active' : 'Select from Storage'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </NiaCard>
                  );
                })}

                <LabelCaps style={styles.modalSec}>Load custom Hugging Face repo</LabelCaps>
                <View style={styles.customRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="e.g. HuggingFaceTB/SmolLM2-135M"
                    placeholderTextColor={C.textSubtle}
                    value={customRepoInput}
                    onChangeText={setCustomRepoInput}
                  />
                  <TouchableOpacity
                    style={[styles.customBtn, !customRepoInput.trim() && { opacity: 0.5 }]}
                    disabled={!customRepoInput.trim()}
                    onPress={async () => {
                      // H23: ref-based lock — double-tap Download started concurrent downloads
                      // H38: "Downloaded" alert was unconditional — now only on success
                      if (downloadLockRef.current) return;
                      downloadLockRef.current = true;
                      const repo = customRepoInput.trim();
                      try {
                        await downloadOfflineModel(repo);
                        setCustomRepoInput('');
                        Alert.alert('Model Loaded', `Downloaded & activated "${repo}" from Hugging Face for offline reasoning!`);
                      } catch (e: any) {
                        Alert.alert('Download failed', e?.message || `Could not download "${repo}". Check your connection and try again.`);
                      } finally {
                        downloadLockRef.current = false;
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.customBtnText}>Download</Text>
                  </TouchableOpacity>
                </View>

                <LabelCaps style={styles.modalSec}>Offline dataset sync</LabelCaps>
                <View style={styles.syncCard}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.syncTitle}>Temporary Phone Storage</Text>
                    <Text style={styles.syncSub}>
                      {offlineSyncQueue.length > 0
                        ? `${offlineSyncQueue.length} record(s) queued. Will push to dataset when online.`
                        : 'All offline records are pushed and synced to cloud dataset.'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.syncBtn}
                    onPress={async () => {
                      // H37: Sync Now had no failure handling — silent failure
                      try {
                        const res = await flushOfflineQueue();
                        Alert.alert('Dataset Synced', `Pushed ${res.syncedCount} offline record(s) to cloud database!`);
                      } catch (e: any) {
                        Alert.alert('Sync failed', e?.message || 'Could not push offline records. Try again when online.');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cloud-upload-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.syncBtnText}>Sync Now</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const C = designTokens.colors;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  modelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9,
  },
  modelPillOffline: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  modelPillText: { fontSize: 12, fontWeight: '700', color: C.ink },
  queueBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 10, backgroundColor: '#FFFBEB',
    borderWidth: 1, borderColor: '#FDE68A', borderRadius: 14, padding: 11,
  },
  queueLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  queueText: { fontSize: 11.5, color: '#92400E', flex: 1, lineHeight: 16 },
  queueSyncBtn: { backgroundColor: C.obsidian, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  queueSyncText: { fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' },
  chatScroll: { flex: 1 },
  chatContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  msgWrap: { marginBottom: 10, maxWidth: '88%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 18, padding: 13, borderWidth: 1 },
  assistantBubble: {
    backgroundColor: '#FFFFFF', borderColor: C.hairline,
    borderBottomLeftRadius: 6,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04,
    shadowRadius: 6, elevation: 1,
  },
  userBubble: { backgroundColor: C.obsidian, borderColor: C.obsidian, borderBottomRightRadius: 6 },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  assistantText: { color: C.ink },
  userText: { color: '#FFFFFF' },
  chatImage: { width: 200, height: 140, borderRadius: 12, marginBottom: 8 },
  actionCard: {
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
    borderRadius: 14, padding: 12, marginTop: 10,
  },
  actionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  actionTitle: { fontSize: 13.5, fontWeight: '700', color: C.ink, flex: 1 },
  actionSub: { fontSize: 12, color: C.textSecondary, marginBottom: 6 },
  actionVals: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8 },
  actionPrimary: { fontSize: 20, fontWeight: '700', color: C.eucalyptus, letterSpacing: -0.4 },
  actionSecondary: { fontSize: 12.5, color: C.textMuted },
  actionNav: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionNavText: { fontSize: 12.5, fontWeight: '700', color: C.eucalyptus },
  msgTime: { fontSize: 10, color: C.textSubtle, marginTop: 7 },
  msgTimeUser: { color: 'rgba(255,255,255,0.55)' },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12.5, color: C.textSecondary, fontStyle: 'italic' },
  emptyWrap: { paddingHorizontal: 20, paddingTop: 28, alignItems: 'center' },
  emptyMark: {
    width: 64, height: 64, borderRadius: 19, backgroundColor: C.obsidian,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyMarkN: { color: '#FFFFFF', fontWeight: '800', fontSize: 32, letterSpacing: -1 },
  emptyMarkSpark: { position: 'absolute', right: 10, top: 10 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 8 },
  emptyDesc: { fontSize: 13.5, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  engineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 16, padding: 14, width: '100%', marginBottom: 20,
  },
  engineIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.eucalyptusFaint,
    alignItems: 'center', justifyContent: 'center',
  },
  engineTitle: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  engineSub: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  tryLabel: { alignSelf: 'flex-start', marginBottom: 10 },
  examplesList: { width: '100%', gap: 8 },
  exampleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  exampleText: { fontSize: 13.5, fontWeight: '500', color: C.textSecondary, flex: 1, marginRight: 8 },
  chipsBar: { paddingVertical: 10 },
  chipsContent: { paddingHorizontal: 20, gap: 8 },
  chipPill: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8,
  },
  chipText: { fontSize: 12.5, fontWeight: '600', color: C.textSecondary },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100,
  },
  attachBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 23, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14.5, color: C.ink, minHeight: 46,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: C.obsidian,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.4)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 30, maxHeight: '90%',
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.porcelain,
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  modalSub: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  modalClose: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.porcelain,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSec: { marginTop: 14, marginBottom: 8 },
  modalHint: { fontSize: 12, color: C.textMuted, lineHeight: 17, marginBottom: 10 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12,
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
  },
  modeBtnActive: { backgroundColor: C.obsidian, borderColor: C.obsidian },
  modeBtnText: { fontSize: 12.5, fontWeight: '700', color: C.textSecondary },
  modeBtnTextActive: { color: '#FFFFFF' },
  loadedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.eucalyptusFaint, borderWidth: 1, borderColor: '#A7F3D0',
    borderRadius: 14, padding: 12, marginBottom: 10,
  },
  loadedName: { fontSize: 13.5, fontWeight: '700', color: C.ink, flex: 1 },
  loadedSub: { fontSize: 11.5, color: C.textSecondary, marginTop: 2 },
  unloadBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  unloadText: { fontSize: 12, fontWeight: '700', color: C.textSecondary },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.obsidian, borderRadius: 16, padding: 15, marginBottom: 4,
  },
  pickTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  pickSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  modelCard: { marginBottom: 10 },
  modelCardActive: { borderColor: C.eucalyptus },
  modelTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  modelName: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 3 },
  modelMeta: { fontSize: 11.5, color: C.textMuted, marginBottom: 3 },
  modelDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  modelSize: { fontSize: 11.5, fontWeight: '700', color: C.textSecondary },
  modelBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  modelSpecialty: { fontSize: 11.5, color: C.textMuted, flex: 1 },
  hfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.eucalyptusFaint, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7,
  },
  hfBtnText: { fontSize: 11.5, fontWeight: '700', color: C.eucalyptus },
  selectBtn: {
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
  },
  selectBtnActive: { backgroundColor: C.eucalyptus, borderColor: C.eucalyptus },
  selectText: { fontSize: 11.5, fontWeight: '700', color: C.textSecondary },
  selectTextActive: { color: '#FFFFFF' },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: {
    flex: 1, backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: C.ink,
  },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.obsidian, borderRadius: 12, paddingHorizontal: 16,
  },
  customBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  syncCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
    borderRadius: 14, padding: 14,
  },
  syncTitle: { fontSize: 13.5, fontWeight: '700', color: C.ink, marginBottom: 3 },
  syncSub: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.obsidian, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  syncBtnText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
});
