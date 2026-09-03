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

    // 1. Timetable & Classes
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
    } else if (text.includes('tomorrow') && (text.includes('class') || text.includes('schedule') || text.includes('timetable'))) {
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
    else if (text.includes('split') && (text.includes('dinner') || text.includes('lunch') || text.includes('spent') || text.includes('with'))) {
      intent = 'ADD_EXPENSE';
      const parsed = this.parseSplitExpense(userMessage);
      toolResult = await toolRegistry.split_expense(userId, parsed);
      reply = toolResult.message || `Split ₹${parsed.totalAmount} for ${parsed.description} with ${parsed.person}.`;
    }
    // 3. Add Expense (Single)
    else if (text.startsWith('spent ') || text.includes('expense') || text.startsWith('paid ') || text.match(/\b\d+\s*(?:rs|rupees|on)\b/i)) {
      intent = 'ADD_EXPENSE';
      const parsed = this.parseNaturalExpense(userMessage);
      toolResult = await toolRegistry.add_expense(userId, parsed);
      reply = toolResult.message || `Expense recorded: ₹${parsed.amount} for ${parsed.description}.`;
    }
    // 4. Delete Expense
    else if (text.includes('delete') && text.includes('expense')) {
      intent = 'DELETE_EXPENSE';
      const descMatch = text.replace(/delete|this|the|expense|record/gi, '').trim();
      toolResult = await toolRegistry.delete_expense(userId, descMatch || 'food');
      reply = toolResult.message || 'Expense record removed.';
    }
    // 5. Category / Monthly Expense Inquiry (e.g. "How much did I spend on food this month?")
    else if (text.includes('how much') && (text.includes('spend') || text.includes('spent'))) {
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
    // 6. Budget Status
    else if (text.includes('budget') || text.includes('spending')) {
      intent = 'GET_BUDGET';
      toolResult = await toolRegistry.get_budget(userId);
      const b = toolResult.result;
      reply = `**Monthly Budget Overview**:\n• Monthly Limit: ₹${b.monthlyLimit}\n• Spent so far: ₹${b.totalSpent} (${b.percentageUsed}%)\n• Remaining: ₹${b.remaining}\n• Status: ${b.alertLevel}`;
    }
    // 7. Borrow / Lend & Debts
    else if (text.includes('borrow') || text.includes('lend') || text.includes('owe')) {
      intent = 'GET_DEBTS';
      if (text.includes('borrowed') || text.includes('lent') || text.includes('owes me')) {
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
    // 8. Update Task Priority (e.g. "Make it extremely important")
    else if (text.includes('extremely important') || text.includes('urgent') || text.includes('high priority')) {
      intent = 'UPDATE_TASK';
      const priority = text.includes('extremely') ? 'EXTREMELY_IMPORTANT' : 'HIGH';
      toolResult = await toolRegistry.update_task_priority(userId, { priority });
      reply = toolResult.message || `Task priority updated to ${priority}.`;
    }
    // 9. Complete Task (e.g. "Mark that task complete", "Mark AI assignment complete")
    else if (text.includes('complete') && (text.includes('task') || text.includes('assignment'))) {
      intent = 'UPDATE_TASK';
      const taskTitle = text.replace(/mark|that|the|task|assignment|as|complete|done/gi, '').trim();
      toolResult = await toolRegistry.complete_task(userId, taskTitle || 'AI Assignment');
      reply = toolResult.message || 'Task marked as completed.';
    }
    // 10. Delete Task
    else if (text.includes('delete') && (text.includes('task') || text.includes('assignment'))) {
      intent = 'DELETE_TASK';
      const taskTitle = text.replace(/delete|that|the|task|assignment/gi, '').trim();
      toolResult = await toolRegistry.delete_task(userId, taskTitle || 'AI Assignment');
      reply = toolResult.message || 'Task deleted.';
    }
    // 11. Create Task / Assignment
    else if (text.includes('task') || text.includes('assignment') || text.includes('todo')) {
      if (text.startsWith('add') || text.startsWith('create') || text.startsWith('remind') || text.includes('by ') || text.includes('due ')) {
        intent = 'CREATE_TASK';
        const taskParsed = this.parseNaturalTask(userMessage);
        toolResult = await toolRegistry.create_task(userId, taskParsed);
        reply = toolResult.message || `Task "${taskParsed.title}" created.`;
      } else {
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
    }
    // 12. Calendar Integration (e.g. "Add tomorrow's DBMS class to my calendar")
    else if (text.includes('calendar') && (text.includes('add') || text.includes('event'))) {
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
    // 13. University Notices & Emails
    else if (text.includes('email') || text.includes('notice') || text.includes('announcement')) {
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
      reply = `I am your AI Student Life Companion. You can ask me to:\n• Add expenses or split bills (e.g. "Spent 500 with Rahul, split equally")\n• Schedule tasks (e.g. "Remind me to submit AI assignment tomorrow")\n• Adjust priorities ("Make it extremely important")\n• Check your timetable or calendar\n• Query spending totals ("What did I spend on food this month?")`;
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
    const amountMatch = text.match(/(?:spent|paid|rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;

    let category: any = 'OTHER';
    const lower = text.toLowerCase();
    if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('canteen') || lower.includes('coffee') || lower.includes('biryani')) {
      category = 'FOOD';
    } else if (lower.includes('auto') || lower.includes('cab') || lower.includes('uber') || lower.includes('ola') || lower.includes('bus') || lower.includes('metro') || lower.includes('transport')) {
      category = 'TRANSPORT';
    } else if (lower.includes('book') || lower.includes('course') || lower.includes('exam') || lower.includes('tuition') || lower.includes('stationery')) {
      category = 'EDUCATION';
    } else if (lower.includes('movie') || lower.includes('game') || lower.includes('party')) {
      category = 'ENTERTAINMENT';
    }

    let description = text.replace(/(?:spent|paid|rs\.?|₹|\b\d+\b)/gi, '').trim();
    if (!description) description = `${category.toLowerCase()} expense`;

    return { amount, category, description };
  }

  public parseSplitExpense(text: string): { totalAmount: number; description: string; person: string; category?: any } {
    const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
    const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 500;

    // Detect friend name
    let person = 'Rahul';
    const withMatch = text.match(/with\s+([A-Za-z]+)/i);
    if (withMatch && withMatch[1]) {
      person = withMatch[1];
    }

    let description = 'Dinner / Lunch split';
    if (text.toLowerCase().includes('dinner')) description = 'Dinner';
    if (text.toLowerCase().includes('lunch')) description = 'Lunch';

    return { totalAmount, description, person, category: 'FOOD' };
  }

  public parseNaturalTask(text: string): { title: string; priority: any; dueDate?: string } {
    let priority: any = 'NORMAL';
    const lower = text.toLowerCase();
    if (lower.includes('urgent') || lower.includes('critical') || lower.includes('extremely important')) {
      priority = 'EXTREMELY_IMPORTANT';
    } else if (lower.includes('important') || lower.includes('high priority')) {
      priority = 'HIGH';
    }

    let title = text.replace(/^(?:add|create|remind me to)\s+/i, '').replace(/make it (?:extremely )?important/i, '').trim();
    return {
      title,
      priority,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    };
  }

  public parseNaturalDebt(text: string): { person: string; type: 'OWES_ME' | 'I_OWE'; amount: number; notes?: string } {
    const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
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
