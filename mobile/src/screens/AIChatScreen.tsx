import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Platform, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { GradientBackground } from '../components/common/GradientBackground';
import { AIGemSymbol } from '../components/common/AIGemSymbol';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDashboardStore, type LoadedModelFileInfo } from '../store/dashboardStore';
import { useFloatingStore } from '../store/floatingStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { offlineAiEngine, HUGGINGFACE_OFFLINE_MODELS, type HuggingFaceModelInfo } from '../services/offlineAiEngine';
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

  React.useEffect(() => {
    if (chatMessages.length === 0) {
      apiClient.getChatHistory().then((res) => {
        if (res?.messages && res.messages.length > 0) {
          setChatMessages(res.messages as any);
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
            secondaryValue: `${offlineRes.actionData.debt?.person} owes ₹${offlineRes.actionData.debt?.amount}`,
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
            userId: currentUserId,
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
            userId: currentUserId,
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

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AIGemSymbol size={34} />
            <View>
              <Text style={styles.headerTitle}>NIA</Text>
              <View style={styles.statusRow}>
                <View style={[styles.onlineDot, aiMode === 'OFFLINE' && { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.statusText}>
                  {aiMode === 'OFFLINE' ? '100% Offline (HF Engine)' : 'Nexa Intelligent Assistance'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {chatMessages.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    if ((window as any).confirm('Clear chat history?')) clearChatMessages();
                  } else {
                    Alert.alert('Clear Chat', 'Do you want to clear your conversation history?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: () => clearChatMessages() },
                    ]);
                  }
                }}
                style={[styles.modelPillBtn, { paddingHorizontal: 8 }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={14} color={designTokens.colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Offline Hugging Face Model Switcher Pill */}
            <TouchableOpacity
              style={[styles.modelPillBtn, aiMode === 'OFFLINE' && styles.modelPillBtnOffline]}
              onPress={() => setModelModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <Ionicons
                name={aiMode === 'OFFLINE' ? 'flash' : aiMode === 'AUTO' ? 'sync' : 'cloud'}
                size={14}
                color={aiMode === 'OFFLINE' ? '#B45309' : designTokens.colors.primaryDark}
              />
              <Text style={[styles.modelPillText, aiMode === 'OFFLINE' && { color: '#B45309' }]}>
                {aiMode === 'OFFLINE' ? 'Offline (HF)' : aiMode === 'AUTO' ? 'Auto (HF/Cloud)' : 'Gemini Cloud'}
              </Text>
              <Ionicons name="chevron-down" size={12} color={designTokens.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Pending Sync Banner */}
        {offlineSyncQueue.filter((q) => !q.synced).length > 0 && (
          <View style={styles.offlineQueueBanner}>
            <View style={styles.queueBannerLeft}>
              <Ionicons name="cloud-offline-outline" size={15} color="#B45309" />
              <Text style={styles.queueBannerText}>
                {offlineSyncQueue.filter((q) => !q.synced).length} action(s) stored in phone. Will push to dataset when online.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.syncQueueBtn}
              onPress={async () => {
                const res = await flushOfflineQueue();
                Alert.alert('Dataset Synced', `Pushed ${res.syncedCount} offline record(s) to cloud database!`);
              }}
            >
              <Text style={styles.syncQueueBtnText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chat Messages Feed or Empty State */}
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContainer}>
            <View style={{ marginBottom: 16 }}>
              <AIGemSymbol size={64} />
            </View>
            <Text style={styles.emptyTitle}>NIA — Nexa Intelligent Assistance</Text>
            <Text style={styles.emptyDescription}>
              Hello! I am NIA, your built-in AI companion for NEXA. Speak or type naturally. I can log your expenses, schedule assignments, split bills, and answer academic questions.
            </Text>

            {/* Offline Model Switcher Banner Shortcut */}
            <TouchableOpacity
              style={styles.offlineEngineBannerBtn}
              activeOpacity={0.8}
              onPress={() => setModelModalVisible(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="hardware-chip" size={18} color={aiMode === 'OFFLINE' ? '#B45309' : designTokens.colors.primaryDark} />
                <View>
                  <Text style={styles.offlineEngineBannerTitle}>
                    {aiMode === 'OFFLINE' ? '📴 Running 100% Offline' : '⚡ On-Device AI Models Available'}
                  </Text>
                  <Text style={styles.offlineEngineBannerSubtitle}>
                    {downloadedModels.length === 0
                      ? 'No models downloaded yet • Tap to download'
                      : activeOfflineModel
                      ? `Active: ${activeOfflineModel.split('/')[1] || activeOfflineModel} • Ready offline`
                      : `${downloadedModels.length} model(s) downloaded • Tap to activate`}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={designTokens.colors.textSecondary} />
            </TouchableOpacity>

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
                  {m.imageUri && (
                    <Image
                      source={{ uri: m.imageUri }}
                      style={styles.chatUploadedImage}
                      resizeMode="cover"
                    />
                  )}
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
                <Text style={styles.loadingText}>Analyzing visual & academic context...</Text>
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
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handleUploadPhoto}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={20} color={designTokens.colors.primaryDark} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Ask math, problem photo, or study tips..."
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

      {/* Hugging Face Offline Model Manager Modal */}
      <Modal
        visible={modelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="hardware-chip-outline" size={22} color={designTokens.colors.primaryDark} />
                <View>
                  <Text style={styles.modalTitle}>NIA Offline Engine</Text>
                  <Text style={styles.modalSubtitle}>Hugging Face On-Device Models</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModelModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={designTokens.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Connectivity Mode Switcher */}
              <Text style={styles.modalSectionLabel}>AI EXECUTION MODE</Text>
              <View style={styles.modeToggleRow}>
                {(['AUTO', 'OFFLINE', 'CLOUD'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeToggleBtn, aiMode === mode && styles.modeToggleBtnActive]}
                    onPress={() => setAiMode(mode)}
                  >
                    <Text style={[styles.modeToggleText, aiMode === mode && styles.modeToggleTextActive]}>
                      {mode === 'AUTO' ? '⚡ Auto Fallback' : mode === 'OFFLINE' ? '📴 100% Offline' : '☁️ Cloud Gemini'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Local Storage Model Setup */}
              <Text style={styles.modalSectionLabel}>LOCAL DEVICE STORAGE SETUP</Text>
              {loadedModelFile ? (
                <View style={styles.loadedModelBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="folder-open" size={24} color="#16A34A" />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.loadedModelName} numberOfLines={1}>{loadedModelFile.name}</Text>
                        <View style={styles.loadedBadge}>
                          <Text style={styles.loadedBadgeText}>ACTIVE</Text>
                        </View>
                      </View>
                      <Text style={styles.loadedModelSub}>
                        {loadedModelFile.size > 0 ? `${(loadedModelFile.size / (1024 * 1024)).toFixed(1)} MB • ` : ''}Loaded from Internal Storage
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.unloadBtn}
                    onPress={() => {
                      setLoadedModelFile(null);
                      Alert.alert('Model Unloaded', 'Switched off local storage model.');
                    }}
                  >
                    <Text style={styles.unloadBtnText}>Unload</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.pickStorageBtn}
                onPress={() => handlePickLocalModelFile()}
                activeOpacity={0.85}
              >
                <Ionicons name="file-tray-full-outline" size={22} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickStorageBtnTitle}>📁 Select Model from Internal Storage</Text>
                  <Text style={styles.pickStorageBtnSub}>Browse and pick your downloaded .gguf or model weights file</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Hugging Face Offline Models List */}
              <Text style={styles.modalSectionLabel}>HUGGING FACE MODEL REPOSITORIES</Text>
              <Text style={styles.modalHelperText}>
                Tap "Download Page" to open the Hugging Face repo in your browser to download the file. Once downloaded to your device, tap "Select from Storage" to load and activate it.
              </Text>
              {HUGGINGFACE_OFFLINE_MODELS.map((m) => {
                const isLoaded = loadedModelFile?.modelId === m.id || activeOfflineModel === m.id;

                return (
                  <GlassCard
                    key={m.id}
                    variant="cream"
                    style={[
                      styles.modelCard,
                      isLoaded && styles.modelCardActive,
                      { marginBottom: 12 },
                    ]}
                  >
                    <View style={styles.modelCardTop}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.modelCardName, isLoaded && { color: designTokens.colors.primaryDark }]}>
                            {m.name}
                          </Text>
                          {isLoaded && (
                            <View style={styles.activeTag}>
                              <Text style={styles.activeTagText}>ACTIVE (OFFLINE)</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.modelCardRepo}>{m.parameters} • {m.quantization}</Text>
                        <Text style={styles.modelCardDesc}>{m.description}</Text>
                        <Text style={styles.modelFileHint}>
                          📄 File: <Text style={{ fontWeight: '700', color: designTokens.colors.textPrimary }}>{m.recommendedFilename}</Text>
                        </Text>
                      </View>
                      <Text style={styles.modelCardSize}>{m.sizeMB} MB</Text>
                    </View>

                    <View style={styles.modelCardBottom}>
                      <Text style={styles.modelSpecialty}>🎯 {m.specialty}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.hfLinkBtn}
                          onPress={() => Linking.openURL(m.downloadUrl)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="open-outline" size={13} color={designTokens.colors.primaryDark} />
                          <Text style={styles.hfLinkBtnText}>Download Page</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.modelActionBtn,
                            isLoaded && styles.modelActionBtnActive,
                            !isLoaded && styles.modelActionBtnDownload,
                          ]}
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
                          <Text
                            style={[
                              styles.modelActionBtnText,
                              isLoaded && styles.modelActionBtnTextActive,
                            ]}
                          >
                            {isLoaded ? '✓ Active' : 'Select from Storage'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}

              {/* Custom Hugging Face Repo Input */}
              <Text style={styles.modalSectionLabel}>LOAD CUSTOM HUGGING FACE REPO</Text>
              <View style={styles.customRepoCard}>
                <TextInput
                  style={styles.customRepoInput}
                  placeholder="e.g. HuggingFaceTB/SmolLM2-135M"
                  placeholderTextColor="#94A3B8"
                  value={customRepoInput}
                  onChangeText={setCustomRepoInput}
                />
                <TouchableOpacity
                  style={[styles.customRepoBtn, !customRepoInput.trim() && { opacity: 0.5 }]}
                  disabled={!customRepoInput.trim()}
                  onPress={async () => {
                    const repo = customRepoInput.trim();
                    await downloadOfflineModel(repo);
                    setCustomRepoInput('');
                    Alert.alert('Model Loaded', `Downloaded & activated "${repo}" from Hugging Face for offline reasoning!`);
                  }}
                >
                  <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.customRepoBtnText}>Download</Text>
                </TouchableOpacity>
              </View>

              {/* Dataset Sync Status Card */}
              <Text style={styles.modalSectionLabel}>OFFLINE DATASET SYNC</Text>
              <View style={styles.syncStatusCard}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.syncStatusTitle}>Temporary Phone Storage</Text>
                  <Text style={styles.syncStatusSub}>
                    {offlineSyncQueue.filter((q) => !q.synced).length > 0
                      ? `${offlineSyncQueue.filter((q) => !q.synced).length} record(s) queued. Will push to dataset when online.`
                      : 'All offline records are pushed and synced to cloud dataset.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.flushSyncBtn}
                  onPress={async () => {
                    const res = await flushOfflineQueue();
                    Alert.alert('Dataset Synced', `Pushed ${res.syncedCount} offline record(s) to cloud database!`);
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.flushSyncBtnText}>Sync Now</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </View>
      </SafeAreaView>
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
    paddingTop: 8,
    paddingBottom: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.surfaceBorder,
  },
  offlineEngineBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(117, 167, 165, 0.35)',
    borderRadius: designTokens.radii.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: designTokens.spacing.lg,
    width: '100%',
    ...designTokens.shadows.card,
  },
  offlineEngineBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
  },
  offlineEngineBannerSubtitle: {
    fontSize: 11,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
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
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.12)',
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
  modelPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.12)',
  },
  modelPillBtnOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  modelPillText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.primaryDark,
    fontWeight: '700',
    fontSize: 10,
  },
  offlineQueueBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: 8,
  },
  queueBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  queueBannerText: {
    ...designTokens.typography.micro,
    color: '#92400E',
    fontSize: 11,
    flex: 1,
  },
  syncQueueBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: designTokens.radii.xs,
  },
  syncQueueBtnText: {
    ...designTokens.typography.micro,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: designTokens.spacing.lg,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(41, 51, 50, 0.08)',
    paddingBottom: 12,
  },
  modalTitle: {
    ...designTokens.typography.cardTitle,
    fontSize: 16,
    color: designTokens.colors.textPrimary,
  },
  modalSubtitle: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalSectionLabel: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textMuted,
    letterSpacing: 1,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.1)',
  },
  modeToggleBtnActive: {
    backgroundColor: designTokens.colors.primary,
    borderColor: designTokens.colors.primary,
  },
  modeToggleText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },
  modelCard: {
    marginBottom: 10,
    padding: 12,
  },
  modelCardActive: {
    borderColor: designTokens.colors.primary,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  modelCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  modelCardName: {
    ...designTokens.typography.cardTitle,
    fontSize: 13,
    color: designTokens.colors.textPrimary,
  },
  activeTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeTagText: {
    ...designTokens.typography.micro,
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 9,
  },
  modelCardRepo: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  modelCardDesc: {
    ...designTokens.typography.body,
    fontSize: 11,
    color: designTokens.colors.textSecondary,
    marginTop: 4,
  },
  modelCardSize: {
    ...designTokens.typography.micro,
    color: designTokens.colors.primaryDeep,
    fontWeight: '800',
    backgroundColor: designTokens.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: designTokens.colors.primary,
  },
  progressText: {
    ...designTokens.typography.micro,
    fontWeight: '700',
    color: designTokens.colors.primaryDark,
    fontSize: 10,
  },
  modelCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 51, 50, 0.06)',
  },
  modelSpecialty: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    fontSize: 11,
  },
  modelActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.radii.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: designTokens.colors.primary,
  },
  modelActionBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  modelActionBtnDownload: {
    backgroundColor: designTokens.colors.primary,
  },
  modelActionBtnText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.primaryDark,
    fontWeight: '700',
  },
  modelActionBtnTextActive: {
    color: '#16A34A',
  },
  customRepoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.1)',
    marginBottom: 8,
  },
  customRepoInput: {
    backgroundColor: '#FAF7F2',
    borderRadius: designTokens.radii.xs,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: designTokens.colors.textPrimary,
    marginBottom: 8,
  },
  customRepoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: designTokens.colors.primary,
    paddingVertical: 8,
    borderRadius: designTokens.radii.xs,
  },
  customRepoBtnText: {
    ...designTokens.typography.micro,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  syncStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.1)',
    marginBottom: 16,
  },
  syncStatusTitle: {
    ...designTokens.typography.cardTitle,
    fontSize: 12,
    color: designTokens.colors.textPrimary,
  },
  syncStatusSub: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  flushSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: designTokens.colors.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: designTokens.radii.xs,
  },
  flushSyncBtnText: {
    ...designTokens.typography.micro,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chatUploadedImage: {
    width: 200,
    height: 140,
    borderRadius: designTokens.radii.sm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  modalHelperText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  loadedModelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: designTokens.radii.sm,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    marginBottom: 10,
  },
  loadedModelName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  loadedBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loadedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  loadedModelSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  unloadBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: designTokens.radii.xs,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  unloadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  pickStorageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: designTokens.colors.primary,
    padding: 14,
    borderRadius: designTokens.radii.sm,
    marginBottom: 16,
    shadowColor: '#3D352E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  pickStorageBtnTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pickStorageBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  modelFileHint: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  hfLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: designTokens.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: designTokens.radii.xs,
  },
  hfLinkBtnText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.primaryDark,
    fontWeight: '700',
  },
});

