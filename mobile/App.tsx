import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FloatingAssistantOverlay } from './src/components/FloatingAssistantOverlay';
import { GradientBackground } from './src/components/common/GradientBackground';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <GradientBackground>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <RootNavigator />
          <FloatingAssistantOverlay />
        </NavigationContainer>
      </GradientBackground>
    </SafeAreaProvider>
  );
}
