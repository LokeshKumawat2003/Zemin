import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useTracks,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { isLiveKitConfigured } from '../../utils/livekit';

type Props = {
  livekitUrl?: string;
  webrtcToken?: string;
  livekitEnabled?: boolean;
  onConnected?: () => void;
  onError?: (message: string) => void;
};

function RemoteHostTrack({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const remoteTrack = tracks.find(
    (track) => isTrackReference(track) && !track.participant.isLocal
  );

  useEffect(() => {
    if (remoteTrack && isTrackReference(remoteTrack)) {
      onConnected?.();
    }
  }, [remoteTrack, onConnected]);

  if (remoteTrack && isTrackReference(remoteTrack)) {
    return (
      <VideoTrack
        trackRef={remoteTrack}
        style={StyleSheet.absoluteFillObject}
        objectFit="cover"
      />
    );
  }

  return null;
}

export const LiveKitViewerVideo = ({
  livekitUrl,
  webrtcToken,
  livekitEnabled,
  onConnected,
  onError,
}: Props) => {
  useEffect(() => {
    let active = true;

    const start = async () => {
      if (active) {
        await AudioSession.startAudioSession();
      }
    };

    start();
    return () => {
      active = false;
      AudioSession.stopAudioSession();
    };
  }, []);

  if (!isLiveKitConfigured(webrtcToken, livekitEnabled) || !livekitUrl) {
    return null;
  }

  return (
    <View style={styles.room}>
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={webrtcToken!}
        connect
        audio={false}
        video={false}
        options={{
          adaptiveStream: { pixelDensity: 'screen' },
          dynacast: true,
        }}
        onConnected={() => onConnected?.()}
        onError={(error) => onError?.(error.message)}
      >
        <RemoteHostTrack onConnected={onConnected} />
      </LiveKitRoom>
    </View>
  );
};

const styles = StyleSheet.create({
  room: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
});
