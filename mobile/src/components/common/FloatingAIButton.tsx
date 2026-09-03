import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface FloatingAIButtonProps {
  onPress: () => void;
}

export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open AI Student Companion"
    >
      <View style={styles.glowRing} />
      <View style={styles.button}>
        <Text style={styles.icon}>✨</Text>
      </View>
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
  glowRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: designTokens.colors.aiGlow,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: designTokens.colors.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    ...designTokens.shadows.floating,
  },
  icon: {
    fontSize: 22,
  },
});
