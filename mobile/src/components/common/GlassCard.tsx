import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  borderActive?: boolean;
  padding?: keyof typeof designTokens.spacing;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  onPress,
  elevated = false,
  borderActive = false,
  padding = 'lg',
}) => {
  const cardStyles = [
    styles.card,
    elevated ? styles.elevated : styles.standard,
    borderActive && styles.activeBorder,
    { padding: designTokens.spacing[padding] },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.78} onPress={onPress} style={cardStyles}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: designTokens.radii.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
    overflow: 'hidden',
    ...designTokens.shadows.card,
  },
  standard: {
    backgroundColor: 'rgba(21, 31, 50, 0.78)',
  },
  elevated: {
    backgroundColor: 'rgba(26, 38, 61, 0.85)',
  },
  activeBorder: {
    borderColor: designTokens.colors.surfaceBorderActive,
  },
});
