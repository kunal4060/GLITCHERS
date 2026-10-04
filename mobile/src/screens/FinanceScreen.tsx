import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore, splitShare } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { newUuid } from '../utils/tokenStorage';
import { NiaHeader, LabelCaps, StatusPill, NiaCard } from '../components/nia';
import { monthCycleLabel, inr, timeAgo } from '../utils/niaFormat';

const C = designTokens.colors;

const CATS = ['FOOD', 'TRANSPORT', 'EDUCATION', 'SHOPPING', 'OTHER'] as const;

const CAT_META: Record<string, { icon: string; bg: string }> = {
  FOOD: { icon: 'fast-food-outline', bg: '#FEF3C7' },
  TRANSPORT: { icon: 'car-outline', bg: '#E0E7FF' },
  EDUCATION: { icon: 'book-outline', bg: '#D1FAE5' },
  SHOPPING: { icon: 'bag-outline', bg: '#FCE7F3' },
  OTHER: { icon: 'pricetag-outline', bg: '#F1F5F9' },
};

function catColor(cat: string): string {
  return cat === 'FOOD'
    ? '#D97706'
    : cat === 'TRANSPORT'
    ? '#4F46E5'
    : cat === 'EDUCATION'
    ? C.eucalyptus
    : cat === 'SHOPPING'
    ? C.terracotta
    : C.textSecondary;
}

