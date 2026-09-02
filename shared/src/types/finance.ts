import { z } from 'zod';

export const TransactionType = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  REFUND: 'REFUND',
  BORROW: 'BORROW',
  LEND: 'LEND',
  TRANSFER: 'TRANSFER',
} as const;

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];

export const ExpenseCategory = {
  FOOD: 'FOOD',
  TRANSPORT: 'TRANSPORT',
  EDUCATION: 'EDUCATION',
  SHOPPING: 'SHOPPING',
  ENTERTAINMENT: 'ENTERTAINMENT',
  HOSTEL: 'HOSTEL',
  BILLS: 'BILLS',
  GROCERIES: 'GROCERIES',
  OTHER: 'OTHER',
} as const;

export type ExpenseCategoryValue = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const ExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  amount: z.number().positive(),
  category: z.enum([
    'FOOD',
    'TRANSPORT',
    'EDUCATION',
    'SHOPPING',
    'ENTERTAINMENT',
    'HOSTEL',
    'BILLS',
    'GROCERIES',
    'OTHER',
  ]),
  merchant: z.string().nullable().optional(),
  description: z.string().min(1),
  date: z.string().datetime(),
  type: z.enum(['EXPENSE', 'INCOME', 'REFUND', 'BORROW', 'LEND', 'TRANSFER']).default('EXPENSE'),
});

export type Expense = z.infer<typeof ExpenseSchema>;

export const BudgetSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  monthlyLimit: z.number().positive(),
  currentSpending: z.number().nonnegative().default(0),
  month: z.string(), // YYYY-MM
  categoryLimits: z.record(z.string(), z.number().positive()).optional(),
  alertThresholds: z.array(z.number()).default([75, 90, 100]),
});

export type Budget = z.infer<typeof BudgetSchema>;

export const DebtSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  person: z.string().min(1),
  type: z.enum(['OWES_ME', 'I_OWE']),
  amount: z.number().positive(),
  status: z.enum(['PENDING', 'PAID', 'PARTIALLY_PAID']).default('PENDING'),
  paidAmount: z.number().nonnegative().default(0),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export type Debt = z.infer<typeof DebtSchema>;

export const SharedExpenseSplitSchema = z.object({
  totalAmount: z.number().positive(),
  description: z.string(),
  numberOfPeople: z.number().int().min(2),
  myShare: z.number().positive(),
  payerName: z.string(),
  friends: z.array(z.string()),
});

export type SharedExpenseSplit = z.infer<typeof SharedExpenseSplitSchema>;
