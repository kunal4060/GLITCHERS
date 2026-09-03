import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.hero,
    paddingHorizontal: designTokens.spacing.xl,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: designTokens.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
    marginBottom: designTokens.spacing.md,
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  description: {
    ...designTokens.typography.body,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: designTokens.spacing.lg,
  },
  actionBtn: {
    backgroundColor: designTokens.colors.primary,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm + 2,
    borderRadius: designTokens.radii.md,
  },
  actionText: {
    ...designTokens.typography.cardTitle,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
