import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { designTokens } from '../../theme/designTokens';

export type StatusVariant = 'live' | 'countdown' | 'completed' | 'urgent' | 'warning' | 'safe' | 'ai';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant = 'countdown' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'live':
        return {
          bg: 'rgba(16, 185, 129, 0.18)',
          text: '#10B981',
          border: 'rgba(16, 185, 129, 0.4)',
        };
      case 'urgent':
        return {
          bg: 'rgba(239, 68, 68, 0.18)',
          text: '#EF4444',
          border: 'rgba(239, 68, 68, 0.4)',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.18)',
          text: '#F59E0B',
          border: 'rgba(245, 158, 11, 0.4)',
        };
      case 'completed':
        return {
          bg: 'rgba(100, 116, 139, 0.18)',
          text: '#94A3B8',
          border: 'rgba(100, 116, 139, 0.3)',
        };
      case 'ai':
        return {
          bg: 'rgba(139, 92, 246, 0.18)',
          text: '#A78BFA',
          border: 'rgba(139, 92, 246, 0.4)',
        };
      case 'safe':
        return {
          bg: 'rgba(16, 185, 129, 0.14)',
          text: '#34D399',
          border: 'rgba(16, 185, 129, 0.3)',
        };
      case 'countdown':
      default:
        return {
          bg: 'rgba(59, 130, 246, 0.18)',
          text: '#60A5FA',
          border: 'rgba(59, 130, 246, 0.4)',
        };
    }
  };

  const v = getVariantStyles();

  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }]}>
      {variant === 'live' && <View style={styles.pulsingDot} />}
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radii.pill,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  label: {
    ...designTokens.typography.micro,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
