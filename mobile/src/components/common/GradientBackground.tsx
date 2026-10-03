import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../theme/designTokens';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style }) => {
  // Read at render time (after theme init) so the gradient follows the active theme.
  const C = designTokens.colors;
  return (
    <LinearGradient
      colors={[C.background, C.backgroundElevated]}
      locations={[0, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={[styles.gradient, { backgroundColor: C.background }, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
