import React, { useEffect } from 'react';
import {
  NavigationContainer,
  DarkTheme,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { MainTabNavigator } from './MainTabNavigator';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { RootStackParamList } from './types';
import { colors } from '../theme';
import { useAppSelector } from '../redux/hooks';
import { SidebarProvider } from '../contexts/SidebarContext';
import { AppSidebar } from '../components/navigation/AppSidebar';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primary,
    text: colors.textPrimary,
    border: colors.border,
  },
};

export const RootNavigator = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    const rootState = navigationRef.getRootState();
    const rootRouteName = rootState?.routes[rootState.index]?.name;
    if (!rootRouteName || rootRouteName === 'Splash' || rootRouteName === 'Onboarding') return;

    if (!isAuthenticated && rootRouteName === 'Main') {
      navigationRef.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } else if (isAuthenticated && rootRouteName === 'Auth') {
      navigationRef.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            state: {
              routes: [{ name: 'Home' }],
              index: 0,
            },
          },
        ],
      });
    }
  }, [isAuthenticated, navigationRef]);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <SidebarProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Auth" component={AuthStack} />
          <Stack.Screen name="Main" component={MainTabNavigator} />
        </Stack.Navigator>
        <AppSidebar />
      </SidebarProvider>
    </NavigationContainer>
  );
};
