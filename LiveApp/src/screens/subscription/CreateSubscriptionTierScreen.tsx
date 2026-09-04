import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors, spacing, typography } from '../../theme';
import { subscriptionApi } from '../../api';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  HomeStackParamList & DiscoverStackParamList & ProfileStackParamList,
  'CreateSubscriptionTier'
>;

export const CreateSubscriptionTierScreen = ({ navigation, route }: Props) => {
  const tier = route.params?.tier;
  const isEditing = Boolean(tier?.id);
  const [name, setName] = useState(tier?.name || '');
  const [price, setPrice] = useState(tier?.price ? String(tier.price) : '');
  const [description, setDescription] = useState(tier?.description || '');
  const [benefits, setBenefits] = useState((tier?.benefits || []).join(', '));
  const [badge, setBadge] = useState(tier?.badge || '');
  const [accessAllLive, setAccessAllLive] = useState(Boolean(tier?.accessAllLive));
  const [unlockAllPosts, setUnlockAllPosts] = useState(Boolean(tier?.unlockAllPosts));
  const [saving, setSaving] = useState(false);

  const createTier = async () => {
    const numericPrice = Number(price);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice < 1) {
      Alert.alert('Complete the plan', 'Enter a plan name and a monthly price of at least $1.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        price: numericPrice,
        description: description.trim() || undefined,
        benefits: benefits.split(',').map((item: string) => item.trim()).filter(Boolean),
        badge: badge.trim() || undefined,
        accessAllLive,
        unlockAllPosts,
      };
      if (isEditing) await subscriptionApi.updateTier(tier.id, payload);
      else await subscriptionApi.createTier(payload);
      Alert.alert(isEditing ? 'Plan updated' : 'Plan created', isEditing ? 'Your subscription plan was updated.' : 'Your subscription plan is now available on your profile.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Could not create plan', e?.error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{isEditing ? 'Edit subscription plan' : 'Create a subscription plan'}</Text>
      <Text style={styles.subtitle}>One payment gives access for one month. There is no automatic renewal.</Text>

      <View style={styles.form}>
        <Input label="Plan name" value={name} onChangeText={setName} placeholder="Supporter" maxLength={50} />
        <Input
          label="Monthly price (USD)"
          value={price}
          onChangeText={setPrice}
          placeholder="5.00"
          keyboardType="decimal-pad"
        />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What subscribers get"
          multiline
          style={styles.multiline}
        />
        <Input
          label="Benefits"
          value={benefits}
          onChangeText={setBenefits}
          placeholder="Exclusive posts, Early access, Subscriber chat"
          multiline
          style={styles.multiline}
        />
        <Input label="Badge (optional)" value={badge} onChangeText={setBadge} placeholder="VIP" maxLength={20} />
        <Text style={styles.hint}>Separate multiple benefits with commas.</Text>
        <View style={styles.optionRow}>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>All live access</Text>
            <Text style={styles.optionHint}>Subscribers can join your paid live rooms without another entry gift.</Text>
          </View>
          <Switch value={accessAllLive} onValueChange={setAccessAllLive} trackColor={{ false: colors.border, true: colors.primary }} />
        </View>
        <View style={styles.optionRow}>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Unlock all posts</Text>
            <Text style={styles.optionHint}>Subscribers can view your PPV posts during the month.</Text>
          </View>
          <Switch value={unlockAllPosts} onValueChange={setUnlockAllPosts} trackColor={{ false: colors.border, true: colors.primary }} />
        </View>
        <Button title={isEditing ? 'Save changes' : 'Create subscription plan'} onPress={createTier} loading={saving} style={styles.button} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  form: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  optionCopy: { flex: 1 },
  optionTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  optionHint: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  button: { marginTop: spacing.sm },
});