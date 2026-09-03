import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';

export const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CLASSES' | 'TASKS' | 'FINANCE' | 'EMAILS'>('ALL');

  const { classes, tasks, expenses, debts, emails } = useDashboardStore();

  const allItems = [
    ...classes.map((c) => ({
      id: `c_${c.id}`,
      category: 'CLASSES' as const,
      icon: 'calendar-outline' as const,
      title: c.subjectName,
      subtitle: `${c.day} • ${c.startTime} - ${c.endTime} (Room ${c.room || 'TBD'})`,
    })),
    ...tasks.map((t) => ({
      id: `t_${t.id}`,
      category: 'TASKS' as const,
      icon: 'checkbox-outline' as const,
      title: t.title,
      subtitle: `Priority: ${t.priority} • Status: ${t.status}`,
    })),
    ...expenses.map((e) => ({
      id: `e_${e.id}`,
      category: 'FINANCE' as const,
      icon: 'wallet-outline' as const,
      title: `₹${e.amount} — ${e.description}`,
      subtitle: `Category: ${e.category}`,
    })),
    ...debts.map((d) => ({
      id: `d_${d.id}`,
      category: 'FINANCE' as const,
      icon: 'git-branch-outline' as const,
      title: `${d.person}: ₹${d.amount} (${d.type === 'OWES_ME' ? 'Owes you' : 'You owe'})`,
      subtitle: `Status: ${d.status}`,
    })),
    ...emails.map((m) => ({
      id: `m_${m.id}`,
      category: 'EMAILS' as const,
      icon: 'mail-outline' as const,
      title: m.subject,
      subtitle: `From: ${m.sender} • Importance: ${m.importance}`,
    })),
  ];

  const filteredItems = allItems.filter((item) => {
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesQuery =
      !query.trim() ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={designTokens.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes, tasks, expenses, debts, emails..."
            placeholderTextColor="#8C9692"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={designTokens.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={{ height: 48, marginTop: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {(['ALL', 'CLASSES', 'TASKS', 'FINANCE', 'EMAILS'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, categoryFilter === cat && styles.chipActive]}
                onPress={() => setCategoryFilter(cat)}
              >
                <Text style={[styles.chipText, categoryFilter === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results List */}
        <ScrollView style={styles.results} contentContainerStyle={styles.scrollPadding}>
          <Text style={styles.countText}>
            {filteredItems.length} {filteredItems.length === 1 ? 'RESULT' : 'RESULTS'} FOUND
          </Text>

          {filteredItems.map((item) => (
            <View key={item.id} style={styles.resultCard}>
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={20} color={designTokens.colors.primaryDark} />
              </View>
              <View style={styles.itemDetails}>
                <View style={styles.categoryRow}>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                </View>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.10)',
    ...designTokens.shadows.card,
  },
  searchInput: {
    flex: 1,
    color: designTokens.colors.textPrimary,
    fontSize: 14,
    paddingVertical: 12,
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.08)',
  },
  chipActive: {
    backgroundColor: designTokens.colors.primaryPill,
    borderColor: designTokens.colors.primary,
  },
  chipText: { color: designTokens.colors.textSecondary, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: designTokens.colors.textPrimary },
  results: { flex: 1 },
  scrollPadding: { padding: 16, paddingBottom: 100 },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: designTokens.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radii.card,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.06)',
    ...designTokens.shadows.card,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: designTokens.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: { flex: 1 },
  categoryRow: { marginBottom: 2 },
  itemCategory: { fontSize: 9, fontWeight: '800', color: designTokens.colors.primaryDeep, letterSpacing: 0.5 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: designTokens.colors.textPrimary },
  itemSubtitle: { fontSize: 12, color: designTokens.colors.textSecondary, marginTop: 3 },
});
