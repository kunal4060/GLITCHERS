import React, { Suspense, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initTheme } from './src/theme/themeStore';

// Everything that touches designTokens is loaded AFTER the saved theme
// is applied, so screens' StyleSheet.create() picks up the right palette.
// (require inside lazy avoids the dynamic-import TS restriction.)
const AppShell: React.LazyExoticComponent<React.ComponentType> = React.lazy(() =>
  Promise.resolve().then(() => ({ default: require('./src/AppShell').default }))
);

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#0F766E" />
    </View>
  );
}

export default function App() {
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    initTheme().then(() => setThemeReady(true));
  }, []);

  if (!themeReady) {
    return (
      <SafeAreaProvider>
        <Splash />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Suspense fallback={<Splash />}>
        <AppShell />
      </Suspense>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9fb',
  },
});
