import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors, typography, spacing } from '../../theme';
import { useAppDispatch } from '../../redux/hooks';
import { registerUser } from '../../redux/slices/authSlice';
import { AuthStackParamList } from '../../navigation/types';
import { getAuthErrorMessage, validateSignupInput } from '../../utils/authErrors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export const SignupScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignup = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const validationError = validateSignupInput(username, email, password);
    if (validationError) {
      Alert.alert('Invalid Input', validationError);
      return;
    }
    setLoading(true);
    try {
      const result = await dispatch(registerUser({ username, email, password })).unwrap();
      navigation.navigate('OTP', {
        userId: result.userId,
        devOtp: result.devOtp,
      });
    } catch (e: unknown) {
      Alert.alert('Signup Failed', getAuthErrorMessage(e, 'Registration failed'));
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
        <Text style={styles.title}>Create Account</Text>
        <Input label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Text style={styles.hint}>
          At least 8 characters with uppercase, lowercase, and a number
        </Text>
        <Button title="Sign Up" onPress={onSignup} loading={loading} />
        <Button title="Back to Login" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xl },
  hint: {
    ...typography.caption,
    color: colors.textDisabled,
    marginBottom: spacing.md,
  },
});
