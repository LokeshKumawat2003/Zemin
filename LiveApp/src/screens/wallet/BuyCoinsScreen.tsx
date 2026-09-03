import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import RazorpayCheckout from 'react-native-razorpay';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { colors, typography } from '../../theme';
import { paymentApi, unwrapApiResponse, walletApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { ProfileStackParamList } from '../../navigation/types';
import { useResponsive } from '../../hooks/useResponsive';
import { ScreenContainer } from '../../components/common/ScreenContainer';

type Props = NativeStackScreenProps<ProfileStackParamList, 'BuyCoins'>;

export const BuyCoinsScreen = ({ navigation }: Props) => {
  const user = useAppSelector((s) => s.auth.user);
  const { fs, sp } = useResponsive();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        headerCard: {
          backgroundColor: colors.surface,
          borderRadius: sp(24),
          padding: sp(16),
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: sp(16),
          flexDirection: 'row',
          alignItems: 'center',
        },
        headerIcon: {
          width: sp(52),
          height: sp(52),
          borderRadius: sp(26),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,47,110,0.14)',
          marginRight: sp(12),
        },
        headerTextBlock: { flex: 1 },
        eyebrow: {
          color: colors.primary,
          fontSize: fs(12),
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        title: { color: colors.textPrimary, fontSize: fs(24), fontWeight: '800', marginTop: sp(2) },
        subtitle: { color: colors.textSecondary, marginTop: sp(4), fontSize: fs(13) },
        summaryCard: {
          backgroundColor: colors.surface,
          borderRadius: sp(20),
          padding: sp(16),
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: sp(16),
        },
        summaryRow: { flexDirection: 'row', alignItems: 'center' },
        summaryIcon: {
          width: sp(42),
          height: sp(42),
          borderRadius: sp(21),
          backgroundColor: 'rgba(245,180,0,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: sp(10),
        },
        summaryLabel: { color: colors.textSecondary, fontSize: fs(12) },
        summaryValue: { color: colors.accent, fontSize: fs(34), fontWeight: '800', marginTop: sp(4) },
        summaryHint: { color: colors.textSecondary, marginTop: sp(2), fontSize: fs(13) },
        noteBox: {
          marginTop: sp(8),
          padding: sp(8),
          borderRadius: sp(12),
          backgroundColor: 'rgba(255,255,255,0.03)',
        },
        noteText: { color: colors.textSecondary, fontSize: fs(12), lineHeight: fs(18) },
        loader: { marginVertical: sp(24) },
        listContent: { paddingBottom: sp(24) },
        packageCard: {
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: sp(18),
          padding: sp(16),
          marginBottom: sp(8),
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: sp(8),
        },
        packageCardPopular: {
          borderColor: colors.primary,
          backgroundColor: 'rgba(255,47,110,0.1)',
        },
        packageInfo: { flex: 1, minWidth: sp(160) },
        packageIcon: {
          width: sp(38),
          height: sp(38),
          borderRadius: sp(19),
          backgroundColor: 'rgba(245,180,0,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: sp(10),
        },
        packageTopRow: { flexDirection: 'row', alignItems: 'center', gap: sp(8), flexWrap: 'wrap' },
        pkgCoins: { color: colors.textPrimary, fontSize: fs(16), fontWeight: '700' },
        popularBadge: {
          backgroundColor: colors.primary,
          paddingHorizontal: sp(8),
          paddingVertical: sp(3),
          borderRadius: 999,
        },
        popularBadgeText: { color: '#fff', fontSize: fs(10), fontWeight: '700' },
        bonus: { color: colors.success, marginTop: sp(4), fontSize: fs(12) },
        pkgValue: { color: colors.textSecondary, marginTop: sp(4), fontSize: fs(12) },
        pkgPrice: { color: colors.textSecondary, marginTop: sp(4), fontSize: fs(13) },
        buyBtn: {
          paddingHorizontal: sp(16),
          height: sp(40),
          minWidth: sp(82),
          backgroundColor: colors.primary,
        },
        emptyState: {
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: sp(16),
          fontSize: fs(14),
        },
      }),
    [fs, sp]
  );

  const loadPackages = useCallback(async () => {
    try {
      const res = await walletApi.getPackages();
      const packagePayload = unwrapApiResponse<any[]>(res);
      setPackages(Array.isArray(packagePayload) ? packagePayload : []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to load packages');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const buyPackage = async (packageId: string) => {
    if (purchasingPackageId) return;
    setPurchasingPackageId(packageId);
    try {
      const res = unwrapApiResponse<any>(
        await walletApi.purchaseCoins(packageId, 'razorpay', 'INR')
      );

      if (res?.order) {
        const order = res.order;
        const options = {
          key: res.keyId || 'rzp_test_YourPublicKey',
          description: `Buy ${order.notes.packageId}`,
          image: 'https://your-app-icon-url.com/icon.png',
          currency: order.currency,
          amount: order.amount,
          order_id: order.id,
          name: 'Zemin',
          prefill: {
            email: user?.email ?? '',
            contact: '',
          },
          theme: { color: '#FF2F6E' },
        };

        RazorpayCheckout.open(options)
          .then(async (paymentResult: any) => {
            try {
              await paymentApi.verifyPayment({
                gateway: 'razorpay',
                orderId: paymentResult.razorpay_order_id,
                paymentId: paymentResult.razorpay_payment_id,
                signature: paymentResult.razorpay_signature,
              });
              Alert.alert('Success', 'Coins purchased successfully!');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(
                'Payment verification failed',
                error?.error?.message || error?.message || 'Please contact support if money was deducted.'
              );
            }
          })
          .catch((error: any) => {
            Alert.alert('Payment failed', error?.description || 'Unable to complete payment.');
          });
      } else {
        Alert.alert('Success', res?.message || 'Coins added to your wallet!');
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || e?.error?.message || 'Purchase failed');
    } finally {
      setPurchasingPackageId(null);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Icon name="add-circle" size={fs(27)} color={colors.primary} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.eyebrow}>Purchase</Text>
          <Text style={styles.title}>Buy Coins</Text>
          <Text style={styles.subtitle}>Fill your wallet with coins for gifts, unlocks, and more.</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryIcon}>
            <Icon name="monetization-on" size={fs(25)} color="#f5b400" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Current balance</Text>
            <Text style={styles.summaryValue}>{user?.coinBalance ?? 0}</Text>
          </View>
        </View>
        <Text style={styles.summaryHint}>Coins ready to use</Text>
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>Purchase value includes 20% GST. You receive 80% of the coin value after deduction.</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyState}>No coin packages available right now.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.packageCard, item.isPopular ? styles.packageCardPopular : null]}>
              <View style={styles.packageIcon}>
                <Icon name="monetization-on" size={fs(21)} color="#f5b400" />
              </View>
              <View style={styles.packageInfo}>
                <View style={styles.packageTopRow}>
                  <Text style={styles.pkgCoins}>{Math.floor((item.coins + (item.bonusCoins || 0)) * 0.8)} net coins</Text>
                  {item.isPopular ? <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>Popular</Text></View> : null}
                </View>
                <Text style={styles.pkgValue}>{item.coins + (item.bonusCoins || 0)} coins listed • 20% GST applied</Text>
                {item.bonusCoins ? <Text style={styles.bonus}>+{item.bonusCoins} bonus</Text> : null}
                <Text style={styles.pkgPrice}>₹{(item.priceINR ?? 0).toLocaleString()} purchase value</Text>
              </View>
              <Button title="Buy" loading={purchasingPackageId === item.id} onPress={() => buyPackage(item.id)} style={styles.buyBtn} />
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
};
