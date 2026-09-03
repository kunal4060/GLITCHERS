import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { AIGemSymbol } from './AIGemSymbol';

interface FloatingAIButtonProps {
  onPress: () => void;
}

export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open AI Student Companion"
    >
      <AIGemSymbol size={54} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 84, // Sits comfortably above bottom tab dock
    right: 20,
    zIndex: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
