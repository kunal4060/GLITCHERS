import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface ConfirmBottomSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  details?: { label: string; value: string }[];
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmBottomSheet: React.FC<ConfirmBottomSheetProps> = ({
  visible,
  title,
  subtitle,
  details = [],
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />
        <View style={styles.sheet}>
          {/* Grab Handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {details.length > 0 && (
            <View style={styles.detailsBox}>
              {details.map((d, index) => (
                <View key={index} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={styles.detailValue}>{d.value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, isDestructive && styles.destructiveBtn]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: designTokens.colors.surfaceCard,
    borderTopLeftRadius: designTokens.radii.xl,
    borderTopRightRadius: designTokens.radii.xl,
    borderTopWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
    padding: designTokens.spacing.xl,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.colors.surfaceSubtle,
    alignSelf: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    fontSize: 18,
    textAlign: 'center',
  },
  subtitle: {
    ...designTokens.typography.body,
    textAlign: 'center',
    marginTop: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.md,
  },
  detailsBox: {
    backgroundColor: designTokens.colors.surfaceElevated,
    borderRadius: designTokens.radii.md,
    padding: designTokens.spacing.md,
    marginVertical: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textMuted,
  },
  detailValue: {
    ...designTokens.typography.bodyMedium,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.md,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.surfaceSubtle,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  cancelText: {
    ...designTokens.typography.cardTitle,
    fontSize: 13,
    color: designTokens.colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.primary,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  destructiveBtn: {
    backgroundColor: designTokens.colors.danger,
  },
  confirmText: {
    ...designTokens.typography.cardTitle,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
