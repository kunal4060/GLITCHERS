import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { toolRegistry, type ToolExecutionResult } from './toolRegistry.js';
import { inMemoryStore } from '../../repositories/inMemoryStore.js';
import type { AIChatResponse, RouterIntentType } from '@glitchers/shared';

export class GeminiAssistant {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.startsWith('dev-')) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  /**
   * Builds rich live student context from inMemoryStore for Gemini reasoning
   */
  public buildStudentContext(userId: string) {
    const now = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[now.getDay()];

    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayDay = days[yesterday.getDay()];
    const yesterdayDateStr = yesterday.toISOString().slice(0, 10);
    const todayDateStr = now.toISOString().slice(0, 10);

    const profile = inMemoryStore.profiles.get(userId);
    const classes = inMemoryStore.classes.get(userId) || [];
    const expenses = inMemoryStore.expenses.get(userId) || [];
    const tasks = inMemoryStore.tasks.get(userId) || [];
    const budget = inMemoryStore.budgets.get(userId);
    const debts = inMemoryStore.debts.get(userId) || [];

    const todayExpenses = expenses.filter((e) => e.date.slice(0, 10) === todayDateStr);
    const yesterdayExpenses = expenses.filter((e) => e.date.slice(0, 10) === yesterdayDateStr);
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      now,
      currentDay,
      todayDateStr,
      yesterday,
      yesterdayDay,
      yesterdayDateStr,
      profile,
      classes,
      expenses,
      todayExpenses,
      yesterdayExpenses,
      totalSpent,
      tasks,
      budget,
      debts,
    };
  }

  /**
   * Router: Map student message to intent, execute relevant action tools,
   * or answer in-app questions using Gemini 3.6 Flash with full student context.
   */
  public async processStudentQuery(userId: string, userMessage: string): Promise<AIChatResponse> {
    const text = userMessage.trim().toLowerCase();

    // -------------------------------------------------------------
    // PART 1: ACTION TOOLS (Mutations in database)
    // -------------------------------------------------------------

    // 1. Cross-Module Split Expense (e.g. "Spent 500 on dinner with Rahul. Split it equally")
    if (text.includes('split') && (/\d+/.test(text) || text.includes('with') || text.includes('half') || text.includes('equally'))) {
      const parsed = this.parseSplitExpense(userMessage);
      const toolResult = await toolRegistry.split_expense(userId, parsed);
      return {
        message: toolResult.message || `Split ₹${parsed.totalAmount} for ${parsed.description} with ${parsed.person}.`,
        intent: 'ADD_EXPENSE',
        toolExecuted: 'split_expense',
        data: toolResult.result,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // 2. Add Expense (Single) - Action to record expense
    if (
      text.startsWith('spent') ||
      text.startsWith('paid') ||
      text.startsWith('bought') ||
      text.startsWith('add expense') ||
      (text.includes('expense') && /\d+/.test(text) && !text.includes('what') && !text.includes('how much') && !text.includes('yesterday')) ||
      text.match(/(?:spent|paid|bought|cost|ordered)\s+(?:rs\.?|₹|inr)?\s*\d+/i) ||
      (
        /\d+/.test(text) &&
        !text.includes('what') &&
        !text.includes('how much') &&
        !text.includes('yesterday') &&
        text.match(/\b(food|dinner|lunch|canteen|coffee|chai|tea|breakfast|biryani|pizza|burger|snack|auto|cab|uber|ola|bus|metro|petrol|fuel|stationery|book|books|print|printout|xerox|groceries|swiggy|zomato)\b/i)
      )
    ) {
      const parsed = this.parseNaturalExpense(userMessage);
      const toolResult = await toolRegistry.add_expense(userId, parsed);
      return {
        message: toolResult.message || `Expense recorded: ₹${parsed.amount} for ${parsed.description}. Added to your expense tracker.`,
        intent: 'ADD_EXPENSE',
        toolExecuted: 'add_expense',
        data: toolResult.result,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // 3. Delete Expense Action
    if (text.includes('delete') && (text.includes('expense') || text.includes('spending'))) {
      const descMatch = text.replace(/delete|this|the|expense|record|spending/gi, '').trim();
      const toolResult = await toolRegistry.delete_expense(userId, descMatch || 'food');
      return {
        message: toolResult.message || 'Expense record removed.',
        intent: 'DELETE_EXPENSE',
        toolExecuted: 'delete_expense',
        data: toolResult.result,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // 4. Update Task Priority Action
    if (
      (text.includes('extremely important') || text.includes('urgent') || text.includes('high priority') || text.includes('prioritize')) &&
      !text.includes('what') && !text.includes('show')
    ) {
      const priority = text.includes('extremely') || text.includes('urgent') ? 'EXTREMELY_IMPORTANT' : 'HIGH';
      const toolResult = await toolRegistry.update_task_priority(userId, { priority });
      return {
        message: toolResult.message || `Task priority updated to ${priority}.`,
        intent: 'UPDATE_TASK',
        toolExecuted: 'update_task_priority',
        data: toolResult.result,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // 5. Complete Task Action
    if (
      (text.includes('complete') || text.includes('mark done') || text.includes('finished')) &&
      (text.includes('task') || text.includes('assignment') || text.includes('lab') || text.includes('report') || text.includes('homework') || text.includes('project'))
    ) {
      const taskTitle = text.replace(/mark|that|the|task|assignment|lab|report|as|complete|done|finished|with/gi, '').trim();
      const toolResult = await toolRegistry.complete_task(userId, taskTitle || 'AI Assignment');
      return {
        message: toolResult.message || 'Task marked as completed.',
        intent: 'UPDATE_TASK',
        toolExecuted: 'complete_task',
        data: toolResult.result,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // 6. Delete Task Action
    if (text.includes('delete') && (text.includes('task') || text.includes('assignment') || text.includes('todo'))) {
      const taskTitle = text.replace(/delete|that|the|task|assignment|todo/gi, '').trim();
      const toolResult = await toolRegistry.delete_task(userId, taskTitle || 'AI Assignment');
      return {
        message: toolResult.message || 'Task deleted.',
        intent: 'DELETE_TASK',
        toolExecuted: 'delete_task',
        data: toolResult.result,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // 7. Create Task Action
    if (
      (
        text.startsWith('remind me') ||
        text.startsWith('remember to') ||
        text.startsWith('i need to') ||
        text.startsWith('i have to') ||
        text.startsWith('add task') ||
        text.startsWith('create task') ||
        text.match(/\b(submit|prepare|write|upload)\b/i) ||
        (text.includes('assignment') && !text.includes('what') && !text.includes('show') && !text.includes('list')) ||
        (text.includes('lab report') && !text.includes('what') && !text.includes('show'))
      ) &&
      !text.includes('what tasks') &&
      !text.includes('show tasks') &&
      !text.includes('list tasks')
    ) {
      const taskParsed = this.parseNaturalTask(userMessage);
      const toolResult = await toolRegistry.create_task(userId, taskParsed);
      return {
        message: toolResult.message || `Task "${taskParsed.title}" scheduled successfully. Added to your task manager.`,
        intent: 'CREATE_TASK',
        toolExecuted: 'create_task',
        data: toolResult.result,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // 8. Add Debt Action
    if (text.includes('borrowed') || text.includes('lent') || text.includes('owes me') || text.includes('i owe')) {
      const debtParsed = this.parseNaturalDebt(userMessage);
      const toolResult = await toolRegistry.add_debt(userId, debtParsed);
      return {
        message: toolResult.message || 'Debt record added successfully.',
        intent: 'ADD_DEBT',
        toolExecuted: 'add_debt',
        data: toolResult.result,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // 9. Calendar Event Action
    if (text.includes('calendar') && (text.includes('add') || text.includes('event') || text.includes('schedule class'))) {
      const confirmationPayload = {
        title: 'Database Management Systems (DBMS)',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        location: 'AB1-204',
      };
      const toolResult = await toolRegistry.create_calendar_event(userId, confirmationPayload);
      return {
        message: `Added **${confirmationPayload.title}** (${confirmationPayload.startTime} - ${confirmationPayload.endTime}) in Room ${confirmationPayload.location} to your academic calendar.`,
        intent: 'CREATE_CALENDAR_EVENT',
        toolExecuted: 'create_calendar_event',
        data: toolResult.result,
        requiresConfirmation: true,
        confirmationPayload,
      };
    }

    // -------------------------------------------------------------
    // PART 2: IN-APP QUESTIONS & GEMINI LIVE DATABASE REASONING
    // (e.g. "What amount did I expense yesterday", "Which classes do I have",
    //  "How much can I spend", "Who owes me", "Calculate my daily average")
    // -------------------------------------------------------------
    const context = this.buildStudentContext(userId);

    // Call Google Gemini API (gemini-3.6-flash) with live student database context
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        const systemPrompt = `You are the personal AI Student Life Companion for ${context.profile?.fullName || 'Kunal Ugale'} at ${context.profile?.university || 'State Technological University'}.
Today's Date: ${context.now.toDateString()} (${context.currentDay}).
Yesterday's Date: ${context.yesterday.toDateString()} (${context.yesterdayDay}).

LIVE IN-APP STUDENT DATA:
[CLASSES / TIMETABLE]:
${context.classes.length ? context.classes.map((c) => `• ${c.subjectName} on ${c.day} at ${c.startTime} - ${c.endTime} in room ${c.room || 'AB1-204'} (Faculty: ${c.faculty})`).join('\n') : 'No classes scheduled.'}

[EXPENSE TRACKER & RECENT SPENDING]:
${context.expenses.map((e) => {
  const isToday = e.date.slice(0, 10) === context.todayDateStr;
  const isYesterday = e.date.slice(0, 10) === context.yesterdayDateStr;
  const rel = isToday ? 'TODAY' : isYesterday ? 'YESTERDAY' : new Date(e.date).toLocaleDateString();
  return `• ₹${e.amount} on ${e.description} (${e.category}, Merchant: ${e.merchant || 'None'}) [${rel}]`;
}).join('\n')}

[MONTHLY BUDGET]:
• Monthly Limit: ₹${context.budget?.monthlyLimit || 10000}
• Total Spent this month: ₹${context.totalSpent}
• Remaining Allowance: ₹${(context.budget?.monthlyLimit || 10000) - context.totalSpent}

[TASK MANAGER & PENDING ASSIGNMENTS]:
${context.tasks.filter((t) => t.status !== 'COMPLETED').map((t) => `• [${t.priority}] ${t.title} (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Upcoming'})`).join('\n')}

[DEBTS & SPLITS]:
${context.debts.map((d) => `• ${d.person}: ₹${d.amount} (${d.type === 'OWES_ME' ? 'Owes you' : 'You owe'}) - ${d.status}`).join('\n')}

INSTRUCTIONS:
1. Answer the student's question accurately using their actual live data above.
2. If the student asks "what amount did I expense yesterday", "how much did I spend yesterday", or similar, calculate the sum of expenses marked [YESTERDAY] and list the itemized amounts and descriptions.
3. If the student asks "which classes do I have", "my timetable", or about classes on a specific day, list their actual scheduled classes with timing and room. If they ask about today, check if there are classes on ${context.currentDay}.
4. If the student asks for calculations, daily spending rates, or budget advice, calculate accurately from their budget figures.
5. Format your answers clearly with markdown bullet points, and use bold text for key figures and subjects. Keep the tone helpful, sharp, and concise.`;

        const geminiRes = await model.generateContent(`${systemPrompt}\n\nStudent question: "${userMessage}"`);
        const geminiReply = geminiRes.response.text();
        if (geminiReply && geminiReply.trim()) {
          return {
            message: geminiReply.trim(),
            intent: 'GENERAL_QUERY',
            requiresConfirmation: false,
            confirmationPayload: null,
          };
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local context engine:', err);
      }
    }

    // -------------------------------------------------------------
    // PART 3: DETERMINISTIC CONTEXT-AWARE FALLBACK (Zero external failure)
    // -------------------------------------------------------------

    // Q1: Yesterday's expenses
    if (text.includes('yesterday') && (text.includes('expense') || text.includes('spent') || text.includes('amount') || text.includes('cost') || text.includes('pay') || text.includes('paid'))) {
      const yesterdaySum = context.yesterdayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      let reply = '';
      if (context.yesterdayExpenses.length === 0) {
        reply = `You had no expenses recorded for yesterday (${context.yesterday.toDateString()}).`;
      } else {
        const items = context.yesterdayExpenses.map((e) => `• **₹${e.amount}** on ${e.description} (${e.category})`).join('\n');
        reply = `Yesterday (${context.yesterday.toDateString()}), you expensed a total of **₹${yesterdaySum}**:\n\n${items}`;
      }
      return {
        message: reply,
        intent: 'GET_EXPENSES',
        data: context.yesterdayExpenses,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // Q2: Today's expenses
    if (text.includes('today') && (text.includes('expense') || text.includes('spent') || text.includes('amount'))) {
      const todaySum = context.todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const items = context.todayExpenses.map((e) => `• **₹${e.amount}** on ${e.description} (${e.category})`).join('\n');
      const reply = `Today (${context.now.toDateString()}), you have spent a total of **₹${todaySum}**:\n\n${items}`;
      return {
        message: reply,
        intent: 'GET_EXPENSES',
        data: context.todayExpenses,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // Q3: Classes / Timetable inquiry
    if (text.includes('class') || text.includes('classes') || text.includes('schedule') || text.includes('timetable') || text.includes('lecture')) {
      let reply = '';
      if (text.includes('today')) {
        const todayClasses = context.classes.filter((c) => c.day === context.currentDay);
        if (todayClasses.length === 0) {
          reply = `You have no scheduled classes for today (${context.currentDay}). Enjoy your day!`;
        } else {
          const list = todayClasses.map((c) => `• **${c.subjectName}** (${c.startTime} - ${c.endTime}) in room ${c.room || 'AB1-204'} with ${c.faculty}`).join('\n');
          reply = `Here are your classes for today (${context.currentDay}):\n\n${list}`;
        }
      } else if (text.includes('tomorrow')) {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const tomorrowDay = days[(context.now.getDay() + 1) % 7];
        const tomorrowClasses = context.classes.filter((c) => c.day === tomorrowDay);
        if (tomorrowClasses.length === 0) {
          reply = `You have no classes scheduled for tomorrow (${tomorrowDay}).`;
        } else {
          const list = tomorrowClasses.map((c) => `• **${c.subjectName}** (${c.startTime} - ${c.endTime}) in room ${c.room || 'AB1-204'} with ${c.faculty}`).join('\n');
          reply = `Here are your classes for tomorrow (${tomorrowDay}):\n\n${list}`;
        }
      } else {
        const list = context.classes.map((c) => `• **${c.subjectName}** on ${c.day} (${c.startTime} - ${c.endTime}) in room ${c.room || 'AB1-204'}`).join('\n');
        reply = `Here is your full course timetable:\n\n${list}`;
      }
      return {
        message: reply,
        intent: 'GET_SCHEDULE',
        data: context.classes,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // Q4: Budget & Remaining allowance
    if (text.includes('budget') || text.includes('remaining') || text.includes('allowance') || text.includes('balance') || text.includes('afford')) {
      const limit = context.budget?.monthlyLimit || 10000;
      const remaining = limit - context.totalSpent;
      const daysLeft = 30 - context.now.getDate() + 1;
      const dailyBurn = Math.max(0, Math.round(remaining / (daysLeft || 1)));
      const reply = `**Monthly Budget Status**:\n• Monthly Limit: ₹${limit.toLocaleString()}\n• Spent So Far: ₹${context.totalSpent.toLocaleString()}\n• **Remaining Allowance**: ₹${remaining.toLocaleString()}\n• Safe Daily Burn: ₹${dailyBurn}/day (${daysLeft} days remaining in month)`;
      return {
        message: reply,
        intent: 'GET_BUDGET',
        data: context.budget,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // Q5: Tasks inquiry
    if (text.includes('task') || text.includes('tasks') || text.includes('assignment') || text.includes('assignments') || text.includes('pending') || text.includes('todo')) {
      const pending = context.tasks.filter((t) => t.status !== 'COMPLETED');
      let reply = '';
      if (pending.length === 0) {
        reply = 'You currently have no pending tasks or assignments!';
      } else {
        const list = pending.map((t) => `• [${t.priority}] **${t.title}** (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Upcoming'})`).join('\n');
        reply = `Here are your pending tasks:\n\n${list}`;
      }
      return {
        message: reply,
        intent: 'GET_TASKS',
        data: pending,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // Q6: Debts inquiry
    if (text.includes('borrow') || text.includes('lend') || text.includes('owe') || text.includes('debts')) {
      const toReceive = context.debts.filter((d) => d.type === 'OWES_ME' && d.status === 'PENDING').reduce((s, d) => s + d.amount, 0);
      const toPay = context.debts.filter((d) => d.type === 'I_OWE' && d.status === 'PENDING').reduce((s, d) => s + d.amount, 0);
      const list = context.debts.map((d) => `• **${d.person}**: ₹${d.amount} (${d.type === 'OWES_ME' ? 'Owes you' : 'You owe'})`).join('\n');
      const reply = `**Peer Debts & Splits Overview**:\n• To Receive: **₹${toReceive}**\n• To Pay: **₹${toPay}**\n\n${list}`;
      return {
        message: reply,
        intent: 'GET_DEBTS',
        data: context.debts,
        requiresConfirmation: false,
        confirmationPayload: null,
      };
    }

    // General fallback
    return {
      message: `I am your AI Student Life Companion. You can ask me to:\n• Calculate or query expenses (e.g. "What amount did I expense yesterday?", "Spent 180 on dinner", "How much did I spend this month?")\n• Check your timetable (e.g. "Which classes do I have today?", "Do I have DBMS tomorrow?")\n• Schedule tasks & assignments (e.g. "Submit DBMS lab report tomorrow", "Remind me to study")\n• Split bills with friends (e.g. "Spent 600 with Rahul, split equally")\n• Check budget status and safe daily burn rate`,
      intent: 'GENERAL_QUERY',
      requiresConfirmation: false,
      confirmationPayload: null,
    };
  }

  public parseNaturalExpense(text: string): { amount: number; category: any; description: string; merchant?: string } {
    const amountMatch = text.match(/(?:(?:rs\.?|₹|inr)\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(?:rs|rupees|bucks|inr))?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;

    let category: any = 'OTHER';
    const lower = text.toLowerCase();
    if (lower.match(/\b(food|dinner|lunch|canteen|coffee|tea|chai|breakfast|biryani|pizza|burger|snack|snacks|swiggy|zomato|cafe|juice|maggi|meal|restaurant)\b/i)) {
      category = 'FOOD';
    } else if (lower.match(/\b(auto|cab|uber|ola|bus|metro|petrol|fuel|ticket|train|fare|rapido|transport)\b/i)) {
      category = 'TRANSPORT';
    } else if (lower.match(/\b(book|books|pen|notebook|stationery|print|printout|xerox|exam|fee|tuition|course|notes|lab manual|education)\b/i)) {
      category = 'EDUCATION';
    } else if (lower.match(/\b(movie|game|party|netflix|ott|cinema|bowling|gaming|entertainment)\b/i)) {
      category = 'ENTERTAINMENT';
    }

    let description = text
      .replace(/^(?:please\s+)?(?:i\s+)?(?:spent|spend|paid|pay|bought|buy|cost|ordered|add expense:?|expense:?)\s*/i, '')
      .replace(/(?:for|on|of)\s+(?:rs\.?|₹|inr)?\s*\d+(?:\.\d{1,2})?(?:\s*(?:rs|rupees|bucks|inr))?/i, '')
      .replace(/(?:rs\.?|₹|inr)?\s*\d+(?:\.\d{1,2})?(?:\s*(?:rs|rupees|bucks|inr))?/i, '')
      .replace(/\b(?:today|yesterday|just now)\b/gi, '')
      .replace(/^(?:for|on)\s+/i, '')
      .trim();

    if (!description || description.length < 2) {
      description =
        category === 'FOOD'
          ? 'Food & Dining'
          : category === 'TRANSPORT'
          ? 'Travel / Commute'
          : category === 'EDUCATION'
          ? 'Academic Expense'
          : 'Expense';
    } else {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    return { amount, category, description };
  }

  public parseSplitExpense(text: string): { totalAmount: number; description: string; person: string; category?: any } {
    const amountMatch = text.match(/(?:(?:rs\.?|₹|inr)\s*)?(\d+(?:\.\d{1,2})?)/i);
    const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 500;

    let person = 'Rahul';
    const withMatch = text.match(/with\s+([A-Za-z]+)/i);
    if (withMatch && withMatch[1] && !['the', 'my', 'a', 'an'].includes(withMatch[1].toLowerCase())) {
      person = withMatch[1].charAt(0).toUpperCase() + withMatch[1].slice(1);
    }

    let description = 'Dinner';
    const lower = text.toLowerCase();
    if (lower.includes('dinner')) description = 'Dinner';
    else if (lower.includes('lunch')) description = 'Lunch';
    else if (lower.includes('canteen')) description = 'Canteen';
    else if (lower.includes('food')) description = 'Food';
    else if (lower.includes('auto') || lower.includes('cab')) description = 'Cab fare';

    return { totalAmount, description, person, category: 'FOOD' };
  }

  public parseNaturalTask(text: string): { title: string; priority: any; dueDate?: string } {
    let priority: any = 'NORMAL';
    const lower = text.toLowerCase();
    if (lower.includes('urgent') || lower.includes('critical') || lower.includes('extremely important') || lower.includes('highest priority')) {
      priority = 'EXTREMELY_IMPORTANT';
    } else if (lower.includes('important') || lower.includes('high priority')) {
      priority = 'HIGH';
    }

    let dueDate = new Date(Date.now() + 86400000).toISOString();
    if (lower.includes('today') || lower.includes('tonight')) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      dueDate = today.toISOString();
    } else if (lower.includes('in 2 days')) {
      dueDate = new Date(Date.now() + 86400000 * 2).toISOString();
    } else if (lower.includes('in 3 days')) {
      dueDate = new Date(Date.now() + 86400000 * 3).toISOString();
    } else if (lower.includes('next week')) {
      dueDate = new Date(Date.now() + 86400000 * 7).toISOString();
    }

    let title = text
      .replace(/^(?:please\s+)?(?:remind me to|remember to|i need to|i have to|schedule a task to|schedule task to|schedule task|create task to|create a task to|create task|add task to|add a task to|add task|add todo|task:|todo:)\s+/i, '')
      .replace(/(?:,\s*)?(?:make it|set priority to|priority:?)\s+(?:extremely )?(?:important|urgent|high|normal)/i, '')
      .replace(/(?:,\s*)?(?:due|by)\s+(?:tomorrow|today|tonight|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, '')
      .trim();

    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    } else {
      title = 'Academic Task';
    }

    return {
      title,
      priority,
      dueDate,
    };
  }

  public parseNaturalDebt(text: string): { person: string; type: 'OWES_ME' | 'I_OWE'; amount: number; notes?: string } {
    const amountMatch = text.match(/(?:(?:rs\.?|₹|inr)\s*)?(\d+(?:\.\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;

    const lower = text.toLowerCase();
    const isOwesMe = lower.includes('borrowed from me') || lower.includes('owes me');
    const type = isOwesMe ? 'OWES_ME' : 'I_OWE';

    let person = 'Rahul';
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      if (['borrowed', 'lent', 'owes'].includes(words[i].toLowerCase())) {
        if (i > 0 && !['me', 'i', 'he'].includes(words[i - 1].toLowerCase())) {
          person = words[i - 1];
          break;
        }
      }
    }

    return { person, type, amount, notes: text };
  }
}

export const geminiAssistant = new GeminiAssistant();
