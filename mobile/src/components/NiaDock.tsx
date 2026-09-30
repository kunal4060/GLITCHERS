import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';

const C = designTokens.colors;

interface DockTab {
  routeName: string;
  label: string;
  icon: string;
  iconActive: string;
}

// Order matches the tab navigator registration order.
const DOCK_TABS: DockTab[] = [
  { routeName: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { routeName: 'Timetable', label: 'Schedule', icon: 'calendar-outline', iconActive: 'calendar' },
  { routeName: 'Tasks', label: 'Tasks', icon: 'checkbox-outline', iconActive: 'checkbox' },
  { routeName: 'Finance', label: 'Finance', icon: 'wallet-outline', iconActive: 'wallet' },
  { routeName: 'NIA', label: 'Nia AI', icon: 'sparkles-outline', iconActive: 'sparkles' },
];

/**
 * NIA floating frosted bottom dock.
 * Replaces the stock bottom tab bar: a suspended porcelain pill with
 * micro-iconography, labels, and a minimal active pip under the current tab.
 */
export const NiaDock: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 10 }]} pointerEvents="box-none">
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const tab = DOCK_TABS.find((t) => t.routeName === route.name) ?? {
            routeName: route.name,
            label: route.name,
            icon: 'ellipse-outline',
            iconActive: 'ellipse',
          };
          const focused = state.index === index;
          const tint = tab.routeName === 'NIA' && focused ? C.eucalyptus : focused ? C.obsidian : C.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, (route as any).params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.item}
            >
              <Ionicons name={(focused ? tab.iconActive : tab.icon) as any} size={21} color={tint} />
              <Text style={[styles.label, { color: tint, fontWeight: focused ? '700' : '500' }]}>
                {tab.label}
              </Text>
              <View style={[styles.pip, { backgroundColor: focused ? tint : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.dock,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.10,
        shadowRadius: 28,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  pip: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
});
