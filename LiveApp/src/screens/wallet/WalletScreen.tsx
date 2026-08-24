import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
// import RazorpayCheckout from 'react-native-razorpay';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { paymentApi, unwrapApiResponse, walletApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { useNavigation } from '@react-navigation/native';

export const WalletScreen = () => {
  const user = useAppSelector((s) => s.auth.user);
  const navigation = useNavigation<any>();
  const [balance, setBalance] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [balRes, pkgRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getPackages(),
      ]);
      setBalance(unwrapApiResponse(balRes));
      const packagePayload = unwrapApiResponse<any[]>(pkgRes);
      setPackages(Array.isArray(packagePayload) ? packagePayload : []);
    } catch (error: any) {
      setBalance(null);
      setPackages([]);
      Alert.alert('Error', error?.message || 'Unable to load wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buyPackage = async (packageId: string) => {
    try {
      const res = unwrapApiResponse<any>(await walletApi.purchaseCoins(packageId));
      Alert.alert('Success', res?.message || 'Coins added to your wallet!');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || e?.error?.message || 'Purchase failed');
    }
  };

  const withdrawEarnings = async () => {
    try {
      const res = unwrapApiResponse<any>(await walletApi.withdrawEarnings());
      Alert.alert('Success', res?.message || 'Earnings withdrawn to your wallet.');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || e?.error?.message || 'Withdrawal failed');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroEyebrow}>Wallet</Text>
            <Text style={styles.heroTitle}>Coins & rewards</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>⚡ Fast</Text>
          </View>
        </View>

        <Text style={styles.balanceLabel}>Available balance</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
        ) : (
          <>
            <Text style={styles.balanceValue}>{balance?.coinBalance ?? user?.coinBalance ?? 0}</Text>
            <Text style={styles.fiat}>Wallet cash: ₹{(balance?.walletBalance ?? user?.walletBalance ?? 0).toLocaleString()}</Text>
            {balance?.availableEarnings != null && balance.availableEarnings > 0 ? (
              <Text style={styles.fiat}>Available payout: ₹{balance.availableEarnings.toLocaleString()}</Text>
            ) : null}
            <Text style={styles.helperText}>Send gifts, unlock posts, and support creators instantly.</Text>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Coins</Text>
                <Text style={styles.statValue}>{balance?.coinBalance ?? user?.coinBalance ?? 0}</Text>
              </View>
              <View style={styles.statCardAlt}>
                <Text style={styles.statLabel}>Cash</Text>
                <Text style={styles.statValue}>₹{(balance?.walletBalance ?? user?.walletBalance ?? 0).toLocaleString()}</Text>
              </View>
            </View>
            {balance?.availableEarnings != null && balance.availableEarnings > 0 ? (
              <View style={[styles.statRow, { marginTop: spacing.sm }]}> 
                <View style={[styles.statCardAlt, { flex: 1 }]}> 
                  <Text style={styles.statLabel}>Payout earnings</Text>
                  <Text style={styles.statValue}>₹{balance.availableEarnings.toLocaleString()}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Button title="🪙 Buy Coins" onPress={() => navigation.navigate('BuyCoins')} style={styles.buyScreenBtn} />
              <Button title="💸 Withdraw" onPress={() => navigation.navigate('Withdraw')} style={styles.withdrawBtn} />

            </View>
          </>
        )}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIconBox}>
          <Text style={styles.infoIcon}>✨</Text>
        </View>
        <View style={styles.infoTextBox}>
          <Text style={styles.infoTitle}>Why keep coins?</Text>
          <Text style={styles.infoText}>Top up anytime to unlock exclusive content, support creators, and enjoy a smoother live experience.</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroEyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 2 },
  heroBadge: {
    backgroundColor: 'rgba(255,47,110,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: { color: colors.primary, fontWeight: '700' },
  balanceLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  balanceValue: { fontSize: 44, fontWeight: '800', color: colors.accent, marginTop: spacing.xs },
  fiat: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  helperText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  loader: { marginVertical: spacing.md },
  statRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,47,110,0.10)',
    borderRadius: 16,
    padding: spacing.md,
  },
  statCardAlt: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: spacing.md,
  },
  statLabel: { color: colors.textSecondary, fontSize: 12 },
  statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 4 },
  actionRow: {
    display: 'flex',
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // flexWrap: 'wrap',
  },
  withdrawBtn: {
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: '#2a2530',
    borderRadius: 999,
    minWidth: 140,
  },
  buyScreenBtn: {
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 999,
    minWidth: 140,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,47,110,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  infoIcon: { fontSize: 18 },
  infoTextBox: { flex: 1 },
  infoTitle: { color: colors.textPrimary, fontWeight: '700', marginBottom: 2 },
  infoText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
