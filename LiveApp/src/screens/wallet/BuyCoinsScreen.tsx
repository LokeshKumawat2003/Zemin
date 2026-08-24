import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { paymentApi, unwrapApiResponse, walletApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'BuyCoins'>;

export const BuyCoinsScreen = ({ navigation }: Props) => {
  const user = useAppSelector((s) => s.auth.user);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
            await paymentApi.verifyPayment({
              gateway: 'razorpay',
              orderId: paymentResult.razorpay_order_id,
              paymentId: paymentResult.razorpay_payment_id,
              signature: paymentResult.razorpay_signature,
            });
            Alert.alert('Success', 'Coins purchased successfully!');
            navigation.goBack();
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
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        {/* <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity> */}
        <View style={styles.headerTextBlock}>
          <Text style={styles.eyebrow}>Purchase</Text>
          <Text style={styles.title}>Buy Coins</Text>
          <Text style={styles.subtitle}>Fill your wallet with coins for gifts, unlocks, and more.</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Current balance</Text>
        <Text style={styles.summaryValue}>{user?.coinBalance ?? 0}</Text>
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
              <View style={styles.packageInfo}>
                <View style={styles.packageTopRow}>
                  <Text style={styles.pkgCoins}>{Math.floor((item.coins + (item.bonusCoins || 0)) * 0.8)} net coins</Text>
                  {item.isPopular ? <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>Popular</Text></View> : null}
                </View>
                <Text style={styles.pkgValue}>{item.coins + (item.bonusCoins || 0)} coins listed • 20% GST applied</Text>
                {item.bonusCoins ? <Text style={styles.bonus}>+{item.bonusCoins} bonus</Text> : null}
                <Text style={styles.pkgPrice}>₹{(item.priceINR ?? 0).toLocaleString()} purchase value</Text>
              </View>
              <Button title="Buy" onPress={() => buyPackage(item.id)} style={styles.buyBtn} />
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,47,110,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  backBtnText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  headerTextBlock: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 2 },
  subtitle: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  summaryLabel: { color: colors.textSecondary, fontSize: 12 },
  summaryValue: { color: colors.accent, fontSize: 34, fontWeight: '800', marginTop: 4 },
  summaryHint: { color: colors.textSecondary, marginTop: 2 },
  noteBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  noteText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  loader: { marginVertical: spacing.lg },
  listContent: { paddingBottom: spacing.lg },
  packageCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageCardPopular: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,47,110,0.1)',
  },
  packageInfo: { flex: 1 },
  packageTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pkgCoins: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  popularBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  popularBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bonus: { color: colors.success, marginTop: 4, fontSize: 12 },
  pkgValue: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
  pkgPrice: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  buyBtn: { paddingHorizontal: spacing.md, height: 40, minWidth: 82, backgroundColor: colors.primary },
  emptyState: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
});
