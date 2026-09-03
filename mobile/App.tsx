import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FloatingAssistantOverlay } from './src/components/FloatingAssistantOverlay';
import { GradientBackground } from './src/components/common/GradientBackground';
import { designTokens } from './src/theme/designTokens';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: designTokens.colors.background,
    card: '#F6F3ED',
    text: designTokens.colors.textPrimary,
    border: designTokens.colors.surfaceBorder,
    primary: designTokens.colors.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <GradientBackground>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
          <FloatingAssistantOverlay />
        </NavigationContainer>
      </GradientBackground>
    </SafeAreaProvider>
  );
}
