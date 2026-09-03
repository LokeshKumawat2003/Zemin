import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import Icon from '@react-native-vector-icons/material-icons';
import { colors, typography, spacing } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { unwrapApiResponse, walletApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Withdraw'>;

export const WithdrawScreen = ({ navigation }: Props) => {
  const user = useAppSelector((s) => s.auth.user);
  const { fs } = useResponsive();
  const [amount, setAmount] = useState('500');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);
  const [selectedMethodType, setSelectedMethodType] = useState<'bank' | 'upi'>('bank');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableEarnings, setAvailableEarnings] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = unwrapApiResponse<any>(await walletApi.getBalance());
      setAvailableEarnings(res.availableEarnings ?? res.walletBalance ?? 0);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to load earnings balance');
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const res = unwrapApiResponse<any>(await walletApi.getPaymentMethods());
      setPaymentMethods(Array.isArray(res) ? res : []);
    } catch (e: any) {
      // ignore; not critical
    }
  }, []);

  useEffect(() => {
    loadBalance();
    loadPaymentMethods();
  }, [loadBalance, loadPaymentMethods]);

  const handleContinue = async () => {
    const parsedAmount = Number(amount);

    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    if (availableEarnings !== null && parsedAmount > availableEarnings) {
      Alert.alert('Amount exceeds balance', 'Please enter an amount that is within your available payout balance.');
      return;
    }

    if (selectedMethodType === 'bank') {
      if (!selectedMethodId && (!accountName.trim() || !accountNumber.trim() || !ifscCode.trim())) {
        Alert.alert('Enter bank details', 'Please fill account holder name, account number and IFSC code.');
        return;
      }
    } else {
      if (!selectedMethodId && !upiId.trim()) {
        Alert.alert('Enter UPI', 'Please enter a valid UPI ID or choose a saved UPI method.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = { amount: parsedAmount };
      if (selectedMethodId) {
        // Use saved method
        const sel = paymentMethods.find((p) => p._id === selectedMethodId);
        if (sel) {
          if (sel.type === 'upi') {
            payload.method = 'upi';
            payload.upiId = sel.details?.upiId || sel.details?.vpa || '';
          } else {
            payload.method = 'bank_transfer';
            payload.bankDetails = sel.details;
          }
        }
      } else if (selectedMethodType === 'upi') {
        payload.method = 'upi';
        payload.upiId = upiId.trim();
      } else {
        payload.method = 'bank_transfer';
        payload.bankDetails = {
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          accountName: accountName.trim(),
        };
      }

      payload.savePaymentMethod = savePaymentMethod;

      const res = unwrapApiResponse<any>(await walletApi.withdrawEarnings(payload));
      if (savePaymentMethod) {
        await loadPaymentMethods();
      }
      Alert.alert('Success', `Withdrawal requested for ₹${res.amount}.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || e?.error?.message || 'Withdrawal failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer centered={false} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Icon name="payments" size={fs(25)} color={colors.primary} />
          </View>
          <View style={styles.headerTextBlock}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>Secure payout</Text>
            </View>
            <Text style={styles.title}>Withdraw earnings</Text>
            <Text style={styles.subtitle}>Move your creator balance into your preferred bank or UPI account.</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Available payout balance</Text>
          {loadingBalance ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: spacing.sm }} />
          ) : (
            <Text style={styles.summaryValue}>₹{(availableEarnings ?? 0).toLocaleString()}</Text>
          )}
          <Text style={styles.summaryHint}>Your current creator earnings available for withdrawal.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />

          <View style={{ marginBottom: spacing.sm }}>
            <Text style={styles.inputLabel}>Payout method</Text>
            <View style={styles.methodToggle}>
              <TouchableOpacity
                style={[styles.methodButton, selectedMethodType === 'bank' && styles.methodButtonActive]}
                onPress={() => { setSelectedMethodType('bank'); setSelectedMethodId(null); }}
              >
                <Text style={selectedMethodType === 'bank' ? styles.methodButtonTextActive : styles.methodButtonText}>Bank transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodButton, selectedMethodType === 'upi' && styles.methodButtonActive]}
                onPress={() => { setSelectedMethodType('upi'); setSelectedMethodId(null); }}
              >
                <Text style={selectedMethodType === 'upi' ? styles.methodButtonTextActive : styles.methodButtonText}>UPI</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.inputLabel}>Saved methods</Text>
            <Text style={styles.sectionHint}>Pick one to reuse</Text>
          </View>
          {paymentMethods.filter((p) => p.type === selectedMethodType).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No saved {selectedMethodType === 'bank' ? 'bank' : 'UPI'} methods yet</Text>
            </View>
          ) : (
            paymentMethods
              .filter((p) => p.type === selectedMethodType)
              .map((pm) => {
                const methodLabel = pm.label || (pm.type === 'upi' ? 'UPI account' : 'Bank account');
                const methodDetail = pm.type === 'upi'
                  ? pm.details?.upiId || pm.details?.vpa || 'No UPI ID saved'
                  : `${pm.details?.accountName || 'Bank account'} • ${pm.details?.ifscCode || 'IFSC unavailable'}`;

                return (
                  <TouchableOpacity
                    key={pm._id}
                    onPress={() => {
                      setSelectedMethodId(pm._id);
                      if (pm.type === 'upi') {
                        setUpiId(pm.details?.upiId || pm.details?.vpa || '');
                      } else {
                        setAccountName(pm.details?.accountName || '');
                        setAccountNumber(pm.details?.accountNumber || '');
                        setIfscCode(pm.details?.ifscCode || '');
                      }
                    }}
                    style={[
                      styles.savedMethod,
                      selectedMethodId === pm._id && styles.savedMethodActive,
                    ]}
                  >
                    <View style={styles.savedMethodLeft}>
                      <View style={styles.savedMethodIcon}>
                        <Icon name={pm.type === 'upi' ? 'smartphone' : 'account-balance'} size={fs(19)} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedMethodTitle}>{methodLabel}</Text>
                        <Text style={styles.savedMethodMeta}>{methodDetail}</Text>
                      </View>
                    </View>
                    {pm.isDefault ? <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View> : null}
                  </TouchableOpacity>
                );
              })
          )}

          <View style={styles.switchRow}>
            <Switch value={savePaymentMethod} onValueChange={setSavePaymentMethod} />
            <Text style={styles.switchText}>Save this method for next time</Text>
          </View>

          {selectedMethodType === 'bank' ? (
            <>
              <Text style={styles.inputLabel}>Account holder name</Text>
              <TextInput
                style={styles.input}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Account holder name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Account number</Text>
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Account number"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>IFSC code</Text>
              <TextInput
                style={styles.input}
                value={ifscCode}
                onChangeText={setIfscCode}
                placeholder="IFSC code"
                autoCapitalize="characters"
                placeholderTextColor={colors.textSecondary}
              />
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>UPI ID</Text>
              <TextInput
                style={styles.input}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="example@bank or example@upi"
                placeholderTextColor={colors.textSecondary}
              />
            </>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.helperText}>Your payout will be requested via bank transfer. Razorpay payout integration is not shown in the app yet.</Text>
            <Text style={[styles.helperText, { marginTop: spacing.sm }]}>Amount must be less than or equal to your available earnings balance of ₹{(availableEarnings ?? 0).toLocaleString()}.</Text>
          </View>
        </View>

        <Button
          title="Request withdrawal"
          onPress={handleContinue}
          style={styles.ctaBtn}
          loading={isSubmitting}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, paddingTop: spacing.md, paddingBottom: spacing.xxl },
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
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,47,110,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerIconText: { fontSize: 22 },
  headerTextBlock: { flex: 1 },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,47,110,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 6,
  },
  headerBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 2 },
  subtitle: { color: colors.textSecondary, marginTop: 4, fontSize: 13, lineHeight: 18 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  summaryLabel: { color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryValue: { color: colors.accent, fontSize: 34, fontWeight: '800', marginTop: 4 },
  summaryHint: { color: colors.textSecondary, marginTop: 2 },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  inputLabel: { color: colors.textPrimary, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: 6 },
  sectionHint: { color: colors.textSecondary, fontSize: 12 },
  helperText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  infoBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 48,
  },
  emptyState: {
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  emptyStateText: { color: colors.textSecondary, fontSize: 13 },
  savedMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  savedMethodActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,47,110,0.08)',
  },
  savedMethodLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  savedMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  savedMethodIconText: { fontSize: 16 },
  savedMethodTitle: { color: colors.textPrimary, fontWeight: '700' },
  savedMethodMeta: { color: colors.textSecondary, marginTop: 3, fontSize: 12 },
  defaultBadge: {
    backgroundColor: 'rgba(255,47,110,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  defaultBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  switchText: { marginLeft: 10, color: colors.textPrimary, fontWeight: '600' },
  methodToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, overflow: 'hidden' },
  methodButton: { flex: 1, padding: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  methodButtonActive: { backgroundColor: colors.primary },
  methodButtonText: { color: colors.textPrimary, fontWeight: '700' },
  methodButtonTextActive: { color: '#fff', fontWeight: '800' },
});
