import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { CameraType } from 'react-native-camera-kit';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useLocalParticipant,
  useTracks,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { isLiveKitConfigured, getLiveKitFacingMode, switchHostCamera } from '../../utils/livekit';

type Props = {
  livekitUrl?: string;
  webrtcToken?: string;
  livekitEnabled?: boolean;
  fallback: React.ReactNode;
  cameraType?: typeof CameraType.Front | typeof CameraType.Back;
  onCameraTypeChange?: (cameraType: typeof CameraType.Front | typeof CameraType.Back) => void;
  showFlip?: boolean;
  isMuted?: boolean;
};

function HostMicControl({ isMuted }: { isMuted: boolean }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!localParticipant) {
      return;
    }

    void localParticipant.setMicrophoneEnabled(!isMuted).catch((error) => {
      console.warn('Failed to toggle host microphone', error);
    });
  }, [isMuted, localParticipant]);

  return null;
}

function HostCameraTrack({
  cameraType,
}: {
  cameraType?: typeof CameraType.Front | typeof CameraType.Back;
}) {
  const { localParticipant } = useLocalParticipant();
  const lastAppliedCameraTypeRef = useRef<typeof CameraType.Front | typeof CameraType.Back | undefined>(
    undefined
  );
  const [videoRenderKey, setVideoRenderKey] = useState(0);
  const activeCameraType = cameraType ?? CameraType.Front;

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localTrack = tracks.find(
    (track) => isTrackReference(track) && track.participant.isLocal
  );

  useEffect(() => {
    if (!localParticipant) {
      return;
    }

    if (lastAppliedCameraTypeRef.current === activeCameraType) {
      return;
    }

    let cancelled = false;
    const applyCamera = async () => {
      try {
        await switchHostCamera(localParticipant, activeCameraType);
        if (!cancelled) {
          lastAppliedCameraTypeRef.current = activeCameraType;
          setVideoRenderKey((prev) => prev + 1);
        }
      } catch (error) {
        console.warn('Failed to switch host camera', error);
      }
    };

    void applyCamera();

    return () => {
      cancelled = true;
    };
  }, [activeCameraType, localParticipant]);

  return (
    <View style={styles.previewContainer}>
      {localTrack && isTrackReference(localTrack) ? (
        <VideoTrack
          key={`${activeCameraType}-${videoRenderKey}`}
          trackRef={localTrack}
          style={StyleSheet.absoluteFillObject}
          mirror={activeCameraType === CameraType.Front}
          objectFit="cover"
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
    </View>
  );
}

export const LiveKitHostVideo = ({
  livekitUrl,
  webrtcToken,
  livekitEnabled,
  fallback,
  cameraType,
  onCameraTypeChange,
  showFlip = true,
  isMuted = false,
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
    return <>{fallback}</>;
  }

  return (
    <View style={styles.room}>
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={webrtcToken!}
        connect
        audio
        video={{ facingMode: getLiveKitFacingMode(cameraType ?? CameraType.Front) }}
        options={{ adaptiveStream: { pixelDensity: 'screen' } }}
      >
        <HostCameraTrack cameraType={cameraType} />
        <HostMicControl isMuted={isMuted} />
      </LiveKitRoom>
      {showFlip && onCameraTypeChange && (
        <TouchableOpacity
          style={styles.flipBtn}
          activeOpacity={0.85}
          onPress={() => {
            const nextCameraType =
              cameraType === CameraType.Front ? CameraType.Back : CameraType.Front;
            onCameraTypeChange(nextCameraType);
          }}
        >
          <Text style={styles.flipText}>Flip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  room: { flex: 1 },
  previewContainer: { flex: 1, backgroundColor: '#000' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  flipBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  flipText: {
    color: '#fff',
    fontWeight: '700',
  },
});
