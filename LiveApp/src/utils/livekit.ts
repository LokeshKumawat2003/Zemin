import { CameraType } from 'react-native-camera-kit';
import type { LocalParticipant } from 'livekit-client';
import { LocalVideoTrack, Track } from 'livekit-client';

export function isLiveKitConfigured(
  token?: string | null,
  livekitEnabled?: boolean
): boolean {
  return Boolean(
    livekitEnabled &&
      typeof token === 'string' &&
      token.length > 0 &&
      !token.startsWith('dev_')
  );
}

export function getLiveKitFacingMode(cameraType?: typeof CameraType.Front | typeof CameraType.Back) {
  if (cameraType === CameraType.Back) {
    return 'environment' as const;
  }
  return 'user' as const;
}

export async function switchHostCamera(
  localParticipant: LocalParticipant,
  cameraType: typeof CameraType.Front | typeof CameraType.Back
): Promise<void> {
  const facingMode = getLiveKitFacingMode(cameraType);
  const publication = localParticipant.getTrackPublication(Track.Source.Camera);
  const videoTrack = publication?.track;

  if (videoTrack instanceof LocalVideoTrack) {
    try {
      await videoTrack.restartTrack({ facingMode });
      return;
    } catch {
      const mediaTrack = videoTrack.mediaStreamTrack as {
        _switchCamera?: () => void;
      };
      if (mediaTrack?._switchCamera) {
        mediaTrack._switchCamera();
        return;
      }
      throw new Error('Camera switch failed');
    }
  }

  if (localParticipant.isCameraEnabled) {
    await localParticipant.setCameraEnabled(false);
  }
  await localParticipant.setCameraEnabled(true, { facingMode });
}

