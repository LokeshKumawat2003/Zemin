import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { ChatStackParamList } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export const ChatStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.textPrimary,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);
