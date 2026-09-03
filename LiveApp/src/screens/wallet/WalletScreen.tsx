import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Button } from '../../components/common/Button';
import { colors, typography } from '../../theme';
import { paymentApi, unwrapApiResponse, walletApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '../../hooks/useResponsive';
import { ScreenContainer } from '../../components/common/ScreenContainer';

export const WalletScreen = () => {
  const user = useAppSelector((s) => s.auth.user);
  const navigation = useNavigation<any>();
  const { fs, sp } = useResponsive();
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        heroCard: {
          backgroundColor: colors.surface,
          borderRadius: sp(24),
          padding: sp(24),
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: sp(16),
        },
        heroTopRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: sp(8),
        },
        heroEyebrow: {
          color: colors.primary,
          fontSize: fs(12),
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        heroTitle: {
          color: colors.textPrimary,
          fontSize: fs(20),
          fontWeight: '800',
          marginTop: sp(2),
        },
        heroBadge: {
          backgroundColor: 'rgba(255,47,110,0.16)',
          paddingHorizontal: sp(8),
          paddingVertical: sp(6),
          borderRadius: 999,
        },
        heroBadgeText: { color: colors.primary, fontWeight: '700', fontSize: fs(12) },
        balanceLabel: {
          ...typography.bodySmall,
          fontSize: fs(14),
          color: colors.textSecondary,
          marginBottom: sp(4),
        },
        balanceValue: {
          fontSize: fs(44),
          fontWeight: '800',
          color: colors.accent,
          marginTop: sp(4),
        },
        fiat: { ...typography.body, fontSize: fs(16), color: colors.textSecondary, marginTop: sp(4) },
        helperText: {
          ...typography.caption,
          fontSize: fs(12),
          color: colors.textSecondary,
          marginTop: sp(4),
        },
        loader: { marginVertical: sp(16) },
        statRow: { flexDirection: 'row', marginTop: sp(16), gap: sp(10), flexWrap: 'wrap' },
        statCard: {
          flex: 1,
          minWidth: sp(120),
          backgroundColor: 'rgba(255,47,110,0.10)',
          borderRadius: sp(16),
          padding: sp(16),
        },
        statCardAlt: {
          flex: 1,
          minWidth: sp(120),
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: sp(16),
          padding: sp(16),
        },
        statLabel: { color: colors.textSecondary, fontSize: fs(12) },
        statValue: {
          color: colors.textPrimary,
          fontSize: fs(18),
          fontWeight: '700',
          marginTop: sp(4),
        },
        actionRow: {
          marginTop: sp(16),
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp(10),
          flexWrap: 'wrap',
        },
        withdrawBtn: {
          paddingHorizontal: sp(16),
          height: sp(44),
          backgroundColor: '#2a2530',
          borderRadius: 999,
          minWidth: sp(140),
          flex: 1,
        },
        buyScreenBtn: {
          paddingHorizontal: sp(16),
          height: sp(44),
          backgroundColor: colors.primary,
          borderRadius: 999,
          minWidth: sp(140),
          flex: 1,
        },
        infoCard: {
          backgroundColor: colors.surface,
          borderRadius: sp(20),
          padding: sp(16),
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
        },
        infoIconBox: {
          width: sp(44),
          height: sp(44),
          borderRadius: sp(22),
          backgroundColor: 'rgba(255,47,110,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: sp(8),
        },
        infoIcon: { fontSize: fs(18) },
        infoTextBox: { flex: 1 },
        infoTitle: {
          color: colors.textPrimary,
          fontWeight: '700',
          fontSize: fs(15),
          marginBottom: sp(2),
        },
        infoText: {
          color: colors.textSecondary,
          fontSize: fs(13),
          lineHeight: fs(18),
        },
      }),
    [fs, sp]
  );

  return (
    <ScreenContainer style={styles.container}>
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
              <View style={[styles.statRow, { marginTop: sp(8) }]}>
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
    </ScreenContainer>
  );
};
