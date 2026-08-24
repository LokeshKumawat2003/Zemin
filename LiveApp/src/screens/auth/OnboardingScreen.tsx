import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { StorageService } from '../../services/storage.service';
import { useAppSelector } from '../../redux/hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const slides = [
  { title: 'Discover Creators', body: 'Follow your favorite creators and never miss a post.' },
  { title: 'Go Live', body: 'Stream to fans in real time with gifts and chat.' },
  { title: 'Support & Subscribe', body: 'Unlock exclusive content with coins and subscriptions.' },
];

export const OnboardingScreen = ({ navigation }: Props) => {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [step, setStep] = useState(0);

  const finish = () => {
    StorageService.setHasOnboarded(true);
    navigation.replace(isAuthenticated ? 'Main' : 'Auth');
  };

  const next = () => {
    if (step < slides.length - 1) setStep(step + 1);
    else finish();
  };

  const slide = slides[step];

  return (
    <View style={styles.container}>
      <Text style={styles.step}>{step + 1} / {slides.length}</Text>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.body}>{slide.body}</Text>
      <Button title={step < slides.length - 1 ? 'Next' : 'Get Started'} onPress={next} style={styles.btn} />
      <Button title="Skip" variant="outline" onPress={finish} style={styles.btn} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' },
  step: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xxl },
  btn: { marginTop: spacing.sm },
});
