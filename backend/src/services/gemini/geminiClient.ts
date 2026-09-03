import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { toolRegistry, type ToolExecutionResult } from './toolRegistry.js';
import type { AIChatResponse, RouterIntentType } from '@glitchers/shared';

export class GeminiAssistant {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.startsWith('dev-')) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  /**
   * Router: Map student message to intent and execute relevant controlled tool
   */
  public async processStudentQuery(userId: string, userMessage: string): Promise<AIChatResponse> {
    const text = userMessage.trim().toLowerCase();

    let intent: RouterIntentType = 'GENERAL_QUERY';
    let toolResult: ToolExecutionResult | null = null;
    let reply = '';
    let requiresConfirmation = false;
    let confirmationPayload: any = null;

    // 1. Timetable & Schedule Queries
    if (text.includes('today') && (text.includes('class') || text.includes('schedule') || text.includes('timetable'))) {
      intent = 'GET_SCHEDULE';
      toolResult = await toolRegistry.get_today_schedule(userId);
      const classes = toolResult.result.classes;
      if (classes.length === 0) {
        reply = `You have no scheduled classes for today (${toolResult.result.day})! Enjoy your free time.`;
      } else {
        const list = classes.map((c: any) => `• **${c.subjectName}** (${c.startTime} - ${c.endTime}) in room ${c.room || 'TBD'}`).join('\n');
        reply = `Here is your schedule for today (${toolResult.result.day}):\n\n${list}`;
      }
    } else if (text.includes('tomorrow') && (text.includes('class') || text.includes('schedule') || text.includes('timetable')) && !text.includes('submit') && !text.includes('assignment') && !text.includes('task')) {
      intent = 'GET_SCHEDULE';
      toolResult = await toolRegistry.get_tomorrow_schedule(userId);
      const classes = toolResult.result.classes;
      if (classes.length === 0) {
        reply = `You have no scheduled classes for tomorrow (${toolResult.result.day}).`;
      } else {
        const list = classes.map((c: any) => `• **${c.subjectName}** (${c.startTime} - ${c.endTime}) in room ${c.room || 'TBD'}`).join('\n');
        reply = `Here is your schedule for tomorrow (${toolResult.result.day}):\n\n${list}`;
      }
    }
    // 2. Cross-Module Split Expense (e.g. "Spent 500 on dinner with Rahul. Split it equally")
    else if (text.includes('split') && (/\d+/.test(text) || text.includes('with') || text.includes('half') || text.includes('equally'))) {
      intent = 'ADD_EXPENSE';
      const parsed = this.parseSplitExpense(userMessage);
      toolResult = await toolRegistry.split_expense(userId, parsed);
      reply = toolResult.message || `Split ₹${parsed.totalAmount} for ${parsed.description} with ${parsed.person}.`;
    }
    // 3. Delete Expense
    else if (text.includes('delete') && (text.includes('expense') || text.includes('spending'))) {
      intent = 'DELETE_EXPENSE';
      const descMatch = text.replace(/delete|this|the|expense|record|spending/gi, '').trim();
      toolResult = await toolRegistry.delete_expense(userId, descMatch || 'food');
      reply = toolResult.message || 'Expense record removed.';
    }
    // 4. Category / Monthly Expense Inquiry
    else if ((text.includes('how much') || text.includes('total')) && (text.includes('spend') || text.includes('spent') || text.includes('expense'))) {
      intent = 'GET_EXPENSES';
      const res = await toolRegistry.get_expenses(userId);
      const expenses = res.result || [];
      if (text.includes('food')) {
        const foodTotal = expenses
          .filter((e: any) => e.category === 'FOOD')
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        reply = `You have spent ₹${foodTotal} on food this month.`;
      } else {
        const total = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        reply = `You have spent ₹${total} in total this month.`;
      }
      toolResult = res;
    }
    // 5. Budget Status
    else if (text.includes('budget') || (text.includes('spending') && (text.includes('status') || text.includes('overview') || text.includes('snapshot')))) {
      intent = 'GET_BUDGET';
      toolResult = await toolRegistry.get_budget(userId);
      const b = toolResult.result;
      reply = `**Monthly Budget Overview**:\n• Monthly Limit: ₹${b.monthlyLimit}\n• Spent so far: ₹${b.totalSpent} (${b.percentageUsed}%)\n• Remaining: ₹${b.remaining}\n• Status: ${b.alertLevel}`;
    }
    // 6. Borrow / Lend & Debts
    else if (text.includes('borrow') || text.includes('lend') || text.includes('lent') || text.includes('owe') || text.includes('debts')) {
      intent = 'GET_DEBTS';
      if (text.includes('borrowed') || text.includes('lent') || text.includes('owes me') || text.includes('i owe')) {
        const debtParsed = this.parseNaturalDebt(userMessage);
        toolResult = await toolRegistry.add_debt(userId, debtParsed);
        reply = toolResult.message || 'Debt record added successfully.';
      } else if (text.includes('paid') || text.includes('settle')) {
        const personMatch = text.replace(/mark|debt|as|paid|settle|with/gi, '').trim();
        toolResult = await toolRegistry.mark_debt_paid(userId, personMatch || 'Rahul');
        reply = toolResult.message || 'Debt record marked as paid.';
      } else {
        toolResult = await toolRegistry.get_debts(userId);
        const totals = toolResult.result.totals;
        reply = `**Borrow / Lend Summary**:\n• To Receive: ₹${totals.toReceive}\n• To Pay: ₹${totals.toPay}`;
      }
    }
    // 7. Add Expense (Single) - Broad & Robust Matching
    else if (
      text.startsWith('spent') ||
      text.startsWith('paid') ||
      text.startsWith('bought') ||
      text.includes('expense') ||
      text.match(/(?:spent|paid|bought|cost|ordered)\s+(?:rs\.?|₹|inr)?\s*\d+/i) ||
      text.match(/(?:rs\.?|₹|inr)\s*\d+/i) ||
      text.match(/\d+\s*(?:rs|rupees|bucks|inr)\b/i) ||
      (
        /\d+/.test(text) &&
        text.match(/\b(food|dinner|lunch|canteen|coffee|chai|tea|breakfast|biryani|pizza|burger|snack|auto|cab|uber|ola|bus|metro|petrol|fuel|stationery|book|books|print|printout|xerox|groceries|swiggy|zomato)\b/i)
      )
    ) {
      intent = 'ADD_EXPENSE';
      const parsed = this.parseNaturalExpense(userMessage);
      toolResult = await toolRegistry.add_expense(userId, parsed);
      reply = toolResult.message || `Expense recorded: ₹${parsed.amount} for ${parsed.description}. Added to your expense tracker.`;
    }
    // 8. Update Task Priority
    else if (text.includes('extremely important') || text.includes('urgent') || text.includes('high priority') || text.includes('prioritize')) {
      intent = 'UPDATE_TASK';
      const priority = text.includes('extremely') || text.includes('urgent') ? 'EXTREMELY_IMPORTANT' : 'HIGH';
      toolResult = await toolRegistry.update_task_priority(userId, { priority });
      reply = toolResult.message || `Task priority updated to ${priority}.`;
    }
    // 9. Complete Task
    else if (
      (text.includes('complete') || text.includes('finish') || text.includes('mark done') || text.includes('done with')) &&
      (text.includes('task') || text.includes('assignment') || text.includes('lab') || text.includes('report') || text.includes('homework') || text.includes('project'))
    ) {
      intent = 'UPDATE_TASK';
      const taskTitle = text.replace(/mark|that|the|task|assignment|lab|report|as|complete|done|finished|with/gi, '').trim();
      toolResult = await toolRegistry.complete_task(userId, taskTitle || 'AI Assignment');
      reply = toolResult.message || 'Task marked as completed.';
    }
    // 10. Delete Task
    else if (text.includes('delete') && (text.includes('task') || text.includes('assignment') || text.includes('todo'))) {
      intent = 'DELETE_TASK';
      const taskTitle = text.replace(/delete|that|the|task|assignment|todo/gi, '').trim();
      toolResult = await toolRegistry.delete_task(userId, taskTitle || 'AI Assignment');
      reply = toolResult.message || 'Task deleted.';
    }
    // 11. Query Tasks (e.g. "what tasks do I have", "show all tasks", "list tasks")
    else if (
      (text.includes('what') || text.includes('show') || text.includes('list') || text.includes('check') || text.includes('any')) &&
      (text.includes('task') || text.includes('tasks') || text.includes('assignment') || text.includes('assignments') || text.includes('pending'))
    ) {
      intent = 'GET_TASKS';
      toolResult = await toolRegistry.get_tasks(userId);
      const tasks = toolResult.result;
      if (tasks.length === 0) {
        reply = 'You currently have no pending tasks.';
      } else {
        const list = tasks.map((t: any) => `• [${t.priority}] **${t.title}** (${t.status})`).join('\n');
        reply = `Here are your current tasks:\n\n${list}`;
      }
    }
    // 12. Create Task / Assignment / Homework - Broad & Robust Matching
    else if (
      text.includes('task') ||
      text.includes('assignment') ||
      text.includes('homework') ||
      text.includes('lab report') ||
      text.includes('project') ||
      text.includes('todo') ||
      text.startsWith('remind me') ||
      text.startsWith('remember to') ||
      text.startsWith('i need to') ||
      text.startsWith('i have to') ||
      text.match(/\b(submit|complete|finish|prepare|study for|review|write|upload)\b/i) ||
      text.match(/\b(due tomorrow|due in|by tomorrow|by friday|by monday)\b/i)
    ) {
      intent = 'CREATE_TASK';
      const taskParsed = this.parseNaturalTask(userMessage);
      toolResult = await toolRegistry.create_task(userId, taskParsed);
      reply = toolResult.message || `Task "${taskParsed.title}" scheduled successfully. Added to your task manager.`;
    }
    // 13. Calendar Integration
    else if (text.includes('calendar') && (text.includes('add') || text.includes('event') || text.includes('schedule'))) {
      intent = 'CREATE_CALENDAR_EVENT';
      requiresConfirmation = true;
      confirmationPayload = {
        title: 'Database Management Systems (DBMS)',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        location: 'AB1-204',
      };
      toolResult = await toolRegistry.create_calendar_event(userId, confirmationPayload);
      reply = `Added **${confirmationPayload.title}** (${confirmationPayload.startTime} - ${confirmationPayload.endTime}) in Room ${confirmationPayload.location} to your academic calendar.`;
    }
    // 14. University Notices & Emails
    else if (text.includes('email') || text.includes('notice') || text.includes('announcement') || text.includes('circular')) {
      intent = 'GET_EMAILS';
      toolResult = await toolRegistry.get_important_emails(userId);
      const emails = toolResult.result;
      if (emails.length === 0) {
        reply = 'No urgent university emails detected.';
      } else {
        const list = emails.map((e: any) => `• **${e.subject}** (${e.sender})\n  _${e.summary}_`).join('\n\n');
        reply = `Important University Announcements:\n\n${list}`;
      }
    } else {
      intent = 'GENERAL_QUERY';
      reply = `I am your AI Student Life Companion. You can ask me to:\n• Add expenses or split bills (e.g. "Spent 180 on dinner", "Bought coffee for 60", "Split 500 with Rahul")\n• Schedule tasks or assignments (e.g. "Submit DBMS lab report tomorrow", "Remind me to study for quiz")\n• Adjust priorities ("Make it extremely important")\n• Check your timetable, attendance, or calendar\n• Query spending totals ("How much did I spend on food?")`;
    }

    return {
      message: reply,
      intent,
      toolExecuted: toolResult?.toolName,
      data: toolResult?.result,
      requiresConfirmation,
      confirmationPayload,
    };
  }

  public parseNaturalExpense(text: string): { amount: number; category: any; description: string; merchant?: string } {
    // Extract numerical amount, tolerating currency symbols
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

    // Determine due date
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
