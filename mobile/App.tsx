import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FloatingAssistantOverlay } from './src/components/FloatingAssistantOverlay';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
        <FloatingAssistantOverlay />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
