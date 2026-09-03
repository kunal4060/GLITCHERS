import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, TouchableOpacity, View } from 'react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { TimetableScreen } from '../screens/TimetableScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Secondary Stack & Feature Screens
import { AIChatScreen } from '../screens/AIChatScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { ExamsAndAssignmentsScreen } from '../screens/ExamsAndAssignmentsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { EmailScreen } from '../screens/EmailScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
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
        headerStyle: { backgroundColor: '#0B0F15' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: '#0B0F15',
          borderTopColor: '#1E293B',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 14, marginRight: 16, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('AI Companion')}>
              <Text style={{ fontSize: 19 }}>🤖</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={{ fontSize: 17 }}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={{ fontSize: 17 }}>🔔</Text>
            </TouchableOpacity>
          </View>
        ),
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
                width: 48,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>🏠</Text>
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
                width: 48,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>📅</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 48,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>📇</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        children={(props) => (
          <SettingsScreen
            {...props}
            onRestartOnboarding={() => navigation.navigate('Onboarding')}
          />
        )}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 48,
                height: 30,
                borderRadius: 15,
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
          ),
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
        headerStyle: { backgroundColor: '#0B0F15' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: '#0B0F15' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AI Companion" component={AIChatScreen} options={{ title: 'AI Student Companion' }} />
      <Stack.Screen name="Finance" component={FinanceScreen} options={{ title: 'Student Finance & Budget' }} />
      <Stack.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tasks & Deadlines' }} />
      <Stack.Screen name="Exams" component={ExamsAndAssignmentsScreen} options={{ title: 'Exams & Assignments' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Academic Calendar' }} />
      <Stack.Screen name="Email" component={EmailScreen} options={{ title: 'University Notices' }} />
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
