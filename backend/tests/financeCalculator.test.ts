import {
  calculateTotalSpent,
  calculateCategoryBreakdown,
  calculateBudgetStatus,
  calculateDebtTotals,
  calculateEqualSplit,
  calculateBurnRateForecast,
} from '../src/services/finance/calculator.js';
import type { Expense, Budget, Debt } from '@glitchers/shared';

describe('Finance Calculator & Deterministic Math', () => {
  const sampleExpenses: Expense[] = [
    {
      id: '1',
      userId: 'u1',
      amount: 200,
      category: 'FOOD',
      description: 'Biryani',
      date: new Date().toISOString(),
      type: 'EXPENSE',
    },
    {
      id: '2',
      userId: 'u1',
      amount: 100,
      category: 'FOOD',
      description: 'Chai & snacks',
      date: new Date().toISOString(),
      type: 'EXPENSE',
    },
    {
      id: '3',
      userId: 'u1',
      amount: 50,
      category: 'TRANSPORT',
      description: 'Metro ticket',
      date: new Date().toISOString(),
      type: 'EXPENSE',
    },
  ];

  test('calculateTotalSpent returns exact sum of expenses', () => {
    const total = calculateTotalSpent(sampleExpenses);
    expect(total).toBe(350);
  });

  test('calculateCategoryBreakdown groups by category correctly', () => {
    const breakdown = calculateCategoryBreakdown(sampleExpenses);
    expect(breakdown).toEqual({
      FOOD: 300,
      TRANSPORT: 50,
    });
  });

  test('calculateBudgetStatus triggers 75% warning and 100% exceeded thresholds', () => {
    const budget: Budget = {
      id: 'b1',
      userId: 'u1',
      monthlyLimit: 400,
      currentSpending: 0,
      month: '2026-09',
      alertThresholds: [75, 90, 100],
    };

    // 350 / 400 = 87.5% -> WARNING_75
    const status = calculateBudgetStatus(budget, sampleExpenses);
    expect(status.totalSpent).toBe(350);
    expect(status.remaining).toBe(50);
    expect(status.percentageUsed).toBe(88);
    expect(status.alertLevel).toBe('WARNING_75');
    expect(status.isOverBudget).toBe(false);

    // Over budget test: 500 / 400 = 125% -> EXCEEDED_100
    const overBudgetExpenses = [
      ...sampleExpenses,
      {
        id: '4',
        userId: 'u1',
        amount: 150,
        category: 'SHOPPING' as const,
        description: 'Shirt',
        date: new Date().toISOString(),
        type: 'EXPENSE' as const,
      },
    ];
    const overStatus = calculateBudgetStatus(budget, overBudgetExpenses);
    expect(overStatus.totalSpent).toBe(500);
    expect(overStatus.remaining).toBe(0);
    expect(overStatus.isOverBudget).toBe(true);
    expect(overStatus.alertLevel).toBe('EXCEEDED_100');
  });

  test('calculateDebtTotals separates owes me vs i owe', () => {
    const debts: Debt[] = [
      {
        id: 'd1',
        userId: 'u1',
        person: 'Rahul',
        type: 'OWES_ME',
        amount: 500,
        status: 'PENDING',
        paidAmount: 100,
      },
      {
        id: 'd2',
        userId: 'u1',
        person: 'Aman',
        type: 'I_OWE',
        amount: 200,
        status: 'PENDING',
        paidAmount: 0,
      },
    ];

    const totals = calculateDebtTotals(debts);
    expect(totals.toReceive).toBe(400); // 500 - 100
    expect(totals.toPay).toBe(200);
  });

  test('calculateEqualSplit divides total equally rounded to cents', () => {
    const share = calculateEqualSplit(900, 3);
    expect(share).toBe(300);

    const shareWithCents = calculateEqualSplit(100, 3);
    expect(shareWithCents).toBe(33.33);
  });

  test('calculateBurnRateForecast projects daily runway accurately', () => {
    const budget: Budget = {
      id: 'b1',
      userId: 'u1',
      monthlyLimit: 10000,
      currentSpending: 0,
      month: '2026-09',
      alertThresholds: [75, 90, 100],
    };
    const expenses: Expense[] = [
      {
        id: 'e1',
        userId: 'u1',
        amount: 3000,
        category: 'FOOD',
        description: 'Hostel mess bill',
        date: new Date().toISOString(),
        type: 'EXPENSE',
      },
    ];

    // 10 days passed, 20 days left: spent 3000 -> avg 300/day. remaining 7000 / 20 = 350 daily allowance
    const forecast = calculateBurnRateForecast(budget, expenses, 10, 20);
    expect(forecast.dailyAllowance).toBe(350);
    expect(forecast.averageDailySpend).toBe(300);
    expect(forecast.projectedEndSpend).toBe(9000);
    expect(forecast.topCategory).toBe('FOOD');
    expect(forecast.recommendation).toContain('Great pacing');
  });
});
