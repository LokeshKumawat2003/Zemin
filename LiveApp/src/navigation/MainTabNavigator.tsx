import React from 'react';
import { View, ViewStyle } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
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
import { useResponsive } from '../hooks/useResponsive';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = ({
  name,
  focused,
  color,
  featured = false,
  iconSize = 29,
}: {
  name: React.ComponentProps<typeof Icon>['name'];
  focused: boolean;
  color: string;
  featured?: boolean;
  iconSize?: number;
}) => {
  const { fs } = useResponsive();
  const icon = <Icon name={name} size={fs(featured ? 31 : iconSize)} color={featured ? '#ff6fa6' : color} />;

  return featured ? (
    <View
      style={{
        width: fs(58),
        height: fs(58),
        borderRadius: fs(29),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#121018',
        borderWidth: fs(2),
        borderColor: '#ff2f6e',
        opacity: focused ? 1 : 0.85,
        marginTop: -fs(16),
      }}
    >
      {icon}
    </View>
  ) : (
    <View style={{ opacity: focused ? 1 : 0.55 }}>{icon}</View>
  );
};

const shouldShowTabBar = (route: any) => {
  const nestedRouteName =
    route?.state?.routes?.[route.state.index ?? 0]?.name ??
    getFocusedRouteNameFromRoute(route) ??
    route?.name;

  if (route?.name === 'Chat') return nestedRouteName !== 'ChatRoom';

  const mainTabNames = ['Home', 'Discover', 'GoLive', 'Chat', 'Profile'];
  const mainStackNames = ['HomeFeed', 'DiscoverMain', 'LiveHome', 'ChatList', 'ProfileMain'];

  return (
    mainTabNames.includes(route?.name) &&
    (mainStackNames.includes(nestedRouteName) || mainTabNames.includes(nestedRouteName))
  );
};

export const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { fs, sp } = useResponsive();
  const bottomPadding = Math.max(insets.bottom, sp(8));
  const tabBarHeight = sp(70);

  const tabBarBaseStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    borderWidth: 1,
    borderRadius: sp(24),
    marginHorizontal: sp(16),
    marginBottom: sp(0),
    paddingTop: sp(12),
    paddingBottom: sp(4),
    height: tabBarHeight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: sp(5) },
    shadowOpacity: 0.35,
    shadowRadius: sp(12),
    elevation: 10,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
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
          fontSize: fs(11),
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverStack}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="explore" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="GoLive"
        component={LiveStack}
        options={{
          title: 'Go Live',
          tabBarIcon: ({ focused, color }) => <TabIcon name="videocam" focused={focused} color={color} featured />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="chat-bubble" focused={focused} color={color} iconSize={22} /> }}
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
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="person" focused={focused} color={color} /> }}
      />
    </Tab.Navigator>
  );
};
