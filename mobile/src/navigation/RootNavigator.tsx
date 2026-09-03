import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardScreen } from '../screens/DashboardScreen';
import { TimetableScreen } from '../screens/TimetableScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { AIChatScreen } from '../screens/AIChatScreen';

// Secondary Stack & Deep Feature Screens
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ExamsAndAssignmentsScreen } from '../screens/ExamsAndAssignmentsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { EmailScreen } from '../screens/EmailScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { useAuthStore } from '../store/authStore';

import { designTokens } from '../theme/designTokens';
import { FloatingAIButton } from '../components/common/FloatingAIButton';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ navigation }: { navigation: any }) {
  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <Tab.Navigator
        id="main-tabs"
        screenOptions={{
          sceneStyle: { backgroundColor: 'transparent' },
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: designTokens.colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          tabBarStyle: {
            backgroundColor: '#F6F3ED',
            borderTopColor: 'rgba(41, 51, 50, 0.08)',
            borderTopWidth: 1,
            height: 72,
            paddingBottom: 10,
            paddingTop: 8,
            elevation: 0,
            shadowColor: '#3D352E',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.03,
            shadowRadius: 6,
          },
          tabBarActiveTintColor: designTokens.colors.textPrimary,
          tabBarInactiveTintColor: designTokens.colors.textSecondary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        }}
      >
        <Tab.Screen
          name="Home"
          component={DashboardScreen}
          options={{
            headerShown: false,
            tabBarLabel: ({ focused }) => (
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: focused ? '700' : '500',
                    color: focused ? designTokens.colors.textPrimary : designTokens.colors.textSecondary,
                  }}
                >
                  Home
                </Text>
                {focused && (
                  <View
                    style={{
                      width: 22,
                      height: 3,
                      borderRadius: 1.5,
                      backgroundColor: designTokens.colors.accentPeachDot, // #D4856A
                      marginTop: 3,
                    }}
                  />
                )}
              </View>
            ),
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 52,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: focused ? designTokens.colors.primaryPill : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={focused ? 'home' : 'home-outline'}
                  size={19}
                  color={focused ? designTokens.colors.textPrimary : designTokens.colors.textSecondary}
                />
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Timetable"
          component={TimetableScreen}
          options={{
            headerShown: false,
            tabBarLabel: ({ focused }) => (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: focused ? '700' : '500',
                  color: focused ? designTokens.colors.textPrimary : designTokens.colors.textSecondary,
                }}
              >
                Timetable
              </Text>
            ),
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={20}
                color={focused ? designTokens.colors.primary : designTokens.colors.textSecondary}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Tasks"
          component={TasksScreen}
          options={{
            headerShown: false,
            tabBarLabel: ({ focused }) => (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: focused ? '700' : '500',
                  color: focused ? designTokens.colors.textPrimary : designTokens.colors.textSecondary,
                }}
              >
                Tasks
              </Text>
            ),
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'checkbox' : 'checkbox-outline'}
                size={20}
                color={focused ? designTokens.colors.primary : designTokens.colors.textSecondary}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            headerShown: false,
            tabBarLabel: ({ focused }) => (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: focused ? '700' : '500',
                  color: focused ? designTokens.colors.textPrimary : designTokens.colors.textSecondary,
                }}
              >
                Finance
              </Text>
            ),
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'cash' : 'cash-outline'}
                size={20}
                color={focused ? designTokens.colors.primary : designTokens.colors.textSecondary}
              />
            ),
          }}
        />

        <Tab.Screen
          name="AI Companion"
          component={AIChatScreen}
          options={{
            headerShown: false,
            tabBarLabel: ({ focused }) => (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: focused ? '700' : '500',
                  color: focused ? designTokens.colors.textPrimary : designTokens.colors.textSecondary,
                }}
              >
                AI Companion
              </Text>
            ),
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'school' : 'school-outline'}
                size={20}
                color={focused ? designTokens.colors.primary : designTokens.colors.textSecondary}
              />
            ),
          }}
        />
      </Tab.Navigator>

      {/* Floating 3D Crystal Gem Assistant */}
      <FloatingAIButton onPress={() => navigation.navigate('AI Companion')} />
    </View>
  );
}

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isOnboardingComplete, completeOnboarding, loginWithGoogle } = useAuthStore();
  const [showManualOnboarding, setShowManualOnboarding] = useState(false);

  React.useEffect(() => {
    // Catch Google OAuth redirect credentials from URL query params
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      const name = params.get('name');
      const token = params.get('token');
      if (email && token) {
        window.history.replaceState({}, document.title, window.location.pathname);
        loginWithGoogle(email, name || email.split('@')[0]);
      }
    }
  }, []);

  // 1. If not authenticated, render Google Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // 2. If authenticated but onboarding not yet completed, or user re-opened onboarding
  if (!isOnboardingComplete || showManualOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => {
          completeOnboarding();
          setShowManualOnboarding(false);
        }}
      />
    );
  }

  return (
    <Stack.Navigator
      id="root-stack"
      screenOptions={{
        headerStyle: { backgroundColor: designTokens.colors.background },
        headerTintColor: designTokens.colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', color: designTokens.colors.textPrimary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Account"
        children={(props) => (
          <SettingsScreen
            {...props}
            onRestartOnboarding={() => setShowManualOnboarding(true)}
          />
        )}
        options={{ title: 'Student Profile & Account' }}
      />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance & Bunker' }} />
      <Stack.Screen name="Email" component={EmailScreen} options={{ title: 'University Circulars' }} />
      <Stack.Screen name="Exams" component={ExamsAndAssignmentsScreen} options={{ title: 'Exams & Assignments' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Academic Calendar' }} />
      <Stack.Screen name="Docs" component={DocumentsScreen} options={{ title: 'Document Intelligence' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Global Search' }} />
      <Stack.Screen name="Alerts" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy & Credentials' }} />
      <Stack.Screen name="Onboarding">
        {() => (
          <OnboardingScreen
            onComplete={() => {
              completeOnboarding();
              setShowManualOnboarding(false);
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
