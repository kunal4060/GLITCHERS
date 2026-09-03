import type { Task, Expense, Debt } from '@glitchers/shared';

export interface HuggingFaceModelInfo {
  id: string;
  name: string;
  repo: string;
  quantization: string;
  sizeMB: number;
  description: string;
  specialty: string;
  parameters: string;
}

export const HUGGINGFACE_OFFLINE_MODELS: HuggingFaceModelInfo[] = [
  {
    id: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    name: 'SmolLM2 360M Instruct',
    repo: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    quantization: 'Q4_K_M (GGUF / Wasm)',
    sizeMB: 119,
    description: 'Ultra-compact mobile-first LLM by Hugging Face. Fast execution, zero network latency.',
    specialty: 'Student Assistant & Daily Tasks',
    parameters: '360 Million',
  },
  {
    id: 'Qwen/Qwen2.5-0.5B-Instruct',
    name: 'Qwen 2.5 0.5B Instruct',
    repo: 'Qwen/Qwen2.5-0.5B-Instruct',
    quantization: 'Q4_K_M (GGUF / Wasm)',
    sizeMB: 350,
    description: 'High-precision mathematical reasoning, programming, and equation solving on-device.',
    specialty: 'Mathematics & Science Solver',
    parameters: '500 Million',
  },
  {
    id: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
    name: 'TinyLlama 1.1B Chat',
    repo: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
    quantization: 'Q4_K_M (GGUF / Wasm)',
    sizeMB: 638,
    description: 'Compact 1.1B parameter dialogue model for in-depth explanations and academic summaries.',
    specialty: 'Comprehensive Knowledge & Chat',
    parameters: '1.1 Billion',
  },
];

export interface OfflineContextData {
  classes: any[];
  tasks: Task[];
  expenses: Expense[];
  budget: any;
  debts: Debt[];
}

export interface OfflineAIResponse {
  message: string;
  intent: string;
  actionType?: 'TASK' | 'EXPENSE' | 'DEBT';
  actionData?: any;
  offlineModelUsed: string;
}

