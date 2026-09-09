import { NativeModules, Platform } from 'react-native';
import { captureRef, captureScreen } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { CameraApi } from 'react-native-camera-kit';

type MediaStreamTrackLike = {
  id?: string;
  _setVideoEffect?: (name: string) => void;
};

const MODERATION_EFFECT = 'zemin-moderation';

export const attachNativeModerationSampler = (mediaStreamTrack?: MediaStreamTrackLike | null) => {
  if (Platform.OS !== 'android' || !mediaStreamTrack?._setVideoEffect) {
    return false;
  }

  try {
    mediaStreamTrack._setVideoEffect(MODERATION_EFFECT);
    return true;
  } catch {
    return false;
  }
};

export const captureNativeModerationFrame = async (): Promise<string | null> => {
  if (Platform.OS !== 'android') {
    return null;
  }

  const module = NativeModules.LiveModeration;
  if (!module?.getLatestFramePath) {
    return null;
  }

  try {
    const path = await module.getLatestFramePath();
    if (typeof path === 'string' && path.length > 0) {
      return path.startsWith('file://') ? path : `file://${path}`;
    }
  } catch {
    return null;
  }

  return null;
};

export const captureViewSnapshot = async (
  captureTargetRef?: RefObject<View | null>,
): Promise<string | null> => {
  const captureOptions = {
    format: 'jpg' as const,
    quality: 0.5,
    result: 'tmpfile' as const,
    handleGLSurfaceViewOnAndroid: true,
  };

  if (captureTargetRef?.current) {
    try {
      return await captureRef(captureTargetRef, captureOptions);
    } catch {
      // Fall through to full-screen capture.
    }
  }

  try {
    return await captureScreen(captureOptions);
  } catch {
    return null;
  }
};

export const captureCameraPreviewFrame = async (
  cameraRef?: RefObject<CameraApi | null>,
): Promise<string | null> => {
  if (!cameraRef?.current?.capture) {
    return null;
  }

  try {
    const result = await cameraRef.current.capture();
    const uri = result?.uri || result?.path;
    if (!uri) {
      return null;
    }
    return uri.startsWith('file://') ? uri : `file://${uri}`;
  } catch {
    return null;
  }
};

export const captureLiveModerationFrame = async (options: {
  captureTargetRef?: RefObject<View | null>;
  cameraRef?: RefObject<CameraApi | null>;
  nativeSamplerAttached?: boolean;
}): Promise<string | null> => {
  if (options.nativeSamplerAttached) {
    const nativeUri = await captureNativeModerationFrame();
    if (nativeUri) {
      return nativeUri;
    }
  }

  const cameraUri = await captureCameraPreviewFrame(options.cameraRef);
  if (cameraUri) {
    return cameraUri;
  }

  return captureViewSnapshot(options.captureTargetRef);
};
