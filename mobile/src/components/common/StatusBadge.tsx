import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { designTokens } from '../../theme/designTokens';

export type StatusVariant =
  | 'live'
  | 'countdown'
  | 'completed'
  | 'urgent'
  | 'extremely_important'
  | 'high'
  | 'warning'
  | 'safe'
  | 'ai';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant = 'countdown' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'extremely_important':
      case 'urgent':
        return {
          bg: designTokens.colors.accentWine, // #8A2E3B
          text: '#FFFFFF',
          border: 'transparent',
          dot: null,
          uppercase: true,
        };
      case 'high':
      case 'warning':
        return {
          bg: designTokens.colors.accentPeachDot, // #D4856A
          text: '#FFFFFF',
          border: 'transparent',
          dot: null,
          uppercase: true,
        };
      case 'countdown':
        return {
          bg: 'rgba(0, 0, 0, 0.22)',
          text: '#FFFFFF',
          border: 'transparent',
          dot: designTokens.colors.accentPeach, // #E8AD8E
          uppercase: false,
        };
      case 'live':
        return {
          bg: 'rgba(107, 158, 130, 0.16)',
          text: '#3D6852',
          border: 'rgba(107, 158, 130, 0.3)',
          dot: '#4F7D66',
          uppercase: false,
        };
      case 'safe':
        return {
          bg: designTokens.colors.primarySoft,
          text: designTokens.colors.primaryDeep,
          border: 'rgba(117, 167, 165, 0.25)',
          dot: designTokens.colors.primary,
          uppercase: false,
        };
      case 'ai':
        return {
          bg: designTokens.colors.accentPeachCard,
          text: designTokens.colors.accentPeachDeep,
          border: 'rgba(200, 142, 114, 0.25)',
          dot: designTokens.colors.accentPeachDot,
          uppercase: false,
        };
      case 'completed':
      default:
        return {
          bg: 'rgba(41, 51, 50, 0.08)',
          text: '#6D7470',
          border: 'transparent',
          dot: null,
          uppercase: false,
        };
    }
  };

  const v = getVariantStyles();

  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }]}>
      <Text
        style={[
          styles.label,
          {
            color: v.text,
            textTransform: v.uppercase ? 'uppercase' : 'none',
          },
        ]}
      >
        {label}
      </Text>
      {v.dot && <View style={[styles.dot, { backgroundColor: v.dot }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: designTokens.radii.pill,
    gap: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
