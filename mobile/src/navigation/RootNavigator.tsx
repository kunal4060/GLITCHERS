import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, TouchableOpacity, View } from 'react-native';

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
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '800' },
          tabBarStyle: {
            backgroundColor: 'rgba(7, 10, 16, 0.88)',
            borderTopColor: designTokens.colors.surfaceBorder,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: designTokens.colors.primary,
          tabBarInactiveTintColor: designTokens.colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        }}
      >
        <Tab.Screen
          name="Home"
          component={DashboardScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 44,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: focused ? designTokens.colors.primarySubtle : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17 }}>🏠</Text>
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Timetable"
          component={TimetableScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 44,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: focused ? designTokens.colors.primarySubtle : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17 }}>🗓</Text>
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Tasks"
          component={TasksScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 44,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: focused ? designTokens.colors.primarySubtle : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17 }}>✅</Text>
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 44,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: focused ? designTokens.colors.primarySubtle : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17 }}>💰</Text>
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="AI Assistant"
          component={AIChatScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 44,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: focused ? designTokens.colors.aiSubtle : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17 }}>✨</Text>
              </View>
            ),
          }}
        />
      </Tab.Navigator>

      {/* Global In-App Floating AI Companion Button */}
      <FloatingAIButton onPress={() => navigation.navigate('AI Assistant')} />
    </View>
  );
}

export const RootNavigator: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <Stack.Navigator
      id="root-stack"
      screenOptions={{
        headerStyle: { backgroundColor: 'rgba(7, 10, 16, 0.90)' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Account"
        children={(props) => (
          <SettingsScreen
            {...props}
            onRestartOnboarding={() => setShowOnboarding(true)}
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
        {() => <OnboardingScreen onComplete={() => setShowOnboarding(false)} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
