import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';

export type GiftItem = {
  giftId: string;
  name: string;
  coinCost: number;
  category?: string;
  emoji?: string;
};

export type LiveGiftEvent = {
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  giftId: string;
  giftName: string;
  giftEmoji?: string;
  coinCost: number;
  quantity?: number;
  totalCoins: number;
  sentAt: string;
};

const GIFT_EMOJI: Record<string, string> = {
  gift_rose: '🌹',
  gift_kiss: '💋',
  gift_coffee: '☕',
  gift_teddy: '🧸',
  gift_heart: '❤️',
  gift_fire: '🔥',
  gift_star: '⭐',
  gift_cake: '🎂',
  gift_party: '🎉',
  gift_diamond: '💎',
  gift_crown: '👑',
  gift_rocket: '🚀',
  gift_car: '🏎️',
  gift_yacht: '🛥️',
  gift_castle: '🏰',
  gift_dragon: '🐉',
  gift_universe: '🌌',
};

export const getGiftEmoji = (giftId: string, giftName?: string, emoji?: string) => {
  if (emoji) return emoji;
  if (GIFT_EMOJI[giftId]) return GIFT_EMOJI[giftId];
  const key = giftName?.toLowerCase() || '';
  if (key.includes('rose')) return '🌹';
  if (key.includes('kiss')) return '💋';
  if (key.includes('coffee')) return '☕';
  if (key.includes('teddy')) return '🧸';
  if (key.includes('heart')) return '❤️';
  if (key.includes('fire')) return '🔥';
  if (key.includes('star')) return '⭐';
  if (key.includes('cake')) return '🎂';
  if (key.includes('party')) return '🎉';
  if (key.includes('diamond')) return '💎';
  if (key.includes('crown')) return '👑';
  if (key.includes('rocket')) return '🚀';
  if (key.includes('car')) return '🏎️';
  if (key.includes('yacht')) return '🛥️';
  if (key.includes('castle')) return '🏰';
  if (key.includes('dragon')) return '🐉';
  if (key.includes('universe')) return '🌌';
  return '🎁';
};

/** 2-second burst animation when a gift is sent */
export const GiftBurstAnimation = ({
  emoji,
  label,
  onDone,
}: {
  emoji: string;
  label?: string;
  onDone: () => void;
}) => {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1.2, friction: 4, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.6, duration: 500, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -80, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => finished && onDone());
  }, [opacity, scale, translateY, onDone]);

  return (
    <Animated.View
      style={[styles.burstWrap, { opacity, transform: [{ scale }, { translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.burstEmoji}>{emoji}</Text>
      {label ? <Text style={styles.burstLabel}>{label}</Text> : null}
    </Animated.View>
  );
};

type GiftPickerModalProps = {
  visible: boolean;
  gifts: GiftItem[];
  coinBalance: number;
  sending?: boolean;
  onClose: () => void;
  onSelectGift: (gift: GiftItem) => void;
};

export const GiftPickerModal = ({
  visible,
  gifts,
  coinBalance,
  sending,
  onClose,
  onSelectGift,
}: GiftPickerModalProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Send a Gift</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Your coins</Text>
          <Text style={styles.balanceValue}>🪙 {coinBalance.toLocaleString()}</Text>
        </View>

        {sending ? (
          <ActivityIndicator color={colors.primary} style={styles.sendingLoader} />
        ) : (
          <FlatList
            data={gifts}
            keyExtractor={(item) => item.giftId}
            numColumns={3}
            contentContainerStyle={styles.giftGrid}
            columnWrapperStyle={styles.giftRow}
            renderItem={({ item }) => {
              const emoji = getGiftEmoji(item.giftId, item.name, item.emoji);
              const canAfford = coinBalance >= item.coinCost;
              return (
                <TouchableOpacity
                  style={[styles.giftCard, !canAfford && styles.giftCardDisabled]}
                  onPress={() => canAfford && onSelectGift(item)}
                  disabled={!canAfford || sending}
                  activeOpacity={0.75}
                >
                  <Text style={styles.giftCardEmoji}>{emoji}</Text>
                  <Text style={styles.giftCardName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.giftCardCost}>🪙 {item.coinCost}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  burstWrap: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: '38%',
    alignItems: 'center',
    zIndex: 10,
  },
  burstEmoji: { fontSize: 72 },
  burstLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.lg,
    maxHeight: '62%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalClose: { color: colors.textSecondary, fontSize: 20, fontWeight: '700' },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: { ...typography.bodySmall, color: colors.textSecondary },
  balanceValue: { ...typography.body, color: colors.accent, fontWeight: '700' },
  sendingLoader: { paddingVertical: spacing.xl },
  giftGrid: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  giftRow: { gap: spacing.sm, marginBottom: spacing.sm },
  giftCard: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '31%',
  },
  giftCardDisabled: { opacity: 0.45 },
  giftCardEmoji: { fontSize: 32 },
  giftCardName: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  giftCardCost: { ...typography.caption, color: colors.accent, marginTop: 4, fontWeight: '700' },
});
