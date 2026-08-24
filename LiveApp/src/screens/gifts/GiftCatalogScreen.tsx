import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { getGiftEmoji } from '../../components/live/LiveGiftEffects';
import { colors, typography, spacing } from '../../theme';
import { walletApi } from '../../api';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'GiftCatalog'>;

export const GiftCatalogScreen = ({ navigation }: Props) => {
  const [gifts, setGifts] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [giftRes, balRes] = await Promise.all([
          walletApi.getGiftCatalog(),
          walletApi.getBalance(),
        ]);
        setGifts(giftRes.data?.gifts || []);
        setBalance(balRes.data?.coinBalance || 0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.balance}>{balance} coins available</Text>
      <FlatList
        data={gifts}
        keyExtractor={(item) => item.giftId}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.gift}>
            <Text style={styles.emoji}>{getGiftEmoji(item.giftId, item.name, item.emoji)}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.cost}>{item.coinCost} coins</Text>
          </TouchableOpacity>
        )}
      />
      <Button
        title="Buy More Coins"
        variant="outline"
        onPress={() => navigation.navigate('Wallet')}
        style={styles.btn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  balance: { ...typography.body, color: colors.accent, fontWeight: '700', marginBottom: spacing.md },
  grid: { gap: spacing.sm },
  gift: {
    flex: 1,
    margin: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '31%',
  },
  emoji: { fontSize: 28 },
  name: { ...typography.caption, color: colors.textPrimary, marginTop: 4, textAlign: 'center' },
  cost: { ...typography.caption, color: colors.accent, marginTop: 2 },
  btn: { marginTop: spacing.md },
});
