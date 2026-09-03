import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  accentColor?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  accentColor = designTokens.colors.primary,
  onPress,
}) => {
  const content = (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ flex: 1 }}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={{ flex: 1 }}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: designTokens.colors.surfaceCard,
    borderRadius: designTokens.radii.md,
    padding: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  label: {
    ...designTokens.typography.label,
  },
  icon: {
    fontSize: 14,
  },
  value: {
    ...designTokens.typography.displayNumber,
    fontSize: 24,
    marginVertical: 2,
  },
  subtext: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
});
