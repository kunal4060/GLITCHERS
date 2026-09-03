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
          bg: 'rgba(244, 63, 94, 0.10)',
          text: '#FB7185',
          border: 'rgba(244, 63, 94, 0.25)',
          dot: '#FB7185',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.10)',
          text: '#FBBF24',
          border: 'rgba(245, 158, 11, 0.25)',
          dot: '#FBBF24',
        };
      case 'completed':
        return {
          bg: 'rgba(100, 116, 139, 0.12)',
          text: '#94A3B8',
          border: 'rgba(100, 116, 139, 0.20)',
          dot: null,
        };
      case 'ai':
        return {
          bg: 'rgba(139, 92, 246, 0.12)',
          text: '#C4B5FD',
          border: 'rgba(139, 92, 246, 0.25)',
          dot: '#A78BFA',
        };
      case 'safe':
        return {
          bg: 'rgba(16, 185, 129, 0.10)',
          text: '#34D399',
          border: 'rgba(16, 185, 129, 0.22)',
          dot: '#34D399',
        };
      case 'countdown':
      default:
        return {
          bg: 'rgba(59, 130, 246, 0.10)',
          text: '#60A5FA',
          border: 'rgba(59, 130, 246, 0.25)',
          dot: '#60A5FA',
        };
    }
  };

  const v = getVariantStyles();

  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }]}>
      {v.dot && <View style={[styles.pulsingDot, { backgroundColor: v.dot }]} />}
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
