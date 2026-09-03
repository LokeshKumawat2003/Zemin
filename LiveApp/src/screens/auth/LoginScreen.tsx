import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors, typography } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { loginUser, clearError } from '../../redux/slices/authSlice';
import { AuthStackParamList } from '../../navigation/types';
import { getAuthErrorMessage } from '../../utils/authErrors';
import { useResponsive } from '../../hooks/useResponsive';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const { error } = useAppSelector((s) => s.auth);
  const { fs, sp, contentMaxWidth } = useResponsive();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: {
          flexGrow: 1,
          padding: sp(24),
          justifyContent: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        },
        logo: {
          fontSize: fs(42),
          fontWeight: '800',
          color: colors.primary,
          textAlign: 'center',
          marginBottom: sp(8),
        },
        subtitle: {
          ...typography.h3,
          fontSize: fs(18),
          lineHeight: fs(24),
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: sp(32),
        },
        button: { marginTop: sp(8) },
        forgot: {
          ...typography.bodySmall,
          fontSize: fs(14),
          color: colors.primary,
          textAlign: 'center',
          marginTop: sp(16),
        },
        hint: {
          ...typography.caption,
          fontSize: fs(12),
          color: colors.textDisabled,
          textAlign: 'center',
          marginVertical: sp(16),
        },
      }),
    [fs, sp, contentMaxWidth]
  );

  const onLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    dispatch(clearError());
    try {
      await dispatch(loginUser({ identifier, password })).unwrap();
    } catch (e: unknown) {
      Alert.alert('Login Failed', getAuthErrorMessage(e, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Zemin</Text>
        <Text style={styles.subtitle}>Welcome back</Text>

        <Input
          label="Email or Username"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          placeholder="you@email.com"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <Button title="Login" onPress={onLogin} loading={loading} style={styles.button} />

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Demo: demofan / DemoPass123</Text>

        <Button
          title="Create Account"
          variant="outline"
          onPress={() => navigation.navigate('Signup')}
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
