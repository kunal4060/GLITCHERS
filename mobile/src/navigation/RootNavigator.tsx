import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { TimetableScreen } from '../screens/TimetableScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { EmailScreen } from '../screens/EmailScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';

const Tab = createBottomTabNavigator();

export const RootNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#F8FAFC',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
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
        name="AI Chat"
        component={AIChatScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🤖</Text>,
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
