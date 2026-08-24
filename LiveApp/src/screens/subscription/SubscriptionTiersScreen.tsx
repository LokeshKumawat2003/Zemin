import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { subscriptionApi } from '../../api';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  HomeStackParamList & DiscoverStackParamList & ProfileStackParamList,
  'SubscriptionTiers'
>;

export const SubscriptionTiersScreen = ({ route, navigation }: Props) => {
  const { username } = route.params;
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await subscriptionApi.getTiers(username);
        setTiers(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const subscribe = async (tierId: string, name: string, price: number) => {
    try {
      await subscriptionApi.subscribe(tierId);
      Alert.alert('Subscribed!', `You joined the ${name} tier ($${price}/mo)`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Subscription failed. Add wallet balance first.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscribe to @{username}</Text>
      <FlatList
        data={tiers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tier}>
            <Text style={styles.tierName}>{item.name}</Text>
            <Text style={styles.tierPrice}>${item.price}/month</Text>
            <Text style={styles.tierDesc}>{item.description}</Text>
            {item.benefits?.map((b: string) => (
              <Text key={b} style={styles.benefit}>✓ {b}</Text>
            ))}
            <Button
              title={`Subscribe — $${item.price}`}
              onPress={() => subscribe(item.id, item.name, item.price)}
              style={styles.btn}
            />
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No subscription tiers yet</Text>
        }
      />
    </View>
  );
};

export const MySubscriptionsScreen = () => {
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await subscriptionApi.mySubscriptions();
        setSubs(res.data || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Subscriptions</Text>
      <FlatList
        data={subs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tier}>
            <Text style={styles.tierName}>{item.tierName}</Text>
            <Text style={styles.tierDesc}>@{item.creator?.username}</Text>
            <Text style={styles.benefit}>Renews: {new Date(item.expiresAt).toLocaleDateString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No active subscriptions</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  tier: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierName: { ...typography.h3, color: colors.textPrimary },
  tierPrice: { ...typography.body, color: colors.accent, fontWeight: '700', marginVertical: spacing.xs },
  tierDesc: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm },
  benefit: { ...typography.caption, color: colors.textPrimary, marginBottom: 2 },
  btn: { marginTop: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
