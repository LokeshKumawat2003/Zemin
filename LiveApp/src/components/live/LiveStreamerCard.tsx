import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, spacing } from '../../theme';
import { getAvatarInitials } from '../../screens/home/homeFeedUtils';
import { getGiftEmoji } from './LiveGiftEffects';

export type LiveStreamerCardData = {
  id: string;
  title: string;
  displayName: string;
  username?: string;
  thumbnail?: string;
  viewers?: number;
  isLive?: boolean;
  isVerified?: boolean;
  scheduledAt?: string;
  status?: 'waiting' | 'live' | 'ended';
  entryFeeCoins?: number;
  entryGift?: {
    giftId: string;
    name?: string;
    emoji?: string;
    coinCost?: number;
  } | null;
  isJoinable?: boolean;
};

type Props = {
  item: LiveStreamerCardData;
  variant?: 'public' | 'vip';
  onPress?: () => void;
  onGiftPress?: () => void;
};

const formatViewers = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

const formatSchedule = (iso?: string) => {
  if (!iso) return 'Scheduled';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const LiveStreamerCard = ({ item, variant = 'public', onPress, onGiftPress }: Props) => {
  const avatarInitial = getAvatarInitials(item.displayName || item.username);
  const isLive = item.status === 'live' || item.isLive;
  const giftEmoji = item.entryGift
    ? getGiftEmoji(item.entryGift.giftId, item.entryGift.name, item.entryGift.emoji)
    : '🎁';
  const giftCost = item.entryGift?.coinCost ?? item.entryFeeCoins ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
        </View>
      )}

      {isLive ? (
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>🔴 LIVE</Text>
        </View>
      ) : variant === 'vip' ? (
        <View style={styles.scheduledTag}>
          <Text style={styles.scheduledTagText}>📅 VIP</Text>
        </View>
      ) : null}

      {isLive ? (
        <View style={styles.viewerTag}>
          <Text style={styles.viewerTagText}>👁 {formatViewers(item.viewers)}</Text>
        </View>
      ) : null}

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.displayName}
          </Text>
          {item.isVerified ? <Text style={styles.verified}>✔️</Text> : null}
        </View>
        <Text style={styles.tagline} numberOfLines={1}>
          {isLive ? item.title : formatSchedule(item.scheduledAt)}
        </Text>

        {variant === 'vip' ? (
          <TouchableOpacity
            style={[
              styles.giftPayBtn,
              !isLive && styles.giftPayBtnDisabled,
              item.isJoinable === false && styles.giftPayBtnDisabled,
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              if (isLive && item.isJoinable !== false) onGiftPress?.();
            }}
            disabled={!isLive || item.isJoinable === false}
          >
            <Text style={styles.giftPayEmoji}>{giftEmoji}</Text>
            <View style={styles.giftPayTextWrap}>
              <Text style={styles.giftPayTitle}>
                {isLive ? (item.isJoinable === false ? 'Room full' : 'Tap gift to enter') : 'Scheduled'}
              </Text>
              <Text style={styles.giftPayCost}>🪙 {giftCost}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.bottomRow}>
            <Text style={styles.taglineInline} numberOfLines={1}>
              {item.title}
            </Text>
            {giftCost > 0 ? <Text style={styles.price}>🪙 {giftCost}</Text> : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const CARD_GAP = spacing.sm ?? 8;

export const liveStreamerCardStyles = StyleSheet.create({
  gridRow: { gap: CARD_GAP },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginBottom: CARD_GAP,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    aspectRatio: 0.78,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: '#211d27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  liveTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  scheduledTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scheduledTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  viewerTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewerTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  name: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  verified: {
    fontSize: 10,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taglineInline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    flex: 1,
  },
  price: {
    color: '#f5b400',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  giftPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,47,110,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 2,
  },
  giftPayBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  giftPayEmoji: {
    fontSize: 24,
  },
  giftPayTextWrap: {
    flex: 1,
  },
  giftPayTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  giftPayCost: {
    color: '#ffe08a',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
