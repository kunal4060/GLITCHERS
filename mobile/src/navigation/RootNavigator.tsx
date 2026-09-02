import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { TimetableScreen } from '../screens/TimetableScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { EmailScreen } from '../screens/EmailScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { theme } from '../theme/theme';

const Tab = createBottomTabNavigator();

export const RootNavigator: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.surfaceBorder,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🗓</Text>,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>📅</Text>,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>✅</Text>,
        }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>💰</Text>,
        }}
      />
      <Tab.Screen
        name="Email"
        component={EmailScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>📧</Text>,
        }}
      />
      <Tab.Screen
        name="Docs"
        component={DocumentsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>📄</Text>,
        }}
      />
      <Tab.Screen
        name="AI Chat"
        component={AIChatScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🤖</Text>,
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🔔</Text>,
        }}
      />
      <Tab.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🔐</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
