import { create } from 'zustand';
import type { ClassSession, Task, Expense, Budget, Debt, EmailSummary } from '@glitchers/shared';

interface DashboardState {
  classes: ClassSession[];
  tasks: Task[];
  expenses: Expense[];
  budget: Budget | null;
  debts: Debt[];
  emails: EmailSummary[];
  isLoading: boolean;
  setClasses: (classes: ClassSession[]) => void;
  setTasks: (tasks: Task[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setBudget: (budget: Budget | null) => void;
  setDebts: (debts: Debt[]) => void;
  setEmails: (emails: EmailSummary[]) => void;
  addTask: (task: Task) => void;
  addExpense: (expense: Expense) => void;
  addDebt: (debt: Debt) => void;
  markDebtPaid: (debtId: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  classes: [
    {
      id: 'c1',
      userId: 'u1',
      subjectName: 'DBMS (Database Systems)',
      day: 'MONDAY',
      startTime: '10:00',
      endTime: '11:00',
      room: 'AB1-204',
      faculty: 'Dr. Sharma',
      classType: 'LECTURE',
      isCancelled: false,
    },
    {
      id: 'c2',
      userId: 'u1',
      subjectName: 'Operating Systems Lab',
      day: 'MONDAY',
      startTime: '14:00',
      endTime: '16:00',
      room: 'AB2-301',
      faculty: 'Prof. Verma',
      classType: 'LAB',
      isCancelled: false,
    },
  ],
  tasks: [
    {
      id: 't1',
      userId: 'u1',
      title: 'Complete AI Assignment 2',
      priority: 'EXTREMELY_IMPORTANT',
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: 't2',
      userId: 'u1',
      title: 'DBMS Normalization Lab Report',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    },
  ],
  expenses: [
    {
      id: 'e1',
      userId: 'u1',
      amount: 180,
      category: 'FOOD',
      description: 'Dinner at Domino’s',
      merchant: "Domino's",
      date: new Date().toISOString(),
      type: 'EXPENSE',
    },
    {
      id: 'e2',
      userId: 'u1',
      amount: 80,
      category: 'TRANSPORT',
      description: 'Auto to campus',
      date: new Date().toISOString(),
      type: 'EXPENSE',
    },
  ],
  budget: {
    id: 'b1',
    userId: 'u1',
    monthlyLimit: 10000,
    currentSpending: 260,
    month: '2026-09',
    alertThresholds: [75, 90, 100],
  },
  debts: [
    {
      id: 'd1',
      userId: 'u1',
      person: 'Rahul',
      type: 'OWES_ME',
      amount: 500,
      status: 'PENDING',
      paidAmount: 0,
      notes: 'Lunch canteen split',
    },
    {
      id: 'd2',
      userId: 'u1',
      person: 'Aman',
      type: 'I_OWE',
      amount: 200,
      status: 'PENDING',
      paidAmount: 0,
      notes: 'Stationery purchase',
    },
  ],
  emails: [
    {
      id: 'em1',
      userId: 'u1',
      providerMessageId: 'm1',
      sender: 'examcell@university.edu',
      subject: 'Midterm Exam Schedule Announcement',
      receivedAt: new Date().toISOString(),
      isUniversityRelated: true,
      importance: 'HIGH',
      summary: 'Midterm examinations start next Monday. Room allocations published.',
      actionRequired: true,
      actionItem: 'Check assigned examination hall',
      isProcessed: true,
    },
  ],
  isLoading: false,
  setClasses: (classes) => set({ classes }),
  setTasks: (tasks) => set({ tasks }),
  setExpenses: (expenses) => set({ expenses }),
  setBudget: (budget) => set({ budget }),
  setDebts: (debts) => set({ debts }),
  setEmails: (emails) => set({ emails }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  addExpense: (expense) => set((s) => ({ expenses: [expense, ...s.expenses] })),
  addDebt: (debt) => set((s) => ({ debts: [debt, ...s.debts] })),
  markDebtPaid: (debtId) =>
    set((s) => ({
      debts: s.debts.map((d) => (d.id === debtId ? { ...d, status: 'PAID', paidAmount: d.amount } : d)),
    })),
}));
