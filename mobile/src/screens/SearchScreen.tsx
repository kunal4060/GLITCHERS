import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';
import { useDashboardStore } from '../store/dashboardStore';

export const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CLASSES' | 'TASKS' | 'FINANCE' | 'EMAILS'>('ALL');

  const { classes, tasks, expenses, debts, emails } = useDashboardStore();

  const allItems = [
    ...classes.map((c) => ({
      id: `c_${c.id}`,
      category: 'CLASSES' as const,
      icon: '🗓',
      title: c.subjectName,
      subtitle: `${c.day} • ${c.startTime} - ${c.endTime} (Room ${c.room || 'TBD'})`,
    })),
    ...tasks.map((t) => ({
      id: `t_${t.id}`,
      category: 'TASKS' as const,
      icon: '✅',
      title: t.title,
      subtitle: `Priority: ${t.priority} • Status: ${t.status}`,
    })),
    ...expenses.map((e) => ({
      id: `e_${e.id}`,
      category: 'FINANCE' as const,
      icon: '💰',
      title: `₹${e.amount} — ${e.description}`,
      subtitle: `Category: ${e.category}`,
    })),
    ...debts.map((d) => ({
      id: `d_${d.id}`,
      category: 'FINANCE' as const,
      icon: '🤝',
      title: `${d.person}: ₹${d.amount} (${d.type === 'OWES_ME' ? 'Owes you' : 'You owe'})`,
      subtitle: `Status: ${d.status}`,
    })),
    ...emails.map((m) => ({
      id: `m_${m.id}`,
      category: 'EMAILS' as const,
      icon: '📧',
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
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search classes, tasks, expenses, debts, emails..."
          placeholderTextColor="#64748B"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
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

      {/* Results List */}
      <ScrollView style={styles.results} contentContainerStyle={styles.scrollPadding}>
        <Text style={styles.countText}>
          {filteredItems.length} {filteredItems.length === 1 ? 'RESULT' : 'RESULTS'} FOUND
        </Text>

        {filteredItems.map((item) => (
          <View key={item.id} style={styles.resultCard}>
            <Text style={styles.itemIcon}>{item.icon}</Text>
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 14, paddingVertical: 12 },
  clearBtn: { color: theme.colors.textMuted, fontSize: 16, padding: 4 },
  chipScroll: { maxHeight: 50, paddingHorizontal: 16, marginTop: 12 },
  chip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: 'bold' },
  chipTextActive: { color: '#0B0F19' },
  results: { flex: 1 },
  scrollPadding: { padding: 16, paddingBottom: 100 },
  countText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  itemIcon: { fontSize: 24, marginRight: 14 },
  itemDetails: { flex: 1 },
  categoryRow: { marginBottom: 2 },
  itemCategory: { fontSize: 9, fontWeight: 'bold', color: theme.colors.primary, letterSpacing: 0.5 },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  itemSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
});
