import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { walletApi } from '../../api';
import { getGiftEmoji, GiftItem } from './LiveGiftEffects';

type Props = {
  selectedGiftId?: string;
  onSelect: (gift: GiftItem) => void;
};

export const GiftEntryPicker = ({ selectedGiftId, onSelect }: Props) => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await walletApi.getGiftCatalog();
        setGifts(res.data?.gifts || []);
      } catch {
        setGifts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.loadingText}>Loading gifts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Choose entry gift</Text>
      <Text style={styles.hint}>Viewers tap this gift to pay and join your private room.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {gifts.map((gift) => {
          const selected = gift.giftId === selectedGiftId;
          const emoji = getGiftEmoji(gift.giftId, gift.name, gift.emoji);
          return (
            <TouchableOpacity
              key={gift.giftId}
              style={[styles.giftCard, selected && styles.giftCardSelected]}
              onPress={() => onSelect(gift)}
            >
              <Text style={styles.giftEmoji}>{emoji}</Text>
              <Text style={styles.giftName} numberOfLines={1}>
                {gift.name}
              </Text>
              <Text style={styles.giftCost}>🪙 {gift.coinCost}</Text>
              {selected ? <Text style={styles.selectedBadge}>Entry gift</Text> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  giftCard: {
    width: 92,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: 8,
  },
  giftCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,47,110,0.12)',
  },
  giftEmoji: {
    fontSize: 30,
    marginBottom: 4,
  },
  giftName: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  giftCost: {
    color: '#f5b400',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  selectedBadge: {
    marginTop: 6,
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
