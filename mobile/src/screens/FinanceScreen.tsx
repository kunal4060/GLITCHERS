import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';
import type { Expense, Debt } from '@glitchers/shared';

export const FinanceScreen: React.FC = () => {
  const { expenses, budget, debts, addExpense, deleteExpense, markDebtPaid, splitExpense } = useDashboardStore();

  const [quickInput, setQuickInput] = useState('');
  const [previewExpense, setPreviewExpense] = useState<{ amount: number; description: string; category: Expense['category'] } | null>(null);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitAmount, setSplitAmount] = useState('');
  const [splitPerson, setSplitPerson] = useState('');
  const [splitDesc, setSplitDesc] = useState('');

  // Calculations
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthlyLimit = budget?.monthlyLimit || 10000;
  const remaining = Math.max(0, monthlyLimit - totalSpent);
  const progressPct = Math.min(100, Math.round((totalSpent / monthlyLimit) * 100));

  // Category breakdown
  const categoryTotals: Record<string, number> = {
    FOOD: 0,
    TRANSPORT: 0,
    EDUCATION: 0,
    SHOPPING: 0,
    OTHER: 0,
  };
  expenses.forEach((e) => {
    const cat = categoryTotals[e.category] !== undefined ? e.category : 'OTHER';
    categoryTotals[cat] += Number(e.amount);
  });

  // Debts
  const toReceive = debts
    .filter((d) => d.type === 'OWES_ME' && d.status === 'PENDING')
    .reduce((sum, d) => sum + Number(d.amount - d.paidAmount), 0);
  const toPay = debts
    .filter((d) => d.type === 'I_OWE' && d.status === 'PENDING')
    .reduce((sum, d) => sum + Number(d.amount - d.paidAmount), 0);

  // Quick entry parser
  const handleQuickAddPress = () => {
    if (!quickInput.trim()) return;
    const match = quickInput.match(/(\d+(?:\.\d{1,2})?)/);
    const amount = match ? parseFloat(match[1]) : 150;
    const lower = quickInput.toLowerCase();
    let category: Expense['category'] = 'OTHER';
    if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('canteen') || lower.includes('coffee') || lower.includes('tea') || lower.includes('biryani')) {
      category = 'FOOD';
    } else if (lower.includes('auto') || lower.includes('cab') || lower.includes('bus') || lower.includes('metro') || lower.includes('travel')) {
      category = 'TRANSPORT';
    } else if (lower.includes('book') || lower.includes('print') || lower.includes('xerox') || lower.includes('course') || lower.includes('fee')) {
      category = 'EDUCATION';
    } else if (lower.includes('shirt') || lower.includes('shopping') || lower.includes('clothes')) {
      category = 'SHOPPING';
    }

    const desc = quickInput.replace(/\d+/g, '').replace(/spent|paid|rs|rupees|on|for/gi, '').trim() || 'Expense';
    setPreviewExpense({ amount, description: desc, category });
  };

  const handleConfirmQuickExpense = () => {
    if (!previewExpense) return;
    const newExp: Expense = {
      id: String(Date.now()),
      userId: 'u1',
      amount: previewExpense.amount,
      category: previewExpense.category,
      description: previewExpense.description,
      date: new Date().toISOString(),
      type: 'EXPENSE',
    };
    addExpense(newExp);
    setPreviewExpense(null);
    setQuickInput('');
    Alert.alert('Recorded', `₹${newExp.amount} logged under ${newExp.category}.`);
  };

  const handleSplitBillSubmit = () => {
    const amt = parseFloat(splitAmount);
    if (!amt || !splitPerson.trim()) {
      Alert.alert('Error', 'Please enter amount and friend name');
      return;
    }
    splitExpense(amt, splitDesc.trim() || 'Dinner / Bill', splitPerson.trim());
    setSplitAmount('');
    setSplitPerson('');
    setSplitDesc('');
    setSplitModalVisible(false);
    Alert.alert('Bill Split', `Split ₹${amt}: recorded your share & ${splitPerson} owes ₹${Math.round(amt / 2)}.`);
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Header: Balance & Spending */}
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceLabel}>REMAINING ALLOWANCE</Text>
        <Text style={styles.balanceNumber}>₹{remaining.toLocaleString()}</Text>
        <Text style={styles.balanceSub}>Safe daily burn: ₹{Math.round(remaining / 27)}/day</Text>
      </View>

      {/* 2. Monthly Budget Progress Card */}
      <GlassCard elevated style={styles.budgetCard}>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Monthly Budget</Text>
          <Text style={styles.budgetRatio}>
            ₹{totalSpent.toLocaleString()} <Text style={styles.budgetTotal}>/ ₹{monthlyLimit.toLocaleString()}</Text>
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        <Text style={styles.progressSubtext}>{progressPct}% of monthly allowance used</Text>
      </GlassCard>

      {/* 3. AI Quick Entry Bar */}
      <GlassCard style={styles.quickEntryCard}>
        <Text style={styles.quickEntryTitle}>AI Quick Expense Entry</Text>
        <View style={styles.quickEntryRow}>
          <TextInput
            style={styles.quickInput}
            placeholder="Spent ₹180 on dinner..."
            placeholderTextColor="#64748B"
            value={quickInput}
            onChangeText={setQuickInput}
            onSubmitEditing={handleQuickAddPress}
          />
          <TouchableOpacity
            style={[styles.quickAddBtn, !quickInput.trim() && { opacity: 0.5 }]}
            onPress={handleQuickAddPress}
            disabled={!quickInput.trim()}
          >
            <Text style={styles.quickAddText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Confirmation Preview */}
        {previewExpense && (
          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Confirm Expense</Text>
              <Text style={styles.previewAmount}>₹{previewExpense.amount}</Text>
            </View>
            <Text style={styles.previewDesc}>{previewExpense.description} • {previewExpense.category}</Text>
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setPreviewExpense(null)}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmQuickExpense}
              >
                <Text style={styles.confirmBtnText}>Confirm & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </GlassCard>

      {/* 4. Borrow / Lend Ledger & Split Action */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Peer Debts & Splits</Text>
        <TouchableOpacity style={styles.splitBillBtn} onPress={() => setSplitModalVisible(true)}>
          <Text style={styles.splitBillText}>⚡ Split Bill</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debtsRow}>
        <StatCard
          label="TO RECEIVE"
          value={`₹${toReceive.toLocaleString()}`}
          subtext="Friends owe you"
          accentColor={designTokens.colors.success}
        />
        <View style={{ width: designTokens.spacing.md }} />
        <StatCard
          label="TO PAY"
          value={`₹${toPay.toLocaleString()}`}
          subtext="You owe friends"
          accentColor={designTokens.colors.danger}
        />
      </View>

      {debts.length > 0 && (
        <GlassCard style={styles.debtListCard}>
          {debts.slice(0, 3).map((d) => (
            <View key={d.id} style={styles.debtItemRow}>
              <View>
                <Text style={styles.debtPerson}>{d.person}</Text>
                <Text style={styles.debtNotes}>{d.notes || (d.type === 'OWES_ME' ? 'Owes you' : 'You owe')}</Text>
              </View>
              <View style={styles.debtRight}>
                <Text
                  style={[
                    styles.debtAmount,
                    d.type === 'OWES_ME' ? styles.textSuccess : styles.textDanger,
                  ]}
                >
                  {d.type === 'OWES_ME' ? `+₹${d.amount}` : `-₹${d.amount}`}
                </Text>
                {d.status === 'PENDING' && (
                  <TouchableOpacity
                    style={styles.settleBtn}
                    onPress={() => markDebtPaid(d.id)}
                  >
                    <Text style={styles.settleText}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </GlassCard>
      )}

      {/* 5. Spending Breakdown by Category */}
      <Text style={[styles.sectionTitle, { marginTop: designTokens.spacing.lg }]}>Category Distribution</Text>
      <GlassCard style={styles.breakdownCard}>
        {Object.entries(categoryTotals).map(([cat, amt]) => {
          const catPct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
          return (
            <View key={cat} style={styles.categoryRow}>
              <View style={styles.catLabelRow}>
                <Text style={styles.catName}>{cat}</Text>
                <Text style={styles.catAmount}>₹{amt.toLocaleString()} ({catPct}%)</Text>
              </View>
              <View style={styles.catBarTrack}>
                <View style={[styles.catBarFill, { width: `${catPct}%` }]} />
              </View>
            </View>
          );
        })}
      </GlassCard>

      {/* 6. Recent Transactions */}
      <Text style={[styles.sectionTitle, { marginTop: designTokens.spacing.lg }]}>Recent Transactions</Text>
      <View style={styles.txList}>
        {expenses.slice(0, 5).map((e) => (
          <GlassCard key={e.id} style={styles.txCard}>
            <View style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txDesc}>{e.description}</Text>
                <Text style={styles.txCat}>{e.category} • Today</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>₹{Number(e.amount).toLocaleString()}</Text>
                <TouchableOpacity onPress={() => deleteExpense(e.id)}>
                  <Text style={styles.txDelete}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        ))}
      </View>

      {/* Split Bill Modal */}
      <Modal visible={splitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Split Bill Equally</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Total Amount (₹)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={splitAmount}
              onChangeText={setSplitAmount}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Friend Name (e.g. Rahul)"
              placeholderTextColor="#64748B"
              value={splitPerson}
              onChangeText={setSplitPerson}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description (e.g. Dinner at Domino's)"
              placeholderTextColor="#64748B"
              value={splitDesc}
              onChangeText={setSplitDesc}
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSplitModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSplitBillSubmit}>
                <Text style={styles.modalSaveText}>Split & Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  </GradientBackground>
);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: designTokens.spacing.lg, paddingBottom: 110 },
  balanceHeader: {
    alignItems: 'center',
    marginVertical: designTokens.spacing.md,
  },
  balanceLabel: {
    ...designTokens.typography.label,
    letterSpacing: 1,
  },
  balanceNumber: {
    ...designTokens.typography.displayNumber,
    fontSize: 36,
    color: '#60A5FA',
    marginVertical: 4,
  },
  balanceSub: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
  },
  budgetCard: {
    marginBottom: designTokens.spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  budgetLabel: { ...designTokens.typography.cardTitle, fontSize: 14 },
  budgetRatio: { ...designTokens.typography.cardTitle, fontSize: 14, color: '#FFFFFF' },
  budgetTotal: { color: designTokens.colors.textMuted },
  progressTrack: {
    height: 7,
    backgroundColor: designTokens.colors.surfaceSubtle,
    borderRadius: 3.5,
    overflow: 'hidden',
    marginBottom: designTokens.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: designTokens.colors.primary,
    borderRadius: 3.5,
  },
  progressSubtext: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary },
  quickEntryCard: {
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  quickEntryTitle: { ...designTokens.typography.label, marginBottom: designTokens.spacing.sm },
  quickEntryRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  quickInput: {
    flex: 1,
    backgroundColor: designTokens.colors.surfaceElevated,
    borderRadius: designTokens.radii.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm + 2,
    color: designTokens.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
  },
  quickAddBtn: {
    backgroundColor: designTokens.colors.primary,
    paddingHorizontal: designTokens.spacing.lg,
    justifyContent: 'center',
    borderRadius: designTokens.radii.md,
  },
  quickAddText: { ...designTokens.typography.cardTitle, fontSize: 13, color: '#FFFFFF' },
  previewBox: {
    marginTop: designTokens.spacing.md,
    backgroundColor: designTokens.colors.surfaceElevated,
    borderRadius: designTokens.radii.md,
    padding: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorderActive,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewTitle: { ...designTokens.typography.cardTitle, fontSize: 13 },
  previewAmount: { ...designTokens.typography.cardTitle, fontSize: 16, color: designTokens.colors.success },
  previewDesc: { ...designTokens.typography.body, marginTop: 2, marginBottom: designTokens.spacing.sm },
  previewActions: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  editBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.surfaceSubtle,
    paddingVertical: 6,
    borderRadius: designTokens.radii.sm,
    alignItems: 'center',
  },
  editBtnText: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary, fontWeight: '700' },
  confirmBtn: {
    flex: 2,
    backgroundColor: designTokens.colors.primary,
    paddingVertical: 6,
    borderRadius: designTokens.radii.sm,
    alignItems: 'center',
  },
  confirmBtnText: { ...designTokens.typography.micro, color: '#FFFFFF', fontWeight: '800' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  sectionTitle: { ...designTokens.typography.sectionTitle, fontSize: 15 },
  splitBillBtn: {
    backgroundColor: designTokens.colors.surfaceElevated,
    paddingHorizontal: designTokens.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
  },
  splitBillText: { ...designTokens.typography.micro, color: '#60A5FA', fontWeight: '700' },
  debtsRow: { flexDirection: 'row', marginBottom: designTokens.spacing.sm },
  debtListCard: { marginBottom: designTokens.spacing.md, padding: designTokens.spacing.md },
  debtItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  debtPerson: { ...designTokens.typography.cardTitle, fontSize: 13 },
  debtNotes: { ...designTokens.typography.micro, color: designTokens.colors.textMuted },
  debtRight: { alignItems: 'flex-end', gap: 4 },
  debtAmount: { ...designTokens.typography.cardTitle, fontSize: 14 },
  textSuccess: { color: designTokens.colors.success },
  textDanger: { color: designTokens.colors.danger },
  settleBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: designTokens.radii.xs,
  },
  settleText: { ...designTokens.typography.micro, color: designTokens.colors.success, fontWeight: '700' },
  breakdownCard: {
    marginTop: designTokens.spacing.sm,
    gap: designTokens.spacing.md,
  },
  categoryRow: { gap: 4 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { ...designTokens.typography.bodyMedium, fontSize: 12 },
  catAmount: { ...designTokens.typography.micro, color: designTokens.colors.textSecondary },
  catBarTrack: {
    height: 5,
    backgroundColor: designTokens.colors.surfaceSubtle,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
    borderRadius: 2.5,
  },
  txList: {
    marginTop: designTokens.spacing.sm,
    gap: designTokens.spacing.sm,
  },
  txCard: {
    padding: designTokens.spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: { flex: 1 },
  txDesc: { ...designTokens.typography.cardTitle, fontSize: 13 },
  txCat: { ...designTokens.typography.micro, color: designTokens.colors.textMuted, marginTop: 2 },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md },
  txAmount: { ...designTokens.typography.cardTitle, fontSize: 14, color: '#FFFFFF' },
  txDelete: { color: designTokens.colors.textMuted, fontSize: 14, padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: designTokens.colors.surfaceCard,
    borderTopLeftRadius: designTokens.radii.xl,
    borderTopRightRadius: designTokens.radii.xl,
    padding: designTokens.spacing.xl,
    paddingBottom: 36,
    gap: designTokens.spacing.md,
  },
  modalTitle: { ...designTokens.typography.sectionTitle, fontSize: 18, marginBottom: designTokens.spacing.xs },
  modalInput: {
    backgroundColor: designTokens.colors.surfaceElevated,
    borderRadius: designTokens.radii.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    color: designTokens.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.surfaceSubtle,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  modalCancelText: { ...designTokens.typography.cardTitle, fontSize: 13, color: designTokens.colors.textSecondary },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.primary,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  modalSaveText: { ...designTokens.typography.cardTitle, fontSize: 13, color: '#FFFFFF' },
});
