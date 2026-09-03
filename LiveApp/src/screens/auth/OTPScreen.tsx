import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors, typography, spacing } from '../../theme';
import { useAppDispatch } from '../../redux/hooks';
import { verifyOtp } from '../../redux/slices/authSlice';
import { AuthStackParamList } from '../../navigation/types';
import { uploadApi, userApi } from '../../api';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

export const OTPScreen = ({ route }: Props) => {
  const { userId, devOtp, avatarUri } = route.params;
  const dispatch = useAppDispatch();
  const [otp, setOtp] = useState(devOtp || '');
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Enter 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await dispatch(verifyOtp({ userId, otp })).unwrap();
      if (avatarUri) {
        const formData = new FormData();
        formData.append('file', { uri: avatarUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
        formData.append('folder', 'avatars');
        const upload = await uploadApi.uploadMedia(formData);
        await userApi.updateProfile({ avatar: upload.data?.url });
      }
    } catch (e: any) {
      Alert.alert('Verification Failed', e?.error?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to your email</Text>
      {devOtp ? <Text style={styles.devOtp}>Dev OTP: {devOtp}</Text> : null}
      <Input
        label="OTP Code"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
      />
      <Button title="Verify" onPress={onVerify} loading={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  devOtp: { ...typography.bodySmall, color: colors.accent, marginBottom: spacing.md },
});
