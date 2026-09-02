import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useDashboardStore } from '../store/dashboardStore';
import type { Expense, Debt } from '@glitchers/shared';

export const FinanceScreen: React.FC = () => {
  const { expenses, budget, debts, addExpense, addDebt, markDebtPaid } = useDashboardStore();
  const [expenseInput, setExpenseInput] = useState('');
  const [splitAmount, setSplitAmount] = useState('');
  const [splitCount, setSplitCount] = useState('3');

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = budget ? Math.max(0, budget.monthlyLimit - totalSpent) : 0;

  const handleAddExpense = () => {
    if (!expenseInput.trim()) return;

    // Extract amount
    const amountMatch = expenseInput.match(/(\d+)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;

    let category: Expense['category'] = 'OTHER';
    const lower = expenseInput.toLowerCase();
    if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('canteen')) {
      category = 'FOOD';
    } else if (lower.includes('auto') || lower.includes('cab') || lower.includes('transport')) {
      category = 'TRANSPORT';
    }

    const newExp: Expense = {
      id: String(Date.now()),
      userId: 'u1',
      amount,
      category,
      description: expenseInput.replace(/\d+/g, '').trim() || 'General Expense',
      date: new Date().toISOString(),
      type: 'EXPENSE',
    };

    addExpense(newExp);
    setExpenseInput('');
  };

  const handleSplitBill = () => {
    const total = parseFloat(splitAmount);
    const count = parseInt(splitCount, 10);
    if (!total || count < 2) {
      Alert.alert('Invalid Input', 'Please enter a valid bill amount and at least 2 people.');
      return;
    }

    const share = Math.round((total / count) * 100) / 100;
    const newDebt: Debt = {
      id: String(Date.now()),
      userId: 'u1',
      person: 'Hostel Friends',
      type: 'OWES_ME',
      amount: share * (count - 1),
      status: 'PENDING',
      paidAmount: 0,
      notes: `Bill Split: ₹${total} among ${count} people (My share: ₹${share})`,
    };

    addDebt(newDebt);
    Alert.alert('Expense Split Added', `Each person's share is ₹${share}. Recorded ₹${newDebt.amount} to receive.`);
    setSplitAmount('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Natural Language Expense Input Bar */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          placeholder="Speak or type: 'Spent 180 on dinner'..."
          placeholderTextColor="#64748B"
          value={expenseInput}
          onChangeText={setExpenseInput}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddExpense}>
          <Text style={styles.addBtnText}>+ Record</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Budget Summary */}
      <View style={styles.budgetCard}>
        <Text style={styles.cardHeader}>MONTHLY BUDGET STATUS</Text>
        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.budgetSub}>Total Spent</Text>
            <Text style={styles.budgetVal}>₹{totalSpent}</Text>
          </View>
          <View>
            <Text style={styles.budgetSub}>Remaining</Text>
            <Text style={styles.budgetRemain}>₹{remaining}</Text>
          </View>
          <View>
            <Text style={styles.budgetSub}>Monthly Limit</Text>
            <Text style={styles.budgetVal}>₹{budget?.monthlyLimit || 10000}</Text>
          </View>
        </View>
      </View>

      {/* Borrow / Lend Tracker */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>BORROW / LEND TRACKER</Text>
        {debts.map((d) => (
          <View key={d.id} style={styles.debtItem}>
            <View>
              <Text style={styles.debtPerson}>{d.person}</Text>
              <Text style={styles.debtType}>
                {d.type === 'OWES_ME' ? '🟢 Owes you' : '🔴 You owe'} • Status: {d.status}
              </Text>
              {d.notes && <Text style={styles.debtNotes}>{d.notes}</Text>}
            </View>
            <View style={styles.debtActionCol}>
              <Text style={styles.debtAmount}>₹{d.amount}</Text>
              {d.status !== 'PAID' && d.id && (
                <TouchableOpacity style={styles.payBtn} onPress={() => markDebtPaid(d.id!)}>
                  <Text style={styles.payBtnText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Shared Expense Splitter */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>🍕 SPLIT BILL WITH FRIENDS</Text>
        <View style={styles.splitCard}>
          <View style={styles.splitInputRow}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Total Bill (e.g. 900)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={splitAmount}
              onChangeText={setSplitAmount}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              placeholder="People"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={splitCount}
              onChangeText={setSplitCount}
            />
          </View>
          <TouchableOpacity style={styles.splitBtn} onPress={handleSplitBill}>
            <Text style={styles.splitBtnText}>Calculate & Record Split</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Expense History */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>RECENT EXPENSES</Text>
        {expenses.map((exp) => (
          <View key={exp.id} style={styles.expenseItem}>
            <View>
              <Text style={styles.expDesc}>{exp.description}</Text>
              <Text style={styles.expCat}>{exp.category}</Text>
            </View>
            <Text style={styles.expAmt}>₹{exp.amount}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16, paddingBottom: 100 },
  inputCard: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 6, marginBottom: 16 },
  input: { flex: 1, color: '#F8FAFC', paddingHorizontal: 12, fontSize: 13, backgroundColor: '#0F172A', borderRadius: 8 },
  addBtn: { backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  budgetCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 20 },
  cardHeader: { fontSize: 11, fontWeight: 'bold', color: '#64748B', letterSpacing: 1, marginBottom: 12 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetSub: { fontSize: 11, color: '#94A3B8' },
  budgetVal: { fontSize: 16, fontWeight: 'bold', color: '#F8FAFC', marginTop: 2 },
  budgetRemain: { fontSize: 16, fontWeight: 'bold', color: '#10B981', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionHeader: { fontSize: 12, fontWeight: 'bold', color: '#64748B', letterSpacing: 1, marginBottom: 10 },
  debtItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  debtPerson: { fontSize: 15, fontWeight: 'bold', color: '#F8FAFC' },
  debtType: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  debtNotes: { fontSize: 11, color: '#64748B', marginTop: 2 },
  debtActionCol: { alignItems: 'flex-end' },
  debtAmount: { fontSize: 16, fontWeight: 'bold', color: '#38BDF8' },
  payBtn: { backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  payBtnText: { color: '#38BDF8', fontSize: 10, fontWeight: 'bold' },
  splitCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12 },
  splitInputRow: { flexDirection: 'row', marginBottom: 10 },
  splitBtn: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 12, alignItems: 'center' },
  splitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  expDesc: { fontSize: 14, fontWeight: '600', color: '#F8FAFC' },
  expCat: { fontSize: 11, color: '#64748B', marginTop: 2 },
  expAmt: { fontSize: 15, fontWeight: 'bold', color: '#38BDF8' },
});
