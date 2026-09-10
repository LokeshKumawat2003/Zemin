import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors, typography, spacing } from '../../theme';
import { useAppDispatch } from '../../redux/hooks';
import { registerUser } from '../../redux/slices/authSlice';
import { AuthStackParamList } from '../../navigation/types';
import { getAuthFieldErrors, getAuthErrorMessage, SignupFieldErrors, validateSignupFields } from '../../utils/authErrors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export const SignupScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUri, setAvatarUri] = useState<string>();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});

  const chooseAvatar = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const uri = result.assets?.[0]?.uri;
    if (uri) setAvatarUri(uri);
  };

  const onSignup = async () => {
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();
    const validationErrors = validateSignupFields(
      normalizedUsername,
      normalizedEmail,
      password,
      avatarUri,
      legalAccepted,
    );
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      return;
    }
    setLoading(true);
    try {
      const result = await dispatch(registerUser({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        termsAccepted: true,
        privacyPolicyAccepted: true,
      })).unwrap();
      navigation.navigate('OTP', {
        userId: result.userId,
        devOtp: result.devOtp,
        avatarUri,
      });
    } catch (e: unknown) {
      const serverFieldErrors = getAuthFieldErrors(e);
      if (Object.keys(serverFieldErrors).length) {
        setFieldErrors(serverFieldErrors);
      } else {
        Alert.alert('Signup Failed', getAuthErrorMessage(e, 'Registration failed'));
      }
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
        <TouchableOpacity style={styles.avatarPicker} onPress={chooseAvatar} activeOpacity={0.8}>
          {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatar} /> : <Text style={styles.avatarText}>Add photo (optional)</Text>}
        </TouchableOpacity>
        <Input
          label="Username"
          value={username}
          onChangeText={value => { setUsername(value); setFieldErrors(errors => ({ ...errors, username: undefined })); }}
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.username}
        />
        <Input
          label="Email"
          value={email}
          onChangeText={value => { setEmail(value); setFieldErrors(errors => ({ ...errors, email: undefined })); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={value => { setPassword(value); setFieldErrors(errors => ({ ...errors, password: undefined })); }}
          secureTextEntry
          error={fieldErrors.password}
        />
        <Text style={styles.hint}>
          Password requirements: 8+ characters, 1 uppercase, 1 lowercase, and 1 number
        </Text>
        <Pressable
          style={styles.legalRow}
          onPress={() => setLegalAccepted(value => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: legalAccepted }}
        >
          <View style={[styles.checkbox, legalAccepted && styles.checkboxChecked]}>
            {legalAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.legalText}>
            I agree to the Zemin{' '}
            <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}>
              Terms of Service
            </Text>{' '}and{' '}
            <Text style={styles.legalLink} onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}>
              Privacy Policy
            </Text>.
          </Text>
        </Pressable>
        {fieldErrors.legal ? <Text style={styles.formError}>{fieldErrors.legal}</Text> : null}
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
  formError: { ...typography.caption, color: colors.error, marginBottom: spacing.md },
  avatarPicker: { alignSelf: 'center', width: 104, height: 104, borderRadius: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarText: { ...typography.caption, color: colors.primary },
  legalRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  legalText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  legalLink: { color: colors.primary, textDecorationLine: 'underline' },
});
