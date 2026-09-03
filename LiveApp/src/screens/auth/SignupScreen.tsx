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
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
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
  const [avatarUri, setAvatarUri] = useState<string>();
  const [loading, setLoading] = useState(false);

  const chooseAvatar = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const uri = result.assets?.[0]?.uri;
    if (uri) setAvatarUri(uri);
  };

  const onSignup = async () => {
    if (!username || !email || !password || !avatarUri) {
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
        avatarUri,
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
        <TouchableOpacity style={styles.avatarPicker} onPress={chooseAvatar} activeOpacity={0.8}>
          {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatar} /> : <Text style={styles.avatarText}>Add photo</Text>}
        </TouchableOpacity>
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
  avatarPicker: { alignSelf: 'center', width: 104, height: 104, borderRadius: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarText: { ...typography.caption, color: colors.primary },
});
