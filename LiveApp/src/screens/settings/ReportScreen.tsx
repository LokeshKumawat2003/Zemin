import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors, typography, spacing } from '../../theme';
import { reportApi } from '../../api';
import { HomeStackParamList } from '../../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'Report'>;

const REASONS = ['spam', 'harassment', 'inappropriate', 'scam', 'copyright', 'other'] as const;

export const ReportScreen = ({ route, navigation }: Props) => {
  const { targetType, targetId } = route.params;
  const [reason, setReason] = useState<(typeof REASONS)[number]>('inappropriate');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await reportApi.create({ targetType, targetId, reason, description: description.trim() || undefined });
      Alert.alert('Reported', 'Thank you. Our team will review this.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report Content</Text>
      <Text style={styles.subtitle}>Why are you reporting this {targetType}?</Text>

      <View style={styles.reasons}>
        {REASONS.map((r) => (
          <Button
            key={r}
            title={r.charAt(0).toUpperCase() + r.slice(1)}
            variant={reason === r ? 'primary' : 'outline'}
            onPress={() => setReason(r)}
            style={styles.reasonBtn}
          />
        ))}
      </View>

      <Input
        label="Details (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Tell us more..."
        multiline
        style={{ minHeight: 100, textAlignVertical: 'top' }}
      />

      <Button title="Submit Report" onPress={submit} loading={loading} style={styles.submit} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  reasonBtn: { flexGrow: 1, minWidth: '45%' },
  submit: { marginTop: spacing.md },
});
