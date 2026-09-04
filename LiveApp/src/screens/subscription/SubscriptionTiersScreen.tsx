import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { subscriptionApi, unwrapApiResponse, walletApi } from '../../api';
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
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingTierId, setBuyingTierId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [tiersResponse, balanceResponse] = await Promise.all([
          subscriptionApi.getTiers(username),
          walletApi.getBalance().catch(() => null),
        ]);
        const tierPayload = unwrapApiResponse<any[]>(tiersResponse);
        const balancePayload = balanceResponse ? unwrapApiResponse<any>(balanceResponse) : null;
        setTiers(Array.isArray(tierPayload) ? tierPayload : []);
        setWalletBalance(typeof balancePayload?.walletBalance === 'number' ? balancePayload.walletBalance : null);
      } catch (e: any) {
        setError(e?.error?.message || 'Could not load subscription options.');
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const subscribe = async (tierId: string, name: string, price: number) => {
    setBuyingTierId(tierId);
    try {
      await subscriptionApi.subscribe(tierId);
      Alert.alert('Subscribed!', `You joined the ${name} tier ($${price}/mo)`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Subscription failed. Add wallet balance first.');
    } finally {
      setBuyingTierId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscribe to @{username}</Text>
      <Text style={styles.subtitle}>One payment. One month of access. No automatic renewal.</Text>
      {walletBalance !== null ? <Text style={styles.balance}>Wallet balance: ${walletBalance.toFixed(2)}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={loading ? [] : tiers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tier}>
            <Text style={styles.tierName}>{item.name}</Text>
            <Text style={styles.tierPrice}>${item.price}/month</Text>
            <Text style={styles.tierDesc}>{item.description}</Text>
            {item.accessAllLive ? <Text style={styles.entitlement}>✓ All live access</Text> : null}
            {item.unlockAllPosts ? <Text style={styles.entitlement}>✓ All posts unlocked</Text> : null}
            {item.benefits?.map((b: string) => (
              <Text key={b} style={styles.benefit}>✓ {b}</Text>
            ))}
            <Button
              title={buyingTierId === item.id ? 'Buying...' : `Buy subscription — $${item.price}`}
              onPress={() => subscribe(item.id, item.name, item.price)}
              loading={buyingTierId === item.id}
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
            <Text style={styles.benefit}>Access expires: {new Date(item.expiresAt).toLocaleDateString()}</Text>
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
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: -spacing.md, marginBottom: spacing.md },
  balance: { ...typography.bodySmall, color: colors.textSecondary, marginTop: -spacing.md, marginBottom: spacing.md },
  loader: { marginTop: spacing.xl },
  error: { ...typography.body, color: colors.primary, textAlign: 'center', marginTop: spacing.xl },
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
  entitlement: { ...typography.bodySmall, color: colors.accent, fontWeight: '700', marginBottom: 4 },
  btn: { marginTop: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
