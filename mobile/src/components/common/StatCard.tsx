import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface StatCardProps {
  label?: string;
  value?: string | number;
  title?: string;
  subtext?: string;
  hasDot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
  variant?: 'teal' | 'peach' | 'cream' | 'default';
  accentColor?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  title,
  subtext,
  hasDot = false,
  dotColor = designTokens.colors.accentPeachDot,
  icon,
  variant = 'default',
  accentColor = designTokens.colors.textPrimary,
  onPress,
}) => {
  // If title is passed, use the new 2-line prominent reference style:
  // e.g. "3 Classes\nToday", "2 Pending\nTasks", "1 Important\nNotice"
  const displayTitle = title || (value !== undefined && label ? `${value} ${label}` : label || '');

  const getBackgroundStyle = () => {
    switch (variant) {
      case 'teal':
        return styles.cardTeal;
      case 'peach':
        return styles.cardPeach;
      case 'cream':
        return styles.cardCream;
      default:
        return styles.cardDefault;
    }
  };

  const content = (
    <View style={[styles.card, getBackgroundStyle()]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}

      <Text style={[styles.cardTitle, { color: accentColor }]}>
        {displayTitle}
      </Text>

      {subtext && (
        <View style={styles.subtextRow}>
          <Text style={styles.subtext}>{subtext}</Text>
          {hasDot && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={{ flex: 1 }}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={{ flex: 1 }}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 14,
    minHeight: 124,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(41, 51, 50, 0.05)',
    ...designTokens.shadows.card,
  },
  cardTeal: {
    backgroundColor: '#D8E8E7',
    borderColor: 'rgba(117, 167, 165, 0.18)',
  },
  cardPeach: {
    backgroundColor: '#EEDFD3',
    borderColor: 'rgba(232, 173, 142, 0.20)',
  },
  cardCream: {
    backgroundColor: '#E3EAE7',
    borderColor: 'rgba(41, 51, 50, 0.06)',
  },
  cardDefault: {
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#232D2B',
    lineHeight: 18,
    marginBottom: 4,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  subtext: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6D7470',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
