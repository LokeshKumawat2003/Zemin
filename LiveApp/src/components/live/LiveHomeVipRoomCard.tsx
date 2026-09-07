import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors as baseColors, spacing } from '../../theme';
import { LiveStreamerCard, LiveStreamerCardData } from './LiveStreamerCard';

const colors = {
  ...baseColors,
  background: '#0d0b10',
  surface: '#18151c',
  surfaceAlt: '#211d27',
  primary: '#ff2f6e',
  accentPurple: '#7c3aed',
  gold: '#f5b400',
  text: '#ffffff',
  textSecondary: '#9b95a3',
  border: '#2a2530',
};

type Props = {
  item: any;
  cardWidth: number;
  isMine: boolean;
  isLive: boolean;
  starting: boolean;
  onPress: () => void;
  onStart: () => void;
};

export const LiveHomeVipRoomCard = ({ item, cardWidth, isMine, isLive, starting, onPress, onStart }: Props) => {
  const cardData: LiveStreamerCardData = {
    id: String(item.id),
    title: item.title,
    displayName: item.host?.displayName || item.host?.username || 'Creator',
    username: item.host?.username,
    thumbnail: item.thumbnail || item.host?.avatar,
    viewers: item.viewerCount ?? 0,
    isLive: item.status === 'live',
    status: item.status,
    scheduledAt: item.scheduledAt,
    entryFeeCoins: item.entryFeeCoins,
    entryGift: item.entryGift,
    isJoinable: item.isJoinable,
    isVerified: item.host?.isVerified,
  };

  return (
    <View key={String(item.id)} style={[styles.wrap, { width: cardWidth }]}>
      <LiveStreamerCard item={cardData} variant="vip" onPress={onPress} onGiftPress={onPress} />
      {isMine && !isLive ? (
        <TouchableOpacity style={styles.startButton} onPress={onStart} disabled={starting}>
          <Text style={styles.startButtonText}>{starting ? 'Starting...' : 'Start VIP Room'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  startButton: {
    backgroundColor: colors.accentPurple,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: -4,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
