import { Platform } from 'react-native';
import { CameraType } from 'react-native-camera-kit';
import type { LocalParticipant } from 'livekit-client';
import { LocalVideoTrack, Track } from 'livekit-client';

type MediaStreamTrackLike = {
  getSettings?: () => { facingMode?: string; deviceId?: string };
  _switchCamera?: () => void;
  _setVideoEffects?: (names: string[]) => void;
};

const wait = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(() => resolve(), ms);
});

export function isLiveKitConfigured(
  token?: string | null,
  livekitEnabled?: boolean,
): boolean {
  return Boolean(
    livekitEnabled &&
      typeof token === 'string' &&
      token.length > 0 &&
      !token.startsWith('dev_'),
  );
}

export function getLiveKitFacingMode(
  cameraType?: typeof CameraType.Front | typeof CameraType.Back,
) {
  if (cameraType === CameraType.Back) {
    return 'environment' as const;
  }
  return 'user' as const;
}

export const clearHostVideoEffects = (mediaTrack?: MediaStreamTrackLike | null) => {
  if (!mediaTrack?._setVideoEffects) {
    return;
  }

  try {
    mediaTrack._setVideoEffects([]);
  } catch {
    // Ignore unsupported platforms.
  }
};

const getCurrentFacingMode = (mediaTrack?: MediaStreamTrackLike | null) => {
  try {
    return mediaTrack?.getSettings?.()?.facingMode;
  } catch {
    return undefined;
  }
};

const facingModeMatchesTarget = (
  currentFacingMode: string | undefined,
  targetFacingMode: 'user' | 'environment',
) => {
  if (!currentFacingMode) {
    return false;
  }

  return currentFacingMode === targetFacingMode;
};

export async function switchHostCamera(
  localParticipant: LocalParticipant,
  cameraType: typeof CameraType.Front | typeof CameraType.Back,
): Promise<void> {
  const facingMode = getLiveKitFacingMode(cameraType);
  const publication = localParticipant.getTrackPublication(Track.Source.Camera);
  const videoTrack = publication?.track;

  if (!(videoTrack instanceof LocalVideoTrack)) {
    await localParticipant.setCameraEnabled(true, { facingMode });
    return;
  }

  const mediaTrack = videoTrack.mediaStreamTrack as MediaStreamTrackLike;
  clearHostVideoEffects(mediaTrack);
  await wait(120);

  if (Platform.OS !== 'web' && mediaTrack._switchCamera) {
    mediaTrack._switchCamera();
    await wait(450);

    if (facingModeMatchesTarget(getCurrentFacingMode(mediaTrack), facingMode)) {
      return;
    }
  }

  try {
    await videoTrack.restartTrack({ facingMode });
    await wait(250);

    const restartedTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (
      restartedTrack instanceof LocalVideoTrack &&
      facingModeMatchesTarget(
        getCurrentFacingMode(restartedTrack.mediaStreamTrack as MediaStreamTrackLike),
        facingMode,
      )
    ) {
      return;
    }
  } catch {
    // Fall through to full track replacement.
  }

  await localParticipant.unpublishTrack(videoTrack, true);
  await wait(150);

  const tracks = await localParticipant.createTracks({
    video: { facingMode },
  });
  const nextVideoTrack = tracks.find((track) => track.kind === Track.Kind.Video);

  if (!(nextVideoTrack instanceof LocalVideoTrack)) {
    throw new Error('Camera switch failed');
  }

  await localParticipant.publishTrack(nextVideoTrack, {
    source: Track.Source.Camera,
  });
}
