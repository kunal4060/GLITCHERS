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

    // 1. Natural Language Intent Routing (Deterministic + AI)
    let intent: RouterIntentType = 'GENERAL_QUERY';
    let toolResult: ToolExecutionResult | null = null;
    let reply = '';

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
    } else if (text.startsWith('spent ') || text.includes('expense') || text.startsWith('paid ') || text.match(/\b\d+\s*(?:rs|rupees|on)\b/i)) {
      intent = 'ADD_EXPENSE';
      const parsed = this.parseNaturalExpense(userMessage);
      toolResult = await toolRegistry.add_expense(userId, parsed);
      reply = toolResult.message || `Expense recorded: ₹${parsed.amount} for ${parsed.description}.`;
    } else if (text.includes('budget') || text.includes('how much did i spend') || text.includes('spending')) {
      intent = 'GET_BUDGET';
      toolResult = await toolRegistry.get_budget(userId);
      const b = toolResult.result;
      reply = `**Monthly Budget Overview**:\n• Monthly Limit: ₹${b.monthlyLimit}\n• Spent so far: ₹${b.totalSpent} (${b.percentageUsed}%)\n• Remaining: ₹${b.remaining}\n• Status: ${b.alertLevel}`;
    } else if (text.includes('borrow') || text.includes('lend') || text.includes('owe')) {
      intent = 'GET_DEBTS';
      if (text.includes('borrowed') || text.includes('lent')) {
        const debtParsed = this.parseNaturalDebt(userMessage);
        toolResult = await toolRegistry.add_debt(userId, debtParsed);
        reply = toolResult.message || 'Debt record added successfully.';
      } else {
        toolResult = await toolRegistry.get_debts(userId);
        const totals = toolResult.result.totals;
        reply = `**Borrow / Lend Summary**:\n• To Receive: ₹${totals.toReceive}\n• To Pay: ₹${totals.toPay}`;
      }
    } else if (text.includes('task') || text.includes('assignment') || text.includes('todo')) {
      if (text.startsWith('add') || text.startsWith('create') || text.includes('by ') || text.includes('due ')) {
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
    } else if (text.includes('email') || text.includes('notice') || text.includes('announcement')) {
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
      reply = `I am your AI Student Life Companion. You can ask me about:\n• Today's or tomorrow's class schedule\n• Adding expenses (e.g. "Spent 150 on lunch")\n• Checking your budget and debts\n• Tracking assignments and exams\n• Reading university email summaries`;
    }

    return {
      message: reply,
      intent,
      toolExecuted: toolResult?.toolName,
      data: toolResult?.result,
    };
  }

  public parseNaturalExpense(text: string): { amount: number; category: any; description: string; merchant?: string } {
    // Regex for amount: e.g. "Spent 180 on dinner", "150 rs for auto"
    const amountMatch = text.match(/(?:spent|paid|rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;

    let category: any = 'OTHER';
    const lower = text.toLowerCase();
    if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('pizza') || lower.includes('canteen') || lower.includes('coffee') || lower.includes('biryani')) {
      category = 'FOOD';
    } else if (lower.includes('auto') || lower.includes('cab') || lower.includes('uber') || lower.includes('ola') || lower.includes('bus') || lower.includes('metro') || lower.includes('transport')) {
      category = 'TRANSPORT';
    } else if (lower.includes('book') || lower.includes('course') || lower.includes('exam') || lower.includes('tuition') || lower.includes('stationery')) {
      category = 'EDUCATION';
    } else if (lower.includes('movie') || lower.includes('game') || lower.includes('party')) {
      category = 'ENTERTAINMENT';
    }

    // Extract description
    let description = text.replace(/(?:spent|paid|rs\.?|₹|\b\d+\b)/gi, '').trim();
    if (!description) description = `${category.toLowerCase()} expense`;

    return {
      amount,
      category,
      description,
    };
  }

  public parseNaturalTask(text: string): { title: string; priority: any; dueDate?: string } {
    let priority: any = 'NORMAL';
    const lower = text.toLowerCase();
    if (lower.includes('urgent') || lower.includes('critical') || lower.includes('extremely important')) {
      priority = 'EXTREMELY_IMPORTANT';
    } else if (lower.includes('important') || lower.includes('high priority')) {
      priority = 'HIGH';
    }

    let title = text.replace(/^(?:add|create|remind me to)\s+/i, '').trim();
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

    // Extract person name: word after borrowed from / lent to / owes
    const words = text.split(/\s+/);
    let person = 'Friend';
    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase() === 'from' || words[i].toLowerCase() === 'to') {
        if (words[i + 1] && !['me', 'him', 'her'].includes(words[i + 1].toLowerCase())) {
          person = words[i + 1];
          break;
        }
      }
    }

    return {
      person,
      type,
      amount,
      notes: text,
    };
  }
}

export const geminiAssistant = new GeminiAssistant();
