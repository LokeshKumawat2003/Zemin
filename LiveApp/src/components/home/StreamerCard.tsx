import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { getAvatarInitials } from '../../screens/home/homeFeedUtils';
import { homeColors as colors, StreamerCardData, formatViewers } from './homeTheme';

interface Props {
  item: StreamerCardData;
  onPress: () => void;
}

export const StreamerCard = ({ item, onPress }: Props) => {
  const { fs, sp, cardWidth } = useResponsive();
  const avatarInitial = getAvatarInitials(item.displayName || item.username);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        streamerCard: {
          width: cardWidth,
          marginBottom: sp(8),
          borderRadius: sp(14),
          overflow: 'hidden',
          backgroundColor: colors.surface,
        },
        streamerImage: { width: '100%', aspectRatio: 0.78, resizeMode: 'cover' as const },
        streamerImagePlaceholder: {
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarFallbackCircle: {
          width: sp(72),
          height: sp(72),
          borderRadius: sp(36),
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarFallbackText: {
          color: '#fff',
          fontSize: fs(30),
          fontWeight: '800',
          textTransform: 'uppercase',
        },
        streamerLiveTag: {
          position: 'absolute',
          top: sp(8),
          left: sp(8),
          backgroundColor: colors.primary,
          borderRadius: sp(10),
          paddingHorizontal: sp(8),
          paddingVertical: sp(3),
        },
        streamerLiveTagText: { color: '#fff', fontSize: fs(10), fontWeight: '700' },
        viewerTag: {
          position: 'absolute',
          top: sp(8),
          right: sp(8),
          backgroundColor: 'rgba(0,0,0,0.55)',
          borderRadius: sp(10),
          paddingHorizontal: sp(8),
          paddingVertical: sp(3),
        },
        viewerTagText: { color: '#fff', fontSize: fs(10), fontWeight: '600' },
        streamerInfo: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: sp(8),
          backgroundColor: 'rgba(0,0,0,0.45)',
        },
        streamerNameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp(4),
          marginBottom: sp(2),
        },
        streamerName: { color: '#fff', fontWeight: '700', fontSize: fs(14) },
        verifiedIcon: { fontSize: fs(10) },
        streamerBottomRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        streamerTagline: {
          color: 'rgba(255,255,255,0.85)',
          fontSize: fs(11),
          flex: 1,
        },
        streamerPrice: {
          color: colors.gold,
          fontSize: fs(11),
          fontWeight: '700',
          marginLeft: sp(6),
        },
      }),
    [fs, sp, cardWidth]
  );

  return (
    <TouchableOpacity style={styles.streamerCard} onPress={onPress} activeOpacity={0.85}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.streamerImage} />
      ) : (
        <View style={[styles.streamerImage, styles.streamerImagePlaceholder]}>
          <View style={styles.avatarFallbackCircle}>
            <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
          </View>
        </View>
      )}

      {item.isLive && (
        <View style={styles.streamerLiveTag}>
          <Text style={styles.streamerLiveTagText}>🔴 LIVE</Text>
        </View>
      )}
      <View style={styles.viewerTag}>
        <Text style={styles.viewerTagText}>👁 {formatViewers(item.viewers)}</Text>
      </View>

      <View style={styles.streamerInfo}>
        <View style={styles.streamerNameRow}>
          <Text style={styles.streamerName} numberOfLines={1}>
            {item.displayName}
          </Text>
          {item.verified && <Text style={styles.verifiedIcon}>✔️</Text>}
        </View>
        <View style={styles.streamerBottomRow}>
          <Text style={styles.streamerTagline} numberOfLines={1}>
            {item.tagline}
          </Text>
          <Text style={styles.streamerPrice}>🪙 {item.coinPrice}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
