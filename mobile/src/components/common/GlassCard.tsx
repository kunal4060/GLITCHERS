import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../theme/designTokens';

export type CardVariant = 'default' | 'teal' | 'peach' | 'cream' | 'hero' | 'elevated';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: CardVariant;
  elevated?: boolean;
  borderActive?: boolean;
  padding?: keyof typeof designTokens.spacing;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
  elevated = false,
  borderActive = false,
  padding = 'lg',
}) => {
  const isHero = variant === 'hero';

  const baseStyle: ViewStyle = {
    padding: designTokens.spacing[padding],
    borderRadius: designTokens.radii.card,
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'teal':
        return styles.tealCard;
      case 'peach':
        return styles.peachCard;
      case 'cream':
        return styles.creamCard;
      case 'elevated':
        return styles.elevatedCard;
      case 'default':
      default:
        return elevated ? styles.elevatedCard : styles.defaultCard;
    }
  };

  if (isHero) {
    const heroContent = (
      <LinearGradient
        colors={['#C88E72', '#A27766', '#6F8484', '#4A6B70']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.baseCard, styles.heroCard, baseStyle, style]}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={{ width: '100%' }}>
          {heroContent}
        </TouchableOpacity>
      );
    }
    return heroContent;
  }

  const combinedStyles = [
    styles.baseCard,
    getVariantStyle(),
    borderActive && styles.activeBorder,
    baseStyle,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={combinedStyles}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={combinedStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: designTokens.radii.card,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
    overflow: 'hidden',
    ...designTokens.shadows.card,
  },
  defaultCard: {
    backgroundColor: designTokens.colors.surfaceCard,
  },
  elevatedCard: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  tealCard: {
    backgroundColor: designTokens.colors.primarySoft, // #D2E5E3
    borderColor: 'rgba(117, 167, 165, 0.20)',
  },
  peachCard: {
    backgroundColor: designTokens.colors.accentPeachCard, // #EEDFD3
    borderColor: 'rgba(232, 173, 142, 0.22)',
  },
  creamCard: {
    backgroundColor: designTokens.colors.accentSand, // #E3EAE7
    borderColor: 'rgba(41, 51, 50, 0.06)',
  },
  heroCard: {
    borderWidth: 0,
    shadowColor: '#2D201A',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  activeBorder: {
    borderColor: designTokens.colors.primary,
  },
});
