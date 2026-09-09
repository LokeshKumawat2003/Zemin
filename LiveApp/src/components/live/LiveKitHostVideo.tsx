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
import { LocalVideoTrack, Track } from 'livekit-client';
import { isLiveKitConfigured, getLiveKitFacingMode, switchHostCamera } from '../../utils/livekit';
import { attachNativeModerationSampler } from '../../utils/liveFrameCapture';

type MediaStreamTrackLike = {
  id?: string;
  _setVideoEffect?: (name: string) => void;
};

type Props = {
  livekitUrl?: string;
  webrtcToken?: string;
  livekitEnabled?: boolean;
  fallback: React.ReactNode;
  cameraType?: typeof CameraType.Front | typeof CameraType.Back;
  onCameraTypeChange?: (cameraType: typeof CameraType.Front | typeof CameraType.Back) => void;
  showFlip?: boolean;
  isMuted?: boolean;
  onLocalVideoTrackReady?: (track: MediaStreamTrackLike | null) => void;
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
  onLocalVideoTrackReady,
}: {
  cameraType?: typeof CameraType.Front | typeof CameraType.Back;
  onLocalVideoTrackReady?: (track: MediaStreamTrackLike | null) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const lastAppliedCameraTypeRef = useRef<typeof CameraType.Front | typeof CameraType.Back | undefined>(
    undefined,
  );
  const switchingRef = useRef(false);
  const onTrackReadyRef = useRef(onLocalVideoTrackReady);
  const [videoRenderKey, setVideoRenderKey] = useState(0);
  const activeCameraType = cameraType ?? CameraType.Front;

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localTrack = tracks.find(
    (track) => isTrackReference(track) && track.participant.isLocal,
  );

  useEffect(() => {
    onTrackReadyRef.current = onLocalVideoTrackReady;
  }, [onLocalVideoTrackReady]);

  const notifyTrackReady = (participant = localParticipant) => {
    if (!participant) {
      onTrackReadyRef.current?.(null);
      return;
    }

    const publication = participant.getTrackPublication(Track.Source.Camera);
    const publishedTrack = publication?.track;
    if (publishedTrack instanceof LocalVideoTrack) {
      onTrackReadyRef.current?.(publishedTrack.mediaStreamTrack as MediaStreamTrackLike);
      return;
    }

    onTrackReadyRef.current?.(null);
  };

  const attachModeration = (participant = localParticipant) => {
    if (!participant) {
      return;
    }

    const publication = participant.getTrackPublication(Track.Source.Camera);
    const publishedTrack = publication?.track;
    if (publishedTrack instanceof LocalVideoTrack) {
      attachNativeModerationSampler(publishedTrack.mediaStreamTrack as MediaStreamTrackLike);
      notifyTrackReady(participant);
    }
  };

  useEffect(() => {
    if (!localParticipant) {
      return undefined;
    }

    if (lastAppliedCameraTypeRef.current === activeCameraType || switchingRef.current) {
      return undefined;
    }

    if (lastAppliedCameraTypeRef.current === undefined) {
      lastAppliedCameraTypeRef.current = activeCameraType;
      const initialTimer = setTimeout(() => {
        attachModeration(localParticipant);
      }, 1500);
      return () => clearTimeout(initialTimer);
    }

    let cancelled = false;
    switchingRef.current = true;

    const applyCamera = async () => {
      try {
        await switchHostCamera(localParticipant, activeCameraType);
        if (cancelled) {
          return;
        }

        lastAppliedCameraTypeRef.current = activeCameraType;
        setVideoRenderKey((prev) => prev + 1);
        setTimeout(() => {
          if (!cancelled) {
            attachModeration(localParticipant);
          }
        }, 400);
      } catch (error) {
        console.warn('Failed to switch host camera', error);
        if (!cancelled) {
          lastAppliedCameraTypeRef.current = undefined;
        }
      } finally {
        switchingRef.current = false;
      }
    };

    void applyCamera();

    return () => {
      cancelled = true;
      switchingRef.current = false;
    };
  }, [activeCameraType, localParticipant]);

  useEffect(() => {
    if (!localTrack || !isTrackReference(localTrack)) {
      onTrackReadyRef.current?.(null);
      return;
    }

    const publishedTrack = localTrack.publication?.track;
    if (publishedTrack instanceof LocalVideoTrack) {
      onTrackReadyRef.current?.(publishedTrack.mediaStreamTrack as MediaStreamTrackLike);
    }
  }, [localTrack]);

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
  onLocalVideoTrackReady,
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
        <HostCameraTrack
          cameraType={cameraType}
          onLocalVideoTrackReady={onLocalVideoTrackReady}
        />
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
