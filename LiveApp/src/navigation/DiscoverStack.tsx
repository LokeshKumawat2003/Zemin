import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchScreen } from '../screens/discover/SearchScreen';
import { CreatorProfileScreen } from '../screens/profile/CreatorProfileScreen';
import { FollowListScreen } from '../screens/profile/FollowListScreen';
import { SubscriptionTiersScreen } from '../screens/subscription/SubscriptionTiersScreen';
import { CreateSubscriptionTierScreen } from '../screens/subscription/CreateSubscriptionTierScreen';
import { LiveViewerScreen } from '../screens/live/LiveViewerScreen';
import { colors } from '../theme';

export type DiscoverStackParamList = {
  DiscoverMain: undefined;
  Search: undefined;
  CreatorProfile: { username: string };
  FollowList: { username: string; initialTab?: 'followers' | 'following' };
  SubscriptionTiers: { username: string; creatorId: string };
  CreateSubscriptionTier: undefined;
  LiveViewer: {
    roomId: string;
    title: string;
    hostName: string;
    hostId: string;
    webrtcToken?: string;
    livekitUrl?: string;
    livekitEnabled?: boolean;
    viewerCount?: number;
    preJoined?: boolean;
  };
};

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export const DiscoverStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.textPrimary,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="DiscoverMain" component={SearchScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
    <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ title: 'Creator' }} />
    <Stack.Screen name="FollowList" component={FollowListScreen} options={{ title: 'People' }} />
    <Stack.Screen name="SubscriptionTiers" component={SubscriptionTiersScreen} options={{ title: 'Subscribe' }} />
    <Stack.Screen name="CreateSubscriptionTier" component={CreateSubscriptionTierScreen} options={{ title: 'Create Plan' }} />
    <Stack.Screen name="LiveViewer" component={LiveViewerScreen} options={{ title: 'Live' }} />
  </Stack.Navigator>
);
