import type { Expense, Budget, Debt } from '@glitchers/shared';

export interface BudgetStatus {
  monthlyLimit: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
  alertLevel: 'NORMAL' | 'WARNING_75' | 'CRITICAL_90' | 'EXCEEDED_100';
}

export function calculateTotalSpent(expenses: Expense[]): number {
  return expenses
    .filter((e) => e.type === 'EXPENSE')
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

export function calculateCategoryBreakdown(expenses: Expense[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const exp of expenses) {
    if (exp.type === 'EXPENSE') {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + Number(exp.amount);
    }
  }
  return breakdown;
}

export function calculateBudgetStatus(budget: Budget, expenses: Expense[]): BudgetStatus {
  const totalSpent = calculateTotalSpent(expenses);
  const remaining = Math.max(0, budget.monthlyLimit - totalSpent);
  const percentageUsed = Math.round((totalSpent / budget.monthlyLimit) * 100);

  let alertLevel: BudgetStatus['alertLevel'] = 'NORMAL';
  if (percentageUsed >= 100) {
    alertLevel = 'EXCEEDED_100';
  } else if (percentageUsed >= 90) {
    alertLevel = 'CRITICAL_90';
  } else if (percentageUsed >= 75) {
    alertLevel = 'WARNING_75';
  }

  return {
    monthlyLimit: budget.monthlyLimit,
    totalSpent,
    remaining,
    percentageUsed,
    isOverBudget: totalSpent > budget.monthlyLimit,
    alertLevel,
  };
}

export function calculateDebtTotals(debts: Debt[]): { toReceive: number; toPay: number } {
  let toReceive = 0;
  let toPay = 0;

  for (const debt of debts) {
    if (debt.status !== 'PAID') {
      const remainingAmount = Number(debt.amount) - Number(debt.paidAmount || 0);
      if (debt.type === 'OWES_ME') {
        toReceive += remainingAmount;
      } else if (debt.type === 'I_OWE') {
        toPay += remainingAmount;
      }
    }
  }

  return { toReceive, toPay };
}

export function calculateEqualSplit(totalAmount: number, numberOfPeople: number): number {
  if (numberOfPeople <= 0) throw new Error('Number of people must be greater than 0');
  return Math.round((totalAmount / numberOfPeople) * 100) / 100;
}

export interface BurnRateForecast {
  dailyAllowance: number;
  averageDailySpend: number;
  projectedEndSpend: number;
  daysUntilDepletion: number | null;
  topCategory: string | null;
  recommendation: string;
}

export function calculateBurnRateForecast(
  budget: Budget,
  expenses: Expense[],
  daysPassedInMonth = 15,
  daysRemainingInMonth = 15
): BurnRateForecast {
  const totalSpent = calculateTotalSpent(expenses);
  const remaining = Math.max(0, budget.monthlyLimit - totalSpent);
  const safeDaysRemaining = Math.max(1, daysRemainingInMonth);
  const safeDaysPassed = Math.max(1, daysPassedInMonth);

  const dailyAllowance = Math.round((remaining / safeDaysRemaining) * 100) / 100;
  const averageDailySpend = Math.round((totalSpent / safeDaysPassed) * 100) / 100;
  const projectedEndSpend = Math.round(totalSpent + averageDailySpend * safeDaysRemaining);

  let daysUntilDepletion: number | null = null;
  if (averageDailySpend > 0 && remaining > 0) {
    daysUntilDepletion = Math.floor(remaining / averageDailySpend);
  } else if (remaining === 0) {
    daysUntilDepletion = 0;
  }

  // Determine top category
  const breakdown = calculateCategoryBreakdown(expenses);
  let topCategory: string | null = null;
  let highestAmount = 0;
  for (const [cat, amt] of Object.entries(breakdown)) {
    if (amt > highestAmount) {
      highestAmount = amt;
      topCategory = cat;
    }
  }

  let recommendation = `You have ₹${dailyAllowance} daily allowance for the next ${safeDaysRemaining} days.`;
  if (averageDailySpend > dailyAllowance * 1.3) {
    recommendation = `Warning: High daily burn rate (₹${averageDailySpend}/day). Cut non-essential spending in ${topCategory || 'general'} to prevent budget depletion in ${daysUntilDepletion} days.`;
  } else if (averageDailySpend <= dailyAllowance) {
    recommendation = `Great pacing! Current spending rate (₹${averageDailySpend}/day) is safely within your ₹${dailyAllowance} daily allowance.`;
  }

  return {
    dailyAllowance,
    averageDailySpend,
    projectedEndSpend,
    daysUntilDepletion,
    topCategory,
    recommendation,
  };
}