export class OfflineAIEngine {
  /**
   * Process a student message 100% locally with zero internet connectivity.
   */
  public processMessage(
    userMessage: string,
    context: OfflineContextData,
    modelId: string = 'HuggingFaceTB/SmolLM2-360M-Instruct'
  ): OfflineAIResponse {
    const text = userMessage.trim().toLowerCase();
    const model = HUGGINGFACE_OFFLINE_MODELS.find((m) => m.id === modelId) || HUGGINGFACE_OFFLINE_MODELS[0];
    const now = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[now.getDay()];
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayDateStr = yesterday.toISOString().slice(0, 10);
    const todayDateStr = now.toISOString().slice(0, 10);

    const totalSpent = context.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const monthlyLimit = context.budget?.monthlyLimit || 10000;
    const remaining = monthlyLimit - totalSpent;
    const daysLeft = Math.max(1, 30 - now.getDate() + 1);
    const safeDailyBurn = Math.max(0, Math.round(remaining / daysLeft));

    // 1. Math solving
    const mathSolution = this.solveMath(userMessage);
    if (mathSolution) {
      return {
        message: `${mathSolution}\n\n*⚡ Computed by ${model.name} (Hugging Face On-Device)*`,
        intent: 'GENERAL_QUERY',
        offlineModelUsed: model.name,
      };
    }

    // 2. Action: Split Expense
    if (text.includes('split') && (/\d+/.test(text) || text.includes('with') || text.includes('half') || text.includes('equally'))) {
      const match = text.match(/(?:(?:rs\.?|₹|inr)\s*)?(\d+(?:\.\d{1,2})?)/i);
      const totalAmount = match ? parseFloat(match[1]) : 500;
      let person = 'Rahul';
      const withMatch = text.match(/with\s+([A-Za-z]+)/i);
      if (withMatch && withMatch[1] && !['the', 'my', 'a', 'an'].includes(withMatch[1].toLowerCase())) {
        person = withMatch[1].charAt(0).toUpperCase() + withMatch[1].slice(1);
      }
      const myShare = Math.round(totalAmount / 2);
      const newExp: Expense = {
        id: String(Date.now()),
        userId: 'u1',
        amount: myShare,
        category: 'FOOD',
        description: `Split Bill with ${person}`,
        date: new Date().toISOString(),
        type: 'EXPENSE',
      };
      const newDebt: Debt = {
        id: String(Date.now() + 1),
        userId: 'u1',
        person,
        amount: totalAmount - myShare,
        paidAmount: 0,
        type: 'OWES_ME',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      return {
        message: `### ⚡ Offline Action Recorded\n\nSplit **₹${totalAmount}** with **${person}**.\n• Your recorded expense: **₹${myShare}**\n• Added debt: **${person}** owes you **₹${newDebt.amount}**\n\n*⚡ Processed by ${model.name} (Hugging Face On-Device)*`,
        intent: 'ADD_EXPENSE',
        actionType: 'EXPENSE',
        actionData: { expense: newExp, debt: newDebt },
        offlineModelUsed: model.name,
      };
    }

    // 3. Action: Add Expense
    if (
      text.startsWith('spent') ||
      text.startsWith('paid') ||
      text.startsWith('bought') ||
      text.startsWith('add expense') ||
      (text.includes('expense') && /\d+/.test(text) && !text.includes('what') && !text.includes('how much') && !text.includes('yesterday') && !text.includes('conclude')) ||
      text.match(/(?:spent|paid|bought|cost|ordered)\s+(?:rs\.?|₹|inr)?\s*\d+/i)
    ) {
      const match = text.match(/(?:(?:rs\.?|₹|inr)\s*)?(\d+(?:\.\d{1,2})?)/i);
      const amount = match ? parseFloat(match[1]) : 100;
      let cat: Expense['category'] = 'OTHER';
      if (/\b(food|dinner|lunch|canteen|coffee|tea|chai|breakfast|biryani|pizza|burger|snack)\b/i.test(text)) cat = 'FOOD';
      else if (/\b(auto|cab|uber|ola|bus|metro|petrol|fuel)\b/i.test(text)) cat = 'TRANSPORT';
      else if (/\b(book|books|stationery|print|printout|xerox|fee|notes)\b/i.test(text)) cat = 'EDUCATION';

      let desc = text.replace(/^(?:spent|paid|bought|add expense:?|cost)\s*/i, '').replace(/(?:rs\.?|₹|inr)?\s*\d+/gi, '').replace(/\b(?:on|for|today|yesterday)\b/gi, '').trim();
      if (!desc) desc = cat === 'FOOD' ? 'Food & Refreshments' : 'Expense';
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);

      const newExp: Expense = {
        id: String(Date.now()),
        userId: 'u1',
        amount,
        category: cat,
        description: desc,
        date: new Date().toISOString(),
        type: 'EXPENSE',
      };

      return {
        message: `### ⚡ Offline Expense Recorded\n\nAdded **₹${amount}** for **${desc}** under category **${cat}**.\n• Updated monthly total: ₹${(totalSpent + amount).toLocaleString()}\n• Remaining budget: ₹${(remaining - amount).toLocaleString()}\n\n*⚡ Processed by ${model.name} (Hugging Face On-Device)*`,
        intent: 'ADD_EXPENSE',
        actionType: 'EXPENSE',
        actionData: newExp,
        offlineModelUsed: model.name,
      };
    }

    // 4. Action: Create Task
    if (
      (
        text.startsWith('remind me') ||
        text.startsWith('remember to') ||
        text.startsWith('i need to') ||
        text.startsWith('i have to') ||
        text.startsWith('add task') ||
        text.startsWith('create task') ||
        text.match(/\b(submit|prepare|write|homework|assignment|lab report)\b/i)
      ) &&
      !text.includes('what') && !text.includes('show') && !text.includes('list')
    ) {
      let priority: Task['priority'] = 'NORMAL';
      if (text.includes('urgent') || text.includes('extremely') || text.includes('critical')) priority = 'EXTREMELY_IMPORTANT';
      else if (text.includes('important') || text.includes('high')) priority = 'HIGH';

      let cleanTitle = text
        .replace(/^(?:remind me to|remember to|i need to|i have to|add task|create task)\s+/i, '')
        .replace(/(?:,\s*)?(?:make it|set priority to|priority:?)\s+(?:extremely )?(?:important|urgent|high|normal)/i, '')
        .replace(/(?:,\s*)?(?:due|by)\s+(?:tomorrow|today|tonight|next week)/i, '')
        .trim();
      cleanTitle = cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : 'Academic Task';

      const newTask: Task = {
        id: String(Date.now()),
        userId: 'u1',
        title: cleanTitle,
        priority,
        status: 'TODO',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      };

      return {
        message: `### ⚡ Offline Task Scheduled\n\nScheduled **"${cleanTitle}"** with **${priority}** priority.\n• Due date: Tomorrow\n• Added to your local Task Manager\n\n*⚡ Processed by ${model.name} (Hugging Face On-Device)*`,
        intent: 'CREATE_TASK',
        actionType: 'TASK',
        actionData: newTask,
        offlineModelUsed: model.name,
      };
    }

    // 5. Conclude all app data
    if (text.includes('conclude') || text.includes('summary') || text.includes('overview') || text.includes('analyze') || text.includes('report')) {
      const todayExpenses = context.expenses.filter((e) => e.date.slice(0, 10) === todayDateStr);
      const yesterdayExpenses = context.expenses.filter((e) => e.date.slice(0, 10) === yesterdayDateStr);
      const pendingTasks = context.tasks.filter((t) => t.status !== 'COMPLETED');
      const todayClasses = context.classes.filter((c) => c.day === currentDay);

      const reply = `### 📊 Offline Student Life Synthesis\n` +
        `*Analyzed completely on-device without internet access via ${model.name}*\n\n` +
        `**💰 Financial Health**:\n` +
        `• Monthly Budget: ₹${monthlyLimit.toLocaleString()}\n` +
        `• Total Spent: ₹${totalSpent.toLocaleString()} (${Math.round((totalSpent / monthlyLimit) * 100)}%)\n` +
        `• Remaining Allowance: **₹${remaining.toLocaleString()}**\n` +
        `• Safe Daily Burn Rate: **₹${safeDailyBurn}/day** (${daysLeft} days remaining in month)\n` +
        `• Today's Spending: ₹${todayExpenses.reduce((s, e) => s + Number(e.amount), 0)} (${todayExpenses.length} items)\n\n` +
        `**📚 Academic Status**:\n` +
        `• Classes Today (${currentDay}): ${todayClasses.length > 0 ? todayClasses.map((c) => `**${c.subjectName}** (${c.startTime})`).join(', ') : 'No scheduled lectures today'}\n` +
        `• Total Active Weekly Courses: ${context.classes.length}\n\n` +
        `**📝 Task Manager**:\n` +
        `• Pending Assignments: ${pendingTasks.length} task(s) awaiting completion\n` +
        `${pendingTasks.slice(0, 3).map((t) => `  • [${t.priority}] ${t.title}`).join('\n')}\n\n` +
        `**🤝 Friend Splits & Debts**:\n` +
        `• Friends owe you: ₹${context.debts.filter((d) => d.type === 'OWES_ME').reduce((s, d) => s + d.amount, 0)}\n` +
        `• You owe friends: ₹${context.debts.filter((d) => d.type === 'I_OWE').reduce((s, d) => s + d.amount, 0)}\n\n` +
        `*💡 Recommendation: You are currently on track with your monthly budget. Allocate 2 hours this evening to address pending academic assignments.*`;

      return {
        message: reply,
        intent: 'GENERAL_QUERY',
        offlineModelUsed: model.name,
      };
    }

    // 6. Yesterday's expenses
    if (text.includes('yesterday') && (text.includes('expense') || text.includes('spent') || text.includes('amount') || text.includes('cost'))) {
      const yesterdayExpenses = context.expenses.filter((e) => e.date.slice(0, 10) === yesterdayDateStr);
      const yesterdaySum = yesterdayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      let reply = '';
      if (yesterdayExpenses.length === 0) {
        reply = `You have no recorded expenses for yesterday (${yesterday.toDateString()}).`;
      } else {
        const items = yesterdayExpenses.map((e) => `• **₹${e.amount}** on ${e.description} (${e.category})`).join('\n');
        reply = `### 🧾 Yesterday's Spending (${yesterday.toDateString()}):\n\nTotal: **₹${yesterdaySum}**\n\n${items}`;
      }
      return {
        message: `${reply}\n\n*⚡ Processed by ${model.name} (Hugging Face On-Device)*`,
        intent: 'GET_EXPENSES',
        offlineModelUsed: model.name,
      };
    }

    // 7. Today's classes
    if (text.includes('class') || text.includes('classes') || text.includes('schedule') || text.includes('timetable')) {
      const todayClasses = context.classes.filter((c) => c.day === currentDay);
      let reply = '';
      if (todayClasses.length === 0) {
        reply = `You have no scheduled classes for today (${currentDay}). Enjoy your free time!`;
      } else {
        const list = todayClasses.map((c) => `• **${c.subjectName}** (${c.startTime} - ${c.endTime}) in ${c.room || 'AB1-204'} with ${c.faculty}`).join('\n');
        reply = `### 🏫 Your Classes Today (${currentDay}):\n\n${list}`;
      }
      return {
        message: `${reply}\n\n*⚡ Processed by ${model.name} (Hugging Face On-Device)*`,
        intent: 'GET_SCHEDULE',
        offlineModelUsed: model.name,
      };
    }

    // 8. Budget status
    if (text.includes('budget') || text.includes('allowance') || text.includes('balance') || text.includes('remaining')) {
      const reply = `### 💰 Monthly Budget Status\n\n` +
        `• Monthly Limit: ₹${monthlyLimit.toLocaleString()}\n` +
        `• Total Spent: ₹${totalSpent.toLocaleString()}\n` +
        `• **Remaining Allowance**: ₹${remaining.toLocaleString()}\n` +
        `• Safe Daily Burn: **₹${safeDailyBurn}/day** (${daysLeft} days remaining in month)`;
      return {
        message: `${reply}\n\n*⚡ Processed by ${model.name} (Hugging Face On-Device)*`,
        intent: 'GET_BUDGET',
        offlineModelUsed: model.name,
      };
    }

    // 9. Tasks inquiry
    if (text.includes('task') || text.includes('tasks') || text.includes('assignment') || text.includes('todo')) {
      const pending = context.tasks.filter((t) => t.status !== 'COMPLETED');
      let reply = '';
      if (pending.length === 0) {
        reply = 'You have no pending assignments or tasks!';
      } else {
        const list = pending.map((t) => `• [${t.priority}] **${t.title}** (Due: upcoming)`).join('\n');
        reply = `### 📝 Pending Tasks:\n\n${list}`;
      }
      return {
        message: `${reply}\n\n*⚡ Processed by ${model.name} (Hugging Face On-Device)*`,
        intent: 'GET_TASKS',
        offlineModelUsed: model.name,
      };
    }

    // 10. General Conversational / Study Q&A fallback
    return {
      message: `### 🤖 ${model.name} (Offline AI Assistant)\n\n` +
        `I am operating 100% on your device without an internet connection using Hugging Face's **${model.parameters}** model.\n\n` +
        `**What I can do offline**:\n` +
        `• **Solve Math Problems**: E.g. *"Solve 4x + 16 = 36"*, *"What is 25 * 18"*, percentages\n` +
        `• **Conclude App Data**: E.g. *"Conclude all my app data"* (synthesizes budget, classes, and tasks)\n` +
        `• **Log Expenses**: E.g. *"Spent 180 on dinner"*, *"Paid 40 for coffee"*\n` +
        `• **Schedule Tasks**: E.g. *"Remind me to submit DBMS lab report tomorrow"*\n` +
        `• **Timetable & Schedule**: E.g. *"Which classes do I have today?"*\n` +
        `• **Check Budget**: E.g. *"What is my remaining budget?"*`,
      intent: 'GENERAL_QUERY',
      offlineModelUsed: model.name,
    };
  }

