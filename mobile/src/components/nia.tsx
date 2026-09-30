import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore } from '../store/dashboardStore';

const C = designTokens.colors;
const T = designTokens.typography;

/** Obsidian rounded-square NEXA mark with a spark. */
export const NiaMark: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      backgroundColor: C.obsidian,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.5, letterSpacing: -0.5 }}>
      N
    </Text>
    <View style={{ position: 'absolute', right: size * 0.14, top: size * 0.14 }}>
      <Ionicons name="sparkles" size={size * 0.22} color={C.eucalyptus} />
    </View>
  </View>
);

/** Circular user avatar; falls back to the bundled default. Opens Account on tap. */
export const NiaAvatar: React.FC<{ size?: number; navigation?: any }> = ({ size = 40, navigation }) => {
  const { avatarUrl } = useDashboardStore();
  const source = avatarUrl
    ? { uri: avatarUrl }
    : require('../../assets/default_avatar.jpg');
  return (
    <TouchableOpacity
      onPress={() => navigation?.navigate('Account')}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Open profile and account"
    >
      <Image source={source} style={{ width: size, height: size, borderRadius: size / 2 }} />
    </TouchableOpacity>
  );
};

interface NiaHeaderProps {
  title: string;
  navigation?: any;
}

/** Standard screen header: mark + NEXA ACADEMIC / title + avatar. */
export const NiaHeader: React.FC<NiaHeaderProps> = ({ title, navigation }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <NiaMark size={40} />
      <View>
        <Text style={styles.brandKicker}>NEXA ACADEMIC</Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </View>
    <NiaAvatar navigation={navigation} />
  </View>
);

/** 10px uppercase micro-label. */
export const LabelCaps: React.FC<{ children: React.ReactNode; color?: string; style?: any }> = ({
  children,
  color,
  style,
}) => (
  <Text style={[T.labelCaps, color ? { color } : null, style]}>{children}</Text>
);

/** Small rounded status pill. */
export const StatusPill: React.FC<{
  label: string;
  tone?: 'success' | 'danger' | 'neutral' | 'dark' | 'info';
  style?: any;
}> = ({ label, tone = 'neutral', style }) => {
  const tones: Record<string, { bg: string; fg: string }> = {
    success: { bg: C.eucalyptusSoft, fg: C.eucalyptus },
    danger: { bg: C.terracottaSoft, fg: C.terracotta },
    neutral: { bg: '#F1F1F4', fg: C.textSecondary },
    dark: { bg: C.obsidian, fg: '#FFFFFF' },
    info: { bg: 'rgba(79,70,229,0.08)', fg: C.creditsBadge },
  };
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

/** White hairline card. */
export const NiaCard: React.FC<{ children: React.ReactNode; style?: any; dark?: boolean }> = ({
  children,
  style,
  dark,
}) => (
  <View
    style={[
      styles.card,
      dark && { backgroundColor: C.darkCard, borderColor: 'rgba(255,255,255,0.08)' },
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandKicker: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: C.textMuted,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.3,
    marginTop: 1,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.hairline,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
});
