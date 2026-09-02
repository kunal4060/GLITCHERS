import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, TouchableOpacity, View } from 'react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { TimetableScreen } from '../screens/TimetableScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { AIChatScreen } from '../screens/AIChatScreen';

// Secondary & Modal Screens
import { CalendarScreen } from '../screens/CalendarScreen';
import { ExamsAndAssignmentsScreen } from '../screens/ExamsAndAssignmentsScreen';
import { EmailScreen } from '../screens/EmailScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { theme } from '../theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ navigation }: { navigation: any }) {
  return (
    <Tab.Navigator
      id="main-tabs"
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceBorder,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 12, marginRight: 16 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={{ fontSize: 18 }}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{
          title: 'Timetable',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗓</Text>,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text>,
        }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceScreen}
        options={{
          title: 'Finance',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💰</Text>,
        }}
      />
      <Tab.Screen
        name="AI Companion"
        component={AIChatScreen}
        options={{
          title: 'AI Companion',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🤖</Text>,
        }}
      />
    </Tab.Navigator>
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
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Academic Calendar' }} />
      <Stack.Screen name="Exams" component={ExamsAndAssignmentsScreen} options={{ title: 'Exams & Assignments' }} />
      <Stack.Screen name="Email" component={EmailScreen} options={{ title: 'University Notices & Emails' }} />
      <Stack.Screen name="Docs" component={DocumentsScreen} options={{ title: 'Document Intelligence' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Global Search' }} />
      <Stack.Screen name="Alerts" component={NotificationsScreen} options={{ title: 'Notification Center' }} />
      <Stack.Screen name="Settings">
        {() => <SettingsScreen onRestartOnboarding={() => setShowOnboarding(true)} />}
      </Stack.Screen>
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy & Security Controls' }} />
    </Stack.Navigator>
  );
};
