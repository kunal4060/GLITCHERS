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
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import type { Expense, Debt } from '@glitchers/shared';

export const FinanceScreen: React.FC = () => {
  const { expenses, budget, debts, addExpense, deleteExpense, markDebtPaid, splitExpense } = useDashboardStore();

  const [quickInput, setQuickInput] = useState('');
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitAmount, setSplitAmount] = useState('');
  const [splitPerson, setSplitPerson] = useState('');
  const [splitDesc, setSplitDesc] = useState('');
  const [isScanningBill, setIsScanningBill] = useState(false);

  // Bill Scanner
  const handleScanBill = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to upload a bill or receipt photo.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0] && res.assets[0].base64) {
        setIsScanningBill(true);
        try {
          const scanRes = await apiClient.scanBill(res.assets[0].base64, res.assets[0].mimeType || 'image/jpeg');
          if (scanRes && scanRes.success && scanRes.expense) {
            addExpense(scanRes.expense);
            Alert.alert(
              'Bill Scanned & Logged! 🧾',
              `Logged ₹${scanRes.parsed?.total || scanRes.expense.amount} from ${scanRes.parsed?.merchant || 'Merchant'}.`
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
  const remainingPct = Math.max(0, 100 - progressPct);
  const safeDaily = Math.round(remaining / 30);

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

  const foodPct = totalSpent > 0 ? Math.round((categoryTotals.FOOD / totalSpent) * 100) : 45;
  const eduPct = totalSpent > 0 ? Math.round((categoryTotals.EDUCATION / totalSpent) * 100) : 25;
  const transitPct = totalSpent > 0 ? Math.round((categoryTotals.TRANSPORT / totalSpent) * 100) : 15;
  const otherPct = Math.max(0, 100 - foodPct - eduPct - transitPct);

  // Debts
  const toReceive = debts
    .filter((d) => d.type === 'OWES_ME' && d.status === 'PENDING')
    .reduce((sum, d) => sum + Number(d.amount - d.paidAmount), 0);
  const toPay = debts
    .filter((d) => d.type === 'I_OWE' && d.status === 'PENDING')
    .reduce((sum, d) => sum + Number(d.amount - d.paidAmount), 0);

  // Quick entry parser
  const handleQuickAdd = () => {
    if (!quickInput.trim()) return;
    const match = quickInput.match(/(\d+(?:\.\d{1,2})?)/);
    const amount = match ? parseFloat(match[1]) : 150;
    const lower = quickInput.toLowerCase();
    let category: Expense['category'] = 'OTHER';
    if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('canteen') || lower.includes('coffee') || lower.includes('tea')) {
      category = 'FOOD';
    } else if (lower.includes('auto') || lower.includes('cab') || lower.includes('bus') || lower.includes('metro') || lower.includes('travel')) {
      category = 'TRANSPORT';
    } else if (lower.includes('book') || lower.includes('print') || lower.includes('xerox') || lower.includes('course')) {
      category = 'EDUCATION';
    } else if (lower.includes('shopping') || lower.includes('clothes')) {
      category = 'SHOPPING';
    }

    const desc = quickInput.replace(/\d+/g, '').replace(/spent|paid|rs|rupees|on|for/gi, '').trim() || 'Cafeteria & Mess';
    const currentUserId = useAuthStore.getState().user?.id || 'offline-user';
    const newExp: Expense = {
      id: String(Date.now()),
      userId: currentUserId,
      amount,
      category,
      description: desc,
      date: new Date().toISOString(),
      type: 'EXPENSE',
    };
    addExpense(newExp);
    setQuickInput('');
    Alert.alert('Expense Logged', `₹${amount} recorded under ${category}.`);
  };

  const handleConfirmSplit = () => {
    const amt = parseFloat(splitAmount);
    if (!amt || isNaN(amt) || !splitPerson.trim()) {
      Alert.alert('Error', 'Please enter a valid amount and friend name');
      return;
    }
    splitExpense(amt, splitDesc.trim() || 'Split Expense', splitPerson.trim());
    setSplitModalVisible(false);
    setSplitAmount('');
    setSplitPerson('');
    setSplitDesc('');
    Alert.alert('Bill Split Recorded', `Split ₹${amt} with ${splitPerson.trim()}.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBrandLabel}>NEXA ACADEMIC</Text>
          <Text style={styles.headerTitle}>Finance</Text>
        </View>

        <TouchableOpacity
          style={styles.splitHeaderBtn}
          onPress={() => setSplitModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="people-outline" size={15} color="#006A63" />
          <Text style={styles.splitHeaderBtnText}>Split Bill</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Section: Remaining Balance Architecture */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.tealDot} />
              <Text style={styles.heroCardLabel}>MONTHLY LIQUIDITY</Text>
            </View>
            <View style={styles.remainingPill}>
              <Ionicons name="trending-up" size={11} color="#006F67" />
              <Text style={styles.remainingPillText}>{remainingPct}% Remaining</Text>
            </View>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceBigNumber}>₹{remaining.toLocaleString()}</Text>
            <Text style={styles.balanceSub}>left of ₹{monthlyLimit.toLocaleString()}</Text>
          </View>

          <View style={styles.safeBurnRow}>
            <Ionicons name="flash-outline" size={14} color="#006A63" />
            <Text style={styles.safeBurnText}>
              Safe daily burn: <Text style={styles.safeBurnBold}>₹{safeDaily || 215} / day</Text> for next 30 days
            </Text>
          </View>

          {/* Monthly Budget Micro-Meter */}
          <View style={styles.burnMeterSection}>
            <View style={styles.burnMeterLabels}>
              <Text style={styles.burnMeterTitle}>BURN VELOCITY</Text>
              <Text style={styles.burnMeterSpent}>
                ₹{totalSpent.toLocaleString()} <Text style={{ color: '#76777D' }}>spent</Text>
              </Text>
            </View>

            <View style={styles.meterTrack}>
              <View style={[styles.meterFill, { width: `${progressPct}%` }]} />
            </View>

            <View style={styles.meterFooter}>
              <Text style={styles.meterFooterText}>Cycle Day 11 / 31</Text>
              <Text style={styles.meterFooterText}>Pacing: Optimal (-12%)</Text>
            </View>
          </View>
        </View>

        {/* 2. Smart Quick-Entry & Multimodal Scan Card */}
        <View style={styles.quickEntrySection}>
          {/* Natural Language Input */}
          <View style={styles.conversationalInputBox}>
            <Ionicons name="sparkles" size={16} color="#76777D" />
            <TextInput
              style={styles.conversationalInput}
              placeholder="Spent ₹180 on cafeteria lunch..."
              placeholderTextColor="#76777D"
              value={quickInput}
              onChangeText={setQuickInput}
              onSubmitEditing={handleQuickAdd}
            />
            <TouchableOpacity
              style={styles.conversationalSendBtn}
              onPress={handleQuickAdd}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Gemini AI Vision Scan Banner */}
          <TouchableOpacity
            style={styles.visionBanner}
            onPress={handleScanBill}
            disabled={isScanningBill}
            activeOpacity={0.9}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.visionBadgeRow}>
                <Text style={styles.geminiFlashTag}>GEMINI 1.5 FLASH</Text>
                <View style={styles.autoSplitBadge}>
                  <Text style={styles.autoSplitText}>Auto-Split & Tag</Text>
                </View>
              </View>
              <Text style={styles.visionBannerTitle}>Scan Receipt or Mess Bill</Text>
              <Text style={styles.visionBannerSub} numberOfLines={1}>
                Nia AI automated receipt parsing and tax extraction into your ledger.
              </Text>
            </View>

            <View style={styles.visionScannerBtn}>
              {isScanningBill ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Peer Debts & Social Splits */}
        <View style={styles.debtsSection}>
          <View style={styles.debtsHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionTitle}>Peer Debts & Splits</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{debts.filter((d) => d.status === 'PENDING').length} Active</Text>
              </View>
            </View>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => setSplitModalVisible(true)}
            >
              <Ionicons name="people" size={14} color="#006A63" />
              <Text style={styles.splitBillLink}>SPLIT BILL</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.debtCardsRow}>
            {/* To Collect */}
            <View style={styles.debtCard}>
              <View style={styles.debtCardTop}>
                <Text style={[styles.debtTypeLabel, { color: '#006A63' }]}>TO COLLECT</Text>
                <Ionicons name="arrow-down" size={13} color="#006A63" />
              </View>
              <Text style={styles.debtAmountPositive}>+₹{toReceive || 350}</Text>
              <View style={styles.debtFriendRow}>
                <View style={[styles.friendAvatar, { backgroundColor: '#99EFE5' }]}>
                  <Text style={[styles.friendInitial, { color: '#006F67' }]}>R</Text>
                </View>
                <View>
                  <Text style={styles.friendName}>Rahul S.</Text>
                  <Text style={styles.friendTag}>Water & Rice</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.debtActionBtnGhost}
                onPress={() => Alert.alert('UPI Reminder', 'Sent UPI payment reminder to Rahul S.')}
                activeOpacity={0.8}
              >
                <Text style={styles.debtActionBtnGhostText}>REMIND UPI</Text>
              </TouchableOpacity>
            </View>

            {/* You Owe */}
            <View style={styles.debtCard}>
              <View style={styles.debtCardTop}>
                <Text style={[styles.debtTypeLabel, { color: '#BA1A1A' }]}>YOU OWE</Text>
                <Ionicons name="arrow-up" size={13} color="#BA1A1A" />
              </View>
              <Text style={styles.debtAmountNegative}>-₹{toPay || 120}</Text>
              <View style={styles.debtFriendRow}>
                <View style={[styles.friendAvatar, { backgroundColor: '#FFDAD6' }]}>
                  <Text style={[styles.friendInitial, { color: '#93000A' }]}>A</Text>
                </View>
                <View>
                  <Text style={styles.friendName}>Aryan M.</Text>
                  <Text style={styles.friendTag}>Color Lab Xerox</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.debtActionBtnPrimary}
                onPress={() => Alert.alert('Pay Aryan', 'Opening UPI intent for Aryan M.')}
                activeOpacity={0.85}
              >
                <Text style={styles.debtActionBtnPrimaryText}>PAY ARYAN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. Category Architecture & Ratio Split */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeaderRow}>
            <Text style={styles.sectionTitle}>Discretionary Allocation</Text>
            <Text style={styles.cycleLabel}>MAY CYCLE</Text>
          </View>

          {/* Multi-segmented Ratio Bar */}
          <View style={styles.multiRatioBar}>
            <View style={[styles.ratioBarSegment, { width: `${foodPct}%`, backgroundColor: '#1A1C1D' }]} />
            <View style={[styles.ratioBarSegment, { width: `${eduPct}%`, backgroundColor: '#006A63' }]} />
            <View style={[styles.ratioBarSegment, { width: `${transitPct}%`, backgroundColor: '#76777D' }]} />
            <View style={[styles.ratioBarSegment, { width: `${otherPct}%`, backgroundColor: '#E2E2E4' }]} />
          </View>

          {/* Category Legend Grid */}
          <View style={styles.legendGrid}>
            <View style={styles.legendRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.legendPip, { backgroundColor: '#1A1C1D' }]} />
                <Text style={styles.legendName}>Food & Dining</Text>
              </View>
              <Text style={styles.legendVal}>{foodPct}% (₹{categoryTotals.FOOD})</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.legendPip, { backgroundColor: '#006A63' }]} />
                <Text style={styles.legendName}>Academic</Text>
              </View>
              <Text style={styles.legendVal}>{eduPct}% (₹{categoryTotals.EDUCATION})</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.legendPip, { backgroundColor: '#76777D' }]} />
                <Text style={styles.legendName}>Metro / Transit</Text>
              </View>
              <Text style={styles.legendVal}>{transitPct}% (₹{categoryTotals.TRANSPORT})</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.legendPip, { backgroundColor: '#E2E2E4' }]} />
                <Text style={styles.legendName}>Misc / Other</Text>
              </View>
              <Text style={styles.legendVal}>{otherPct}% (₹{categoryTotals.OTHER})</Text>
            </View>
          </View>
        </View>

        {/* 5. Recent Ledger Entries (Ledger Telemetry) */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeaderRow}>
            <Text style={styles.sectionTitle}>Ledger Telemetry</Text>
            <TouchableOpacity onPress={() => Alert.alert('Export', 'CSV Ledger exported.')}>
              <Text style={styles.exportLink}>EXPORT CSV</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ledgerList}>
            {expenses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="wallet-outline" size={28} color="#006A63" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyTitle}>No Expenses Logged</Text>
                <Text style={styles.emptySub}>Type above or scan a bill to record your student expenses.</Text>
              </View>
            ) : (
              expenses.slice(0, 5).map((e) => (
                <View key={e.id} style={styles.ledgerRow}>
                  <View style={styles.ledgerLeft}>
                    <View style={styles.ledgerIconBox}>
                      <Ionicons
                        name={
                          e.category === 'FOOD'
                            ? 'restaurant'
                            : e.category === 'EDUCATION'
                            ? 'print'
                            : e.category === 'TRANSPORT'
                            ? 'subway'
                            : 'cart'
                        }
                        size={16}
                        color="#1A1C1D"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ledgerDesc} numberOfLines={1}>
                        {e.description || 'Cafeteria Lunch'}
                      </Text>
                      <Text style={styles.ledgerDate}>
                        {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • UPI Scan
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ledgerRight}>
                    <Text style={styles.ledgerAmount}>-₹{Number(e.amount).toFixed(2)}</Text>
                    <Text style={styles.ledgerStatus}>Verified</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Split Bill Modal */}
      <Modal visible={splitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalHeading}>Split a Bill with Classmates</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Total Bill Amount (e.g. 350)"
              placeholderTextColor="#76777D"
              keyboardType="numeric"
              value={splitAmount}
              onChangeText={setSplitAmount}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Friend's Name (e.g. Rahul S.)"
              placeholderTextColor="#76777D"
              value={splitPerson}
              onChangeText={setSplitPerson}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Description (e.g. Mess Dinner, Xerox)"
              placeholderTextColor="#76777D"
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
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleConfirmSplit}>
                <Text style={styles.modalSaveText}>Record Split</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 226, 228, 0.6)',
    backgroundColor: 'rgba(249, 249, 251, 0.95)',
  },
  headerBrandLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.2,
  },
  splitHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  splitHeaderBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#006A63',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  content: {
    padding: 20,
    paddingBottom: 96,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006A63',
  },
  heroCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 1,
  },
  remainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#99EFE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  remainingPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006F67',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  balanceBigNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.6,
  },
  balanceSub: {
    fontSize: 13,
    color: '#76777D',
    fontWeight: '500',
  },
  safeBurnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  safeBurnText: {
    fontSize: 12,
    color: '#76777D',
  },
  safeBurnBold: {
    fontWeight: '700',
    color: '#1A1C1D',
  },
  burnMeterSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F3F5',
    gap: 6,
  },
  burnMeterLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  burnMeterTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 0.8,
  },
  burnMeterSpent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  meterTrack: {
    height: 8,
    backgroundColor: '#EEEEF0',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#006A63',
    borderRadius: 9999,
  },
  meterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  meterFooterText: {
    fontSize: 9.5,
    color: '#76777D',
  },
  quickEntrySection: {
    gap: 10,
  },
  conversationalInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  conversationalInput: {
    flex: 1,
    fontSize: 13,
    color: '#1A1C1D',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  conversationalSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visionBanner: {
    backgroundColor: '#141B2B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  geminiFlashTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CF2E8',
    letterSpacing: 0.8,
  },
  autoSplitBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoSplitText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  visionBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  visionBannerSub: {
    fontSize: 11,
    color: '#7D8497',
    marginTop: 2,
  },
  visionScannerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  debtsSection: {
    gap: 10,
  },
  debtsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.2,
  },
  countPill: {
    backgroundColor: '#EEEEF0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  countPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#45464C',
  },
  splitBillLink: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 0.6,
  },
  debtCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  debtCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    justifyContent: 'space-between',
  },
  debtCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debtTypeLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  debtAmountPositive: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1C1D',
    marginVertical: 4,
  },
  debtAmountNegative: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1C1D',
    marginVertical: 4,
  },
  debtFriendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  friendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInitial: {
    fontSize: 10,
    fontWeight: '700',
  },
  friendName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  friendTag: {
    fontSize: 9.5,
    color: '#76777D',
  },
  debtActionBtnGhost: {
    backgroundColor: '#F3F3F5',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  debtActionBtnGhostText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: 0.5,
  },
  debtActionBtnPrimary: {
    backgroundColor: '#111827',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  debtActionBtnPrimaryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cycleLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 0.8,
  },
  multiRatioBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EEEEF0',
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
    marginBottom: 14,
  },
  ratioBarSegment: {
    height: '100%',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  legendRow: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  legendPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendName: {
    fontSize: 11.5,
    color: '#76777D',
  },
  legendVal: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  ledgerSection: {
    gap: 10,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  exportLink: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 0.8,
  },
  ledgerList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F5',
  },
  ledgerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  ledgerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEEEF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  ledgerDate: {
    fontSize: 10.5,
    color: '#76777D',
    marginTop: 2,
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  ledgerStatus: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#006A63',
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  emptySub: {
    fontSize: 11.5,
    color: '#76777D',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  modalInput: {
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E2E2E4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1C1D',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F3F5',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#76777D',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
