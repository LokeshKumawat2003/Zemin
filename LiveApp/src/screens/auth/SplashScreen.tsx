import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { StorageService } from '../../services/storage.service';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { bootstrapAuth } from '../../redux/slices/authSlice';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export const SplashScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      const hasOnboarded = StorageService.getHasOnboarded();
      if (!hasOnboarded) {
        navigation.replace('Onboarding');
      } else if (isAuthenticated) {
        navigation.replace('Main');
      } else {
        navigation.replace('Auth');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Zemin</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
  },
});
