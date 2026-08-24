import React, { useState } from 'react';
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
import { colors, typography, spacing } from '../../theme';
import { authApi } from '../../api';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    if (!identifier.trim()) {
      Alert.alert('Error', 'Enter your email or username');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(identifier.trim());
      setUserId(res.data.userId);
      setStep('reset');
      if (res.data.devOtp) {
        Alert.alert('Dev OTP', `Your reset code: ${res.data.devOtp}`);
      } else {
        Alert.alert('Code sent', 'Check your email for the reset code');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!otp || !newPassword) {
      Alert.alert('Error', 'Fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ userId, otp, newPassword });
      Alert.alert('Success', 'Password updated. You can log in now.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not reset password');
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
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {step === 'request'
            ? 'Enter your email or username to receive a reset code'
            : 'Enter the code and your new password'}
        </Text>

        {step === 'request' ? (
          <>
            <Input
              label="Email or Username"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              placeholder="you@email.com"
            />
            <Button title="Send Code" onPress={requestCode} loading={loading} style={styles.btn} />
          </>
        ) : (
          <>
            <Input
              label="Reset Code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              placeholder="6-digit code"
              maxLength={6}
            />
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Min 8 chars, upper + lower + number"
            />
            <Button title="Reset Password" onPress={resetPassword} loading={loading} style={styles.btn} />
            <TouchableOpacity onPress={() => setStep('request')}>
              <Text style={styles.link}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  btn: { marginTop: spacing.md },
  link: { ...typography.body, color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
});
