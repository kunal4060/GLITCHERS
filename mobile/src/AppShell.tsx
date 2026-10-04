// AppShell — loaded lazily AFTER the theme is initialized, so every
// `const C = designTokens.colors` + StyleSheet.create in screens picks up
// the active theme's palette on first import.
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { RootNavigator } from './navigation/RootNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingAssistantOverlay } from './components/FloatingAssistantOverlay';
import { GradientBackground } from './components/common/GradientBackground';
import { designTokens } from './theme/designTokens';
import { getCurrentTheme } from './theme/themeStore';

export default function AppShell() {
  const C = designTokens.colors;
  const isDark = getCurrentTheme().dark;
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: C.background,
      card: C.surface,
      text: C.textPrimary,
      border: C.surfaceBorder,
      primary: C.primary,
    },
  };

  return (
    <GradientBackground>
      <ErrorBoundary>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootNavigator />
          <FloatingAssistantOverlay />
        </NavigationContainer>
      </ErrorBoundary>
    </GradientBackground>
  );
}
