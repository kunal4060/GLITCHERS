import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { GradientBackground } from '../components/common/GradientBackground';
import { useDashboardStore } from '../store/dashboardStore';

export const SearchScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
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
            placeholder="Ask Nia anything or search classes, tasks, finance..."
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
          {query.trim().length > 0 && (
            <TouchableOpacity
              style={styles.aiPromptCard}
              onPress={() => {
                navigation?.navigate('MainTabs', { screen: 'NIA' });
              }}
              activeOpacity={0.85}
            >
              <View style={styles.aiPromptIconCircle}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiPromptLabel}>ASK NIA AI ASSISTANT</Text>
                <Text style={styles.aiPromptQuery} numberOfLines={1}>"{query}"</Text>
              </View>
              <View style={styles.aiPromptArrowBtn}>
                <Text style={styles.aiPromptArrowText}>Ask</Text>
                <Ionicons name="arrow-forward" size={12} color="#006A63" />
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.countText}>
            {filteredItems.length} {filteredItems.length === 1 ? 'RESULT' : 'RESULTS'} FOUND
          </Text>

          {filteredItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.resultCard}
              activeOpacity={0.8}
              onPress={() => {
                if (!navigation) return;
                if (item.category === 'CLASSES') {
                  navigation.navigate('MainTabs', { screen: 'Timetable' });
                } else if (item.category === 'TASKS') {
                  navigation.navigate('MainTabs', { screen: 'Tasks' });
                } else if (item.category === 'FINANCE') {
                  navigation.navigate('MainTabs', { screen: 'Finance' });
                } else if (item.category === 'EMAILS') {
                  navigation.navigate('Email');
                }
              }}
            >
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
              <Ionicons name="chevron-forward" size={16} color="#76777D" style={{ alignSelf: 'center', marginLeft: 8 }} />
            </TouchableOpacity>
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
    borderColor: 'rgba(26, 28, 29, 0.08)',
    ...designTokens.shadows.card,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    paddingVertical: 12,
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
  },
  chipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: { color: '#76777D', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  results: { flex: 1 },
  scrollPadding: { padding: 16, paddingBottom: 100 },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#76777D',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    ...designTokens.shadows.card,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 106, 99, 0.25)',
    ...designTokens.shadows.card,
  },
  aiPromptIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#006A63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPromptLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#006A63',
    letterSpacing: 0.8,
  },
  aiPromptQuery: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  aiPromptArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  aiPromptArrowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006A63',
  },
  itemDetails: { flex: 1 },
  categoryRow: { marginBottom: 2 },
  itemCategory: { fontSize: 9, fontWeight: '800', color: '#006A63', letterSpacing: 0.5 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemSubtitle: { fontSize: 12, color: '#76777D', marginTop: 3 },
});
