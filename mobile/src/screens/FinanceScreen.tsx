import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { GradientBackground } from '../components/common/GradientBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDashboardStore } from '../store/dashboardStore';
import { apiClient } from '../api/client';
import type { Expense, Debt } from '@glitchers/shared';

export const FinanceScreen: React.FC = () => {
  const { expenses, budget, debts, addExpense, deleteExpense, markDebtPaid, splitExpense } = useDashboardStore();

  const [quickInput, setQuickInput] = useState('');
  const [previewExpense, setPreviewExpense] = useState<{ amount: number; description: string; category: Expense['category'] } | null>(null);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitAmount, setSplitAmount] = useState('');
  const [splitPerson, setSplitPerson] = useState('');
  const [splitDesc, setSplitDesc] = useState('');

  // Bill & Receipt Scanner State
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [scannedBillResult, setScannedBillResult] = useState<any | null>(null);

  const handleScanBill = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to upload a bill or receipt photo.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0] && res.assets[0].base64) {
        setIsScanningBill(true);
        try {
          const scanRes = await apiClient.scanBill(res.assets[0].base64, res.assets[0].mimeType || 'image/jpeg');
          if (scanRes && scanRes.success && scanRes.expense) {
            addExpense(scanRes.expense);
            setScannedBillResult(scanRes.parsed);
            Alert.alert(
              'Bill Scanned & Logged!',
              `Logged ₹${scanRes.parsed?.total || scanRes.expense.amount} from ${scanRes.parsed?.merchant || 'Merchant'} with ${scanRes.parsed?.items?.length || 1} item(s).`
            );
          } else {
            Alert.alert('Scan Result', 'Could not read receipt details from the photo.');
          }
        } catch {
          Alert.alert('Scan Error', 'Failed to analyze bill image. Please try another clear photo.');
        } finally {
          setIsScanningBill(false);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: designTokens.spacing.sm }}>
          <Ionicons name="sparkles" size={13} color={designTokens.colors.primary} />
          <Text style={styles.quickEntryTitle}>AI Quick Expense Entry</Text>
        </View>
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
            <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
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

      {/* 3b. Gemini AI Bill & Receipt Scanner Banner */}
      <TouchableOpacity
        style={styles.scanBillBanner}
        onPress={handleScanBill}
        disabled={isScanningBill}
        activeOpacity={0.8}
      >
        <View style={styles.scanBillLeft}>
          <View style={styles.scanBillIconCircle}>
            {isScanningBill ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="camera" size={20} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.scanBillTextCol}>
            <Text style={styles.scanBillTitle}>
              {isScanningBill ? 'Gemini is reading receipt items...' : 'Upload Bill Photo (Gemini AI)'}
            </Text>
            <Text style={styles.scanBillSub}>
              {isScanningBill ? 'Extracting merchant, prices & individual items' : 'Snap or pick bill to auto-add all items'}
            </Text>
          </View>
        </View>
        <View style={styles.scanBillBadge}>
          <Text style={styles.scanBillBadgeText}>AUTO-LOG</Text>
        </View>
      </TouchableOpacity>

      {/* Scanned Bill Breakdown Card */}
      {scannedBillResult && (
        <GlassCard variant="cream" style={styles.scannedResultCard}>
          <View style={styles.scannedHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scannedMerchant}>{scannedBillResult.merchant || 'Store Bill'}</Text>
              <Text style={styles.scannedSummary}>{scannedBillResult.summary || 'Itemized purchase'}</Text>
            </View>
            <TouchableOpacity onPress={() => setScannedBillResult(null)} style={styles.scannedCloseBtn}>
              <Ionicons name="close" size={16} color={designTokens.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.scannedItemsTable}>
            {scannedBillResult.items?.map((item: any, idx: number) => (
              <View key={idx} style={styles.scannedItemRow}>
                <Text style={styles.scannedItemName}>{item.name}</Text>
                <Text style={styles.scannedItemPrice}>₹{item.price}</Text>
              </View>
            ))}
          </View>

          <View style={styles.scannedTotalRow}>
            <Text style={styles.scannedTotalLabel}>Total Amount Logged</Text>
            <Text style={styles.scannedTotalValue}>₹{scannedBillResult.total}</Text>
          </View>

          <View style={styles.scannedSuccessBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#15803D" />
            <Text style={styles.scannedSuccessText}>All items logged into your Expense Tracker & Budget</Text>
          </View>
        </GlassCard>
      )}

      {/* 4. Borrow / Lend Ledger & Split Action */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Peer Debts & Splits</Text>
        <TouchableOpacity style={styles.splitBillBtn} onPress={() => setSplitModalVisible(true)}>
          <Ionicons name="git-branch-outline" size={13} color="#FFFFFF" />
          <Text style={styles.splitBillText}>Split Bill</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debtsRow}>
        <StatCard
          variant="teal"
          title="TO RECEIVE"
          value={`₹${toReceive.toLocaleString()}`}
          subtext="Friends owe you"
          icon={<Ionicons name="arrow-down-circle-outline" size={18} color={designTokens.colors.primaryDark} />}
          accentColor={designTokens.colors.primaryDark}
        />
        <View style={{ width: designTokens.spacing.md }} />
        <StatCard
          variant="peach"
          title="TO PAY"
          value={`₹${toPay.toLocaleString()}`}
          subtext="You owe friends"
          icon={<Ionicons name="arrow-up-circle-outline" size={18} color={designTokens.colors.accentPeachDot} />}
          accentColor={designTokens.colors.accentPeachDot}
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
      {expenses.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={32} color="#75A7A5" style={{ marginBottom: 6 }} />
          <Text style={styles.emptyTitle}>No Expenses Logged Yet</Text>
          <Text style={styles.emptySub}>
            Track your daily expenses using the quick log bar above or snap a receipt bill to auto-log items.
          </Text>
        </GlassCard>
      ) : (
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
      )}

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
    backgroundColor: '#FAF7F2',
    borderRadius: designTokens.radii.md,
    padding: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(117, 167, 165, 0.25)',
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
    backgroundColor: designTokens.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 2,
    borderRadius: designTokens.radii.pill,
  },
  splitBillText: { ...designTokens.typography.micro, color: '#FFFFFF', fontWeight: '700' },
  debtsRow: { flexDirection: 'row', marginBottom: designTokens.spacing.sm },
  debtListCard: { marginBottom: designTokens.spacing.md, padding: designTokens.spacing.md },
  debtItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xs + 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(41, 51, 50, 0.06)',
  },
  debtPerson: { ...designTokens.typography.cardTitle, fontSize: 13 },
  debtNotes: { ...designTokens.typography.micro, color: designTokens.colors.textMuted },
  debtRight: { alignItems: 'flex-end', gap: 4 },
  debtAmount: { ...designTokens.typography.cardTitle, fontSize: 14 },
  textSuccess: { color: designTokens.colors.primaryDark },
  textDanger: { color: designTokens.colors.accentPeachDot },
  settleBtn: {
    backgroundColor: designTokens.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: designTokens.radii.pill,
  },
  settleText: { ...designTokens.typography.micro, color: designTokens.colors.primaryDeep, fontWeight: '700' },
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
    backgroundColor: '#E6E0D4',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    backgroundColor: designTokens.colors.primary,
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
  txAmount: { ...designTokens.typography.cardTitle, fontSize: 14, color: designTokens.colors.textPrimary },
  txDelete: { color: designTokens.colors.textMuted, fontSize: 14, padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(35, 45, 43, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: designTokens.radii.xl,
    borderTopRightRadius: designTokens.radii.xl,
    padding: designTokens.spacing.xl,
    paddingBottom: 36,
    gap: designTokens.spacing.md,
  },
  modalTitle: { ...designTokens.typography.sectionTitle, fontSize: 18, marginBottom: designTokens.spacing.xs },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    color: designTokens.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.10)',
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

  // Gemini Bill Scanner Styles
  scanBillBanner: {
    backgroundColor: '#324846',
    borderRadius: designTokens.radii.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  scanBillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  scanBillIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBillTextCol: {
    flex: 1,
  },
  scanBillTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  scanBillSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#D4E2DF',
  },
  scanBillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: designTokens.radii.pill,
  },
  scanBillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scannedResultCard: {
    padding: 16,
    marginBottom: designTokens.spacing.lg,
    borderRadius: designTokens.radii.card,
  },
  scannedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scannedMerchant: {
    fontSize: 16,
    fontWeight: '800',
    color: designTokens.colors.textPrimary,
  },
  scannedSummary: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  scannedCloseBtn: {
    padding: 4,
  },
  scannedItemsTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.md,
    padding: 10,
    marginBottom: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  scannedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannedItemName: {
    fontSize: 13,
    color: designTokens.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  scannedItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: designTokens.colors.primaryDark,
  },
  scannedTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 51, 50, 0.1)',
    marginBottom: 8,
  },
  scannedTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
  },
  scannedTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: designTokens.colors.primaryDark,
  },
  scannedSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: designTokens.radii.pill,
  },
  scannedSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: designTokens.radii.card,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
