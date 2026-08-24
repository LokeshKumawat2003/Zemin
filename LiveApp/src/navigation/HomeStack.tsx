import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeFeedScreen } from '../screens/home/HomeFeedScreen';
import { PostDetailScreen } from '../screens/home/PostDetailScreen';
import { CreatePostScreen } from '../screens/create/CreatePostScreen';
import { CreatorProfileScreen } from '../screens/profile/CreatorProfileScreen';
import { FollowListScreen } from '../screens/profile/FollowListScreen';
import { NotificationsScreen } from '../screens/settings/NotificationsScreen';
import { SubscriptionTiersScreen } from '../screens/subscription/SubscriptionTiersScreen';
import { ReportScreen } from '../screens/settings/ReportScreen';
import { LiveViewerScreen } from '../screens/live/LiveViewerScreen';
import { WalletScreen } from '../screens/wallet/WalletScreen';
import { VipScreen } from '../screens/home/VipScreen';
import { colors } from '../theme';

export type HomeStackParamList = {
  HomeFeed: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  CreatorProfile: { username: string };
  FollowList: { username: string; initialTab?: 'followers' | 'following' };
  Notifications: undefined;
  SubscriptionTiers: { username: string; creatorId: string };
  Report: { targetType: 'user' | 'post' | 'live' | 'message'; targetId: string };
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
  Wallet: undefined;
  VipScreen: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.textPrimary,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="HomeFeed" component={HomeFeedScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post' }} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'New Post' }} />
    <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ title: 'Creator' }} />
    <Stack.Screen name="FollowList" component={FollowListScreen} options={{ title: 'People' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="SubscriptionTiers" component={SubscriptionTiersScreen} options={{ title: 'Subscribe' }} />
    <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Report' }} />
    <Stack.Screen name="LiveViewer" component={LiveViewerScreen} options={{ title: 'Live' }} />
    <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
    <Stack.Screen name="VipScreen" component={VipScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);
