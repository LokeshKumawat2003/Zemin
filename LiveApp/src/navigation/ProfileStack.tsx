import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { WalletScreen } from '../screens/wallet/WalletScreen';
import { BuyCoinsScreen } from '../screens/wallet/BuyCoinsScreen';
import { WithdrawScreen } from '../screens/wallet/WithdrawScreen';
import { CreatorProfileScreen } from '../screens/profile/CreatorProfileScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { SubscriptionTiersScreen, MySubscriptionsScreen } from '../screens/subscription/SubscriptionTiersScreen';
import { GiftCatalogScreen } from '../screens/gifts/GiftCatalogScreen';
import { FollowListScreen } from '../screens/profile/FollowListScreen';
import { ProfileStackParamList } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.textPrimary,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
    <Stack.Screen name="BuyCoins" component={BuyCoinsScreen} options={{ title: 'Buy Coins' }} />
    <Stack.Screen name="Withdraw" component={WithdrawScreen} options={{ title: 'Withdraw' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    <Stack.Screen name="Subscriptions" component={MySubscriptionsScreen} options={{ title: 'Subscriptions' }} />
    <Stack.Screen name="GiftCatalog" component={GiftCatalogScreen} options={{ title: 'Gifts' }} />
    <Stack.Screen name="SubscriptionTiers" component={SubscriptionTiersScreen} options={{ title: 'Subscribe' }} />
    <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ title: 'Creator' }} />
    <Stack.Screen name="FollowList" component={FollowListScreen} options={{ title: 'People' }} />
  </Stack.Navigator>
);
