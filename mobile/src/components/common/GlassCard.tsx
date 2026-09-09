import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../theme/designTokens';

export type CardVariant = 'default' | 'teal' | 'peach' | 'cream' | 'hero' | 'elevated';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
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
        colors={['#111827', '#1F2937', '#0F172A']}
        locations={[0, 0.5, 1]}
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
    borderColor: 'rgba(26, 28, 29, 0.06)',
    overflow: 'hidden',
    ...designTokens.shadows.card,
  },
  defaultCard: {
    backgroundColor: '#FFFFFF',
  },
  elevatedCard: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  tealCard: {
    backgroundColor: 'rgba(0, 106, 99, 0.06)',
    borderColor: 'rgba(0, 106, 99, 0.15)',
  },
  peachCard: {
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
    borderColor: 'rgba(186, 26, 26, 0.12)',
  },
  creamCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  heroCard: {
    borderWidth: 0,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  activeBorder: {
    borderColor: '#006A63',
  },
});
