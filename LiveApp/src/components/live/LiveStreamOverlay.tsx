import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';

type Props = {
  title: string;
  viewers: number;
  hostName?: string;
};

export const LiveStreamOverlay = ({ title, viewers, hostName }: Props) => (
  <View style={styles.overlay} pointerEvents="none">
    <View style={styles.topRow}>
      <View style={styles.liveBadge}>
        <Text style={styles.liveText}>● LIVE</Text>
      </View>
      <Text style={styles.viewers}>{viewers} watching</Text>
    </View>
    <View style={styles.bottom}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {hostName ? <Text style={styles.host}>@{hostName}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    backgroundColor: colors.live,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  viewers: {
    ...typography.caption,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bottom: {
    gap: 4,
  },
  title: {
    ...typography.h3,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  host: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
