import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LiveHomeScreen } from '../screens/live/LiveHomeScreen';
import { LiveHostScreen } from '../screens/live/LiveHostScreen';
import { LiveViewerScreen } from '../screens/live/LiveViewerScreen';
import { LiveStackParamList } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<LiveStackParamList>();

export const LiveStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.textPrimary,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="LiveHome" component={LiveHomeScreen} options={{ headerShown: false }} />
    <Stack.Screen name="LiveHost" component={LiveHostScreen} options={{ title: 'Live Stream', headerBackVisible: false }} />
    <Stack.Screen name="LiveViewer" component={LiveViewerScreen} options={{ title: 'Live' }} />
  </Stack.Navigator>
);