export const FinanceScreen = ({ navigation }: { navigation?: any }) => {
  const {
    expenses,
    budget,
    debts,
    addExpense,
    deleteExpense,
    markDebtPaid,
    splitExpense,
  } = useDashboardStore();

  const [quickInput, setQuickInput] = useState('');
  const [preview, setPreview] = useState<{ amount: number; description: string; category: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [budgetVisible, setBudgetVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [splitVisible, setSplitVisible] = useState(false);
  const [splitAmount, setSplitAmount] = useState('');
  const [splitPerson, setSplitPerson] = useState('');
  const [splitDesc, setSplitDesc] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCat, setFormCat] = useState<string>('FOOD');
  const [submitting, setSubmitting] = useState(false);

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  // M25: no phantom default — a fresh user who never set a budget sees an explicit empty state.
  const monthlyLimit = budget?.monthlyLimit ?? null;
  const remaining = monthlyLimit !== null ? Math.max(0, monthlyLimit - totalSpent) : null;
  const progressPct = monthlyLimit ? Math.min(100, Math.round((totalSpent / monthlyLimit) * 100)) : 0;

  const categoryTotals: Record<string, number> = { FOOD: 0, TRANSPORT: 0, EDUCATION: 0, SHOPPING: 0, OTHER: 0 };
  expenses.forEach((e) => {
    const cat = categoryTotals[e.category] !== undefined ? e.category : 'OTHER';
    categoryTotals[cat] += Number(e.amount);
  });

  const topCategory = CATS.reduce((a, b) => (categoryTotals[a] >= categoryTotals[b] ? a : b));

  const toReceive = debts
    .filter((d) => d.type === 'OWES_ME' && d.status === 'PENDING')
    .reduce((s, d) => s + Number(d.amount - (d.paidAmount || 0)), 0);
  const toPay = debts
    .filter((d) => d.type === 'I_OWE' && d.status === 'PENDING')
    .reduce((s, d) => s + Number(d.amount - (d.paidAmount || 0)), 0);

  const pendingDebts = debts.filter((d) => d.status === 'PENDING').slice(0, 3);

  // ---- scan receipt ----
  const handleScan = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow gallery access to scan a receipt.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.base64) {
        setScanning(true);
        try {
          const scanRes = await apiClient.scanBill(res.assets[0].base64, res.assets[0].mimeType || 'image/jpeg');
          if (scanRes && scanRes.success && scanRes.expense) {
            addExpense(scanRes.expense, { skipRemote: true });
            Alert.alert(
              'Bill scanned & logged',
              `Logged ${inr(Number(scanRes.parsed?.total || scanRes.expense.amount))} from ${
                scanRes.parsed?.merchant || 'merchant'
              }.`
            );
          } else {
            Alert.alert('Scan result', 'Could not read receipt details from the photo.');
          }
        } catch {
          Alert.alert('Scan error', 'Failed to analyze the image. Try a clearer photo.');
        } finally {
          setScanning(false);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not open the image picker.');
    }
  };

  // ---- quick add ----
  const handleQuickAdd = () => {
    if (!quickInput.trim()) return;
    const match = quickInput.replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
    const amount = match ? parseFloat(match[1]) : 150;
    const lower = quickInput.toLowerCase();
    let category = 'OTHER';
    if (/(food|dinner|lunch|canteen|coffee|tea|biryani|snack)/.test(lower)) category = 'FOOD';
    else if (/(auto|cab|bus|metro|travel|uber|ola)/.test(lower)) category = 'TRANSPORT';
    else if (/(book|print|xerox|course|fee|stationery)/.test(lower)) category = 'EDUCATION';
    else if (/(shirt|shopping|clothes|shoes|amazon)/.test(lower)) category = 'SHOPPING';
    const desc =
      quickInput
        .replace(/\d+/g, '')
        .replace(/spent|paid|rs|rupees|on|for/gi, '')
        .trim() || 'Expense';
    setPreview({ amount, description: desc, category });
  };

  const confirmQuickAdd = () => {
    if (!preview || submitting) return;
    setSubmitting(true);
    addExpense({
      id: newUuid(),
      userId: useAuthStore.getState().user?.id || 'offline-user',
      amount: preview.amount,
      category: preview.category as any,
      description: preview.description,
      date: new Date().toISOString(),
      type: 'EXPENSE',
    } as any);
    setPreview(null);
    setQuickInput('');
    Alert.alert('Recorded', `${inr(preview.amount)} logged under ${preview.category}.`);
    setSubmitting(false);
  };

  const submitManualAdd = () => {
    if (submitting) return;
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    addExpense({
      id: newUuid(),
      userId: useAuthStore.getState().user?.id || 'offline-user',
      amount: amt,
      category: formCat as any,
      description: formDesc.trim() || 'Expense',
      date: new Date().toISOString(),
      type: 'EXPENSE',
    } as any);
    setFormAmount('');
    setFormDesc('');
    setFormCat('FOOD');
    setAddVisible(false);
    Alert.alert('Recorded', `${inr(amt)} logged under ${formCat}.`);
    setSubmitting(false);
  };

  const submitSplit = () => {
    if (submitting) return;
    const amt = parseFloat(splitAmount);
    if (!amt || amt <= 0 || !splitPerson.trim()) {
      Alert.alert('Missing info', 'Enter a valid amount and the friend’s name.');
      return;
    }
    setSubmitting(true);
    splitExpense(amt, splitDesc.trim() || 'Shared bill', splitPerson.trim());
    setSplitAmount('');
    setSplitPerson('');
    setSplitDesc('');
    setSplitVisible(false);
    Alert.alert('Bill split', `Split ${inr(amt)} — ${splitPerson.trim()} owes ${inr(splitShare(amt))}.`);
    setSubmitting(false);
  };

  const handleSetBudget = () => {
    const v = parseFloat(budgetInput);
    if (!v || v <= 0) {
      Alert.alert('Invalid budget', 'Enter a monthly budget amount.');
      return;
    }
    useDashboardStore.getState().setBudget({
      id: newUuid(),
      userId: useAuthStore.getState().user?.id || 'offline-user',
      monthlyLimit: v,
      month: new Date().toISOString().slice(0, 7),
    } as any);
    setBudgetInput('');
    setBudgetVisible(false);
    Alert.alert('Budget updated', `Monthly budget set to ${inr(v)}.`);
  };

  const barColor = progressPct >= 90 ? C.terracotta : progressPct >= 70 ? '#F59E0B' : C.eucalyptus;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <NiaHeader title="Finance" navigation={navigation} />

          <Text style={styles.title}>Finance</Text>
          <Text style={styles.sub}>Track every rupee, stay on budget</Text>

          {/* Budget card */}
          <NiaCard dark style={styles.budgetCard}>
            {monthlyLimit !== null ? (
              <>
                <View style={styles.budgetTop}>
                  <View>
                    <LabelCaps color="rgba(255,255,255,0.6)">Monthly Budget</LabelCaps>
                    <Text style={styles.budgetTotal}>{inr(monthlyLimit)}</Text>
                    <Text style={styles.budgetCycle}>{monthCycleLabel()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setBudgetInput(String(monthlyLimit)); setBudgetVisible(true); }} activeOpacity={0.7}>
                    <View style={styles.editBadge}>
                      <Ionicons name="pencil-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.editText}>EDIT</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${progressPct}%`, backgroundColor: barColor }]} />
                </View>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetStat}>Spent <Text style={styles.budgetStatBold}>{inr(totalSpent)}</Text></Text>
                  <Text style={styles.budgetStat}>Left <Text style={styles.budgetStatBold}>{inr(remaining ?? 0)}</Text></Text>
                  <Text style={styles.budgetPct}>{progressPct}%</Text>
                </View>
              </>
            ) : (
              <View style={styles.budgetTop}>
                <View>
                  <LabelCaps color="rgba(255,255,255,0.6)">Monthly Budget</LabelCaps>
                  <Text style={styles.budgetTotal}>Not set</Text>
                  <Text style={styles.budgetCycle}>Set a monthly limit to track spending</Text>
                </View>
                <TouchableOpacity onPress={() => { setBudgetInput(''); setBudgetVisible(true); }} activeOpacity={0.7}>
                  <View style={styles.editBadge}>
                    <Ionicons name="add-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.editText}>SET</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </NiaCard>

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setAddVisible(true)} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={20} color={C.obsidian} />
              <Text style={styles.actionText}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleScan} disabled={scanning} activeOpacity={0.85}>
              {scanning ? (
                <ActivityIndicator size="small" color={C.obsidian} />
              ) : (
                <Ionicons name="scan-outline" size={20} color={C.obsidian} />
              )}
              <Text style={styles.actionText}>Scan Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setSplitVisible(true)} activeOpacity={0.85}>
              <Ionicons name="people-outline" size={20} color={C.obsidian} />
              <Text style={styles.actionText}>Split Bill</Text>
            </TouchableOpacity>
          </View>

          {/* Quick add */}
          <View style={styles.quickRow}>
            <TextInput
              style={styles.quickInput}
              placeholder="Quick add — e.g. '450 dinner at canteen'"
              placeholderTextColor={C.textSubtle}
              value={quickInput}
              onChangeText={setQuickInput}
              onSubmitEditing={handleQuickAdd}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.quickGo} onPress={handleQuickAdd} activeOpacity={0.8}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {preview && (
            <View style={styles.previewRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewText}>
                  {inr(preview.amount)} • {preview.description}
                </Text>
                <Text style={styles.previewCat}>{preview.category}</Text>
              </View>
              <TouchableOpacity style={styles.previewYes} onPress={confirmQuickAdd} activeOpacity={0.8} disabled={submitting}>
                <Text style={styles.previewYesText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPreview(null)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Category breakdown */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>This Month</Text>
            <LabelCaps>{monthCycleLabel()}</LabelCaps>
          </View>
          <NiaCard style={styles.catCard}>
            {CATS.map((cat) => {
              const amt = categoryTotals[cat];
              const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
              const meta = CAT_META[cat];
              return (
                <View key={cat} style={styles.catRow}>
                  <View style={[styles.catIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={16} color={catColor(cat)} />
                  </View>
                  <View style={styles.catMain}>
                    <View style={styles.catTop}>
                      <Text style={styles.catName}>{cat[0] + cat.slice(1).toLowerCase()}</Text>
                      <Text style={styles.catAmt}>{inr(amt)}</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: catColor(cat) }]} />
                    </View>
                  </View>
                  <Text style={styles.catPct}>{pct}%</Text>
                </View>
              );
            })}
          </NiaCard>

          {/* Recent transactions */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <LabelCaps>{expenses.length} entries</LabelCaps>
          </View>
          {expenses.length === 0 ? (
            <NiaCard>
              <Text style={styles.emptyText}>No expenses yet. Log your first one above.</Text>
            </NiaCard>
          ) : (
            expenses.slice(0, 8).map((e) => {
              const meta = CAT_META[e.category] || CAT_META.OTHER;
              return (
                <View key={e.id} style={styles.txRow}>
                  <View style={[styles.catIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={16} color={catColor(e.category)} />
                  </View>
                  <View style={styles.taskMain}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{e.description || 'Expense'}</Text>
                    <Text style={styles.taskDesc}>
                      {(e.category || 'OTHER')}{e.date ? ` • ${timeAgo(e.date)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.txAmt}>-{inr(Number(e.amount))}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Delete expense', `Remove "${e.description}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(e.id) },
                      ]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={C.textSubtle} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {/* Splits & debts */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Splits & Debts</Text>
            <LabelCaps>Shared bills</LabelCaps>
          </View>
          <View style={styles.debtRow}>
            <NiaCard style={styles.debtCard}>
              <LabelCaps>You get</LabelCaps>
              <Text style={[styles.debtAmt, { color: C.eucalyptus }]}>{inr(toReceive)}</Text>
            </NiaCard>
            <NiaCard style={styles.debtCard}>
              <LabelCaps>You owe</LabelCaps>
              <Text style={[styles.debtAmt, { color: C.terracotta }]}>{inr(toPay)}</Text>
            </NiaCard>
          </View>
          {pendingDebts.map((d) => (
            <View key={d.id} style={styles.txRow}>
              <View style={styles.debtIcon}>
                <Ionicons
                  name={d.type === 'OWES_ME' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                  size={18}
                  color={d.type === 'OWES_ME' ? C.eucalyptus : C.terracotta}
                />
              </View>
              <View style={styles.taskMain}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {d.type === 'OWES_ME' ? `${d.person} owes you` : `You owe ${d.person}`}
                </Text>
                <Text style={styles.taskDesc}>{d.notes || 'Shared expense'}</Text>
              </View>
              <Text style={styles.txAmt}>{inr(Number(d.amount - (d.paidAmount || 0)))}</Text>
              <TouchableOpacity
                style={styles.settleBtn}
                onPress={() => {
                  Alert.alert('Mark settled', `Mark this debt with ${d.person} as settled?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Settled', onPress: () => markDebtPaid(d.id) },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.settleText}>Settle</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Add expense modal */}
        <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setAddVisible(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <LabelCaps style={styles.sheetLabel}>Add Expense</LabelCaps>
              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput style={styles.input} placeholder="450" placeholderTextColor={C.textSubtle} value={formAmount} onChangeText={setFormAmount} keyboardType="decimal-pad" />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={styles.input} placeholder="e.g. Dinner at canteen" placeholderTextColor={C.textSubtle} value={formDesc} onChangeText={setFormDesc} />
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.prioRow}>
                {CATS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.prioPill, formCat === c && styles.prioPillActive]}
                    onPress={() => setFormCat(c)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.prioText, formCat === c && styles.prioTextActive]}>
                      {c[0] + c.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.5 }]} onPress={submitManualAdd} activeOpacity={0.85} disabled={submitting}>
                <Text style={styles.saveBtnText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Budget modal */}
        <Modal visible={budgetVisible} transparent animationType="fade" onRequestClose={() => setBudgetVisible(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setBudgetVisible(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <LabelCaps style={styles.sheetLabel}>Monthly Budget</LabelCaps>
              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput style={styles.input} placeholder="10000" placeholderTextColor={C.textSubtle} value={budgetInput} onChangeText={setBudgetInput} keyboardType="decimal-pad" />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSetBudget} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Save Budget</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Split modal */}
        <Modal visible={splitVisible} transparent animationType="slide" onRequestClose={() => setSplitVisible(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSplitVisible(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <LabelCaps style={styles.sheetLabel}>Split a Bill</LabelCaps>
              <Text style={styles.fieldLabel}>Total amount (₹)</Text>
              <TextInput style={styles.input} placeholder="900" placeholderTextColor={C.textSubtle} value={splitAmount} onChangeText={setSplitAmount} keyboardType="decimal-pad" />
              <Text style={styles.fieldLabel}>With whom?</Text>
              <TextInput style={styles.input} placeholder="e.g. Rahul" placeholderTextColor={C.textSubtle} value={splitPerson} onChangeText={setSplitPerson} />
              <Text style={styles.fieldLabel}>Note</Text>
              <TextInput style={styles.input} placeholder="e.g. Pizza night" placeholderTextColor={C.textSubtle} value={splitDesc} onChangeText={setSplitDesc} />
              <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.5 }]} onPress={submitSplit} activeOpacity={0.85} disabled={submitting}>
                <Text style={styles.saveBtnText}>Split Evenly</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  content: { paddingBottom: 120 },
  title: { fontSize: 27, fontWeight: '700', color: C.ink, letterSpacing: -0.6, paddingHorizontal: 20 },
  sub: { fontSize: 12, color: C.textMuted, paddingHorizontal: 20, marginTop: 4, marginBottom: 14 },
  budgetCard: { marginHorizontal: 20, marginBottom: 14, padding: 18 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  budgetTotal: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.8, marginTop: 4 },
  budgetCycle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8, marginTop: 4 },
  editBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  editText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.6 },
  barBg: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', marginBottom: 12, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  budgetStat: { fontSize: 12.5, color: 'rgba(255,255,255,0.65)' },
  budgetStatBold: { fontWeight: '700', color: '#FFFFFF' },
  budgetPct: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF', marginLeft: 'auto' },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline, borderRadius: 14, paddingVertical: 13,
  },
  actionText: { fontSize: 12, fontWeight: '700', color: C.ink },
  quickRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  quickInput: {
    flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.hairline,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: C.ink,
  },
  quickGo: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.obsidian, alignItems: 'center', justifyContent: 'center' },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 8,
    backgroundColor: C.eucalyptusFaint, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#A7F3D0',
  },
  previewText: { fontSize: 14, fontWeight: '700', color: C.ink },
  previewCat: { fontSize: 11, color: C.eucalyptus, fontWeight: '700', marginTop: 2 },
  previewYes: { backgroundColor: C.eucalyptus, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  previewYesText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10, marginTop: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  catCard: { marginHorizontal: 20, marginBottom: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  catIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  catMain: { flex: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catName: { fontSize: 13.5, fontWeight: '600', color: C.ink },
  catAmt: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  catBarBg: { height: 6, borderRadius: 3, backgroundColor: '#F1F1F4', overflow: 'hidden' },
  catBarFill: { height: 6, borderRadius: 3 },
  catPct: { fontSize: 11.5, fontWeight: '700', color: C.textMuted, width: 36, textAlign: 'right' },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: C.hairline,
    padding: 13, marginHorizontal: 20, marginBottom: 8,
  },
  taskMain: { flex: 1 },
  taskTitle: { fontSize: 14.5, fontWeight: '600', color: C.ink },
  taskDesc: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '700', color: C.ink },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 8 },
  debtRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  debtCard: { flex: 1 },
  debtAmt: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginTop: 6 },
  debtIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.porcelain,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.hairline,
  },
  settleBtn: { backgroundColor: C.obsidian, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  settleText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '92%' },
  sheetLabel: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.6, marginBottom: 6, marginTop: 10, textTransform: 'uppercase' },
  input: {
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.ink,
  },
  prioRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  prioPill: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: C.porcelain, borderWidth: 1, borderColor: C.hairline,
  },
  prioPillActive: { backgroundColor: C.obsidian, borderColor: C.obsidian },
  prioText: { fontSize: 11.5, fontWeight: '700', color: C.textSecondary },
  prioTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: C.obsidian, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
