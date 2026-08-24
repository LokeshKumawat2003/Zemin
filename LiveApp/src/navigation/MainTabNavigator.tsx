import React from 'react';
import { Text, ViewStyle } from 'react-native';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStack } from './HomeStack';
import { ProfileStack } from './ProfileStack';
import { ChatStack } from './ChatStack';
import { LiveStack } from './LiveStack';
import { DiscoverStack } from './DiscoverStack';
import { colors } from '../theme';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{label}</Text>
);

const shouldShowTabBar = (route: any) => {
  const nestedRouteName =
    route?.state?.routes?.[route.state.index ?? 0]?.name ??
    getFocusedRouteNameFromRoute(route) ??
    route?.name;

  const mainTabNames = ['Home', 'Discover', 'GoLive', 'Chat', 'Profile'];
  const mainStackNames = ['HomeFeed', 'DiscoverMain', 'LiveHome', 'ChatList', 'ProfileMain'];

  return (
    mainTabNames.includes(route?.name) &&
    (mainStackNames.includes(nestedRouteName) || mainTabNames.includes(nestedRouteName))
  );
};

export const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  const tabBarBaseStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: bottomPadding,
    height: tabBarHeight,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: shouldShowTabBar(route) ? tabBarBaseStyle : { display: 'none' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarItemStyle: {
          paddingTop: 0,
          paddingBottom: 0,
          margin: 0,
        },
        tabBarLabelStyle: {
          marginBottom: 0,
          paddingBottom: 0,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="🔍" focused={focused} /> }}
      />
      <Tab.Screen
        name="GoLive"
        component={LiveStack}
        options={{
          title: 'Go Live',
          tabBarIcon: ({ focused }) => <TabIcon label="📹" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="💬" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation as any).navigate('Profile', { screen: 'ProfileMain' });
          },
        })}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
};
