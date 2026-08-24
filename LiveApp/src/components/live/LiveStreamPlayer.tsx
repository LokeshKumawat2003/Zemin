import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { LiveStreamOverlay } from './LiveStreamOverlay';
import { LiveKitViewerVideo } from './LiveKitViewerVideo';
import { isLiveKitConfigured } from '../../utils/livekit';

type Props = {
  title: string;
  hostName: string;
  viewers: number;
  livekitUrl?: string;
  webrtcToken?: string;
  livekitEnabled?: boolean;
  connecting?: boolean;
  error?: string | null;
  onConnected?: () => void;
  onStreamError?: (message: string) => void;
};

export const LiveStreamPlayer = ({
  title,
  hostName,
  viewers,
  livekitUrl,
  webrtcToken,
  livekitEnabled,
  connecting = true,
  error = null,
  onConnected,
  onStreamError,
}: Props) => {
  const canUseLiveKit = useMemo(
    () => isLiveKitConfigured(webrtcToken, livekitEnabled),
    [webrtcToken, livekitEnabled]
  );

  return (
    <View style={styles.container}>
      <View style={styles.videoArea}>
        {canUseLiveKit ? (
          <LiveKitViewerVideo
            livekitUrl={livekitUrl}
            webrtcToken={webrtcToken}
            livekitEnabled={livekitEnabled}
            onConnected={onConnected}
            onError={onStreamError}
          />
        ) : null}

        {connecting && !error ? (
          <View style={styles.centered} pointerEvents="none">
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.status}>
              {canUseLiveKit ? 'Connecting to live video…' : 'Waiting for host camera…'}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <Text style={styles.hint}>Chat and gifts still work while video reconnects.</Text>
          </View>
        ) : null}
      </View>
      {/* <LiveStreamOverlay title={title} hostName={hostName} viewers={viewers} /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  status: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  error: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