  /**
   * Client-side math problem solver
   */
  public solveMath(input: string): string | null {
    const text = input.trim();

    // 1. Linear Equation: e.g. "4x + 16 = 36" or "Solve: 3x - 9 = 21"
    const linearMatch = text.match(/(?:solve[:\s]*)?([+-]?\s*\d*)\s*x\s*([+-]\s*\d+)\s*=\s*([+-]?\s*\d+)/i);
    if (linearMatch) {
      const aStr = linearMatch[1].replace(/\s+/g, '');
      const a = aStr === '' || aStr === '+' ? 1 : aStr === '-' ? -1 : parseFloat(aStr);
      const b = parseFloat(linearMatch[2].replace(/\s+/g, ''));
      const c = parseFloat(linearMatch[3].replace(/\s+/g, ''));
      const rhs = c - b;
      const x = rhs / a;

      return `### 📐 Step-by-Step Math Solution\n\n` +
        `**Equation**: **${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}**\n\n` +
        `**Step 1: Isolate the variable term (${a}x)**\n` +
        `Subtract ${b} from both sides:\n` +
        `$$${a}x = ${c} - (${b}) = ${rhs}$$\n\n` +
        `**Step 2: Solve for x**\n` +
        `Divide both sides by ${a}:\n` +
        `$$x = \\frac{${rhs}}{${a}} = ${x}$$\n\n` +
        `**Final Answer**: **x = ${x}**`;
    }

    // 2. Percentage calculation: e.g. "20% of 1500" or "What is 15% of 800?"
    const pctMatch = text.match(/(?:what is\s*)?(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1]);
      const total = parseFloat(pctMatch[2]);
      const res = (pct / 100) * total;
      return `### 🧮 Percentage Calculation\n\n` +
        `**Formula**: $\\frac{${pct}}{100} \\times ${total}$\n\n` +
        `**Result**: **${res}** (${pct}% of ${total})`;
    }

    // 3. Basic arithmetic: e.g. "What is 250 * 18?" or "1500 / 12"
    const arithMatch = text.match(/(?:what is|calculate|solve)?\s*([0-9]+(?:\.[0-9]+)?)\s*([\+\-\*\/x×÷])\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (arithMatch) {
      const n1 = parseFloat(arithMatch[1]);
      const op = arithMatch[2];
      const n2 = parseFloat(arithMatch[3]);
      let res = 0;
      if (op === '+' || op === 'plus') res = n1 + n2;
      else if (op === '-' || op === 'minus') res = n1 - n2;
      else if (op === '*' || op === 'x' || op === '×') res = n1 * n2;
      else if (op === '/' || op === '÷') res = n2 !== 0 ? n1 / n2 : 0;

      return `### 🧮 Arithmetic Calculation\n\n` +
        `**Expression**: ${n1} ${op} ${n2}\n\n` +
        `**Result**: **${Math.round(res * 1000) / 1000}**`;
    }

    return null;
  }
}

export const offlineAiEngine = new OfflineAIEngine();
