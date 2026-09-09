import { useCallback, useEffect, useRef } from 'react';
import { Alert, View } from 'react-native';
import type { CameraApi } from 'react-native-camera-kit';
import { liveApi } from '../api';
import {
  attachNativeModerationSampler,
  captureLiveModerationFrame,
} from '../utils/liveFrameCapture';

const SCAN_INTERVAL_MS = 2000;
const INITIAL_BURST_DELAYS_MS = [150, 400, 800, 1500, 2500];
const NATIVE_WARMUP_MS = 300;
const MAX_IN_FLIGHT_SCANS = 2;

type MediaStreamTrackLike = {
  id?: string;
  _setVideoEffect?: (name: string) => void;
};

type Options = {
  enabled: boolean;
  roomId: string;
  captureTargetRef: React.RefObject<View | null>;
  cameraRef?: React.RefObject<CameraApi | null>;
  videoTrack?: MediaStreamTrackLike | null;
  onViolation: () => void;
};

export const useLiveModeration = ({
  enabled,
  roomId,
  captureTargetRef,
  cameraRef,
  videoTrack,
  onViolation,
}: Options) => {
  const inFlightScansRef = useRef(0);
  const violationHandledRef = useRef(false);
  const nativeSamplerAttachedRef = useRef(false);
  const nativeAttachedAtRef = useRef(0);
  const burstTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const handleViolation = useCallback(
    (message?: string) => {
      if (violationHandledRef.current) return;
      violationHandledRef.current = true;
      Alert.alert(
        'Stream Ended',
        message || 'Public streaming has been disabled because explicit content was detected.',
      );
      onViolation();
    },
    [onViolation],
  );

  useEffect(() => {
    if (!enabled || !videoTrack) {
      return;
    }

    const attachTimer = setTimeout(() => {
      nativeSamplerAttachedRef.current = attachNativeModerationSampler(videoTrack);
      if (nativeSamplerAttachedRef.current) {
        nativeAttachedAtRef.current = Date.now();
      }
    }, 1800);

    return () => clearTimeout(attachTimer);
  }, [enabled, videoTrack]);

  const scanFrame = useCallback(async () => {
    if (
      !enabled
      || violationHandledRef.current
      || inFlightScansRef.current >= MAX_IN_FLIGHT_SCANS
    ) {
      return;
    }

    if (
      nativeSamplerAttachedRef.current
      && Date.now() - nativeAttachedAtRef.current < NATIVE_WARMUP_MS
    ) {
      return;
    }

    inFlightScansRef.current += 1;
    try {
      const uri = await captureLiveModerationFrame({
        captureTargetRef,
        cameraRef,
        nativeSamplerAttached: nativeSamplerAttachedRef.current,
      });

      if (!uri) {
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'frame.jpg',
      } as unknown as Blob);

      await liveApi.moderateFrame(roomId, formData);
    } catch (error: any) {
      const code = error?.error?.code;
      if (code === 'PUBLIC_STREAMING_DISABLED' || code === 'STREAMING_DISABLED') {
        handleViolation(error?.error?.message);
      }
    } finally {
      inFlightScansRef.current = Math.max(0, inFlightScansRef.current - 1);
    }
  }, [cameraRef, captureTargetRef, enabled, handleViolation, roomId]);

  useEffect(() => {
    violationHandledRef.current = false;
    nativeSamplerAttachedRef.current = false;
    nativeAttachedAtRef.current = 0;
    inFlightScansRef.current = 0;
  }, [roomId]);

  useEffect(() => {
    if (!enabled) return undefined;

    burstTimersRef.current = INITIAL_BURST_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        void scanFrame();
      }, delay),
    );

    const interval = setInterval(() => {
      void scanFrame();
    }, SCAN_INTERVAL_MS);

    return () => {
      burstTimersRef.current.forEach(clearTimeout);
      burstTimersRef.current = [];
      clearInterval(interval);
    };
  }, [enabled, roomId, scanFrame]);

  useEffect(() => {
    if (!enabled || !videoTrack) {
      return undefined;
    }

    const immediateTimer = setTimeout(() => {
      void scanFrame();
    }, NATIVE_WARMUP_MS);

    return () => clearTimeout(immediateTimer);
  }, [enabled, roomId, scanFrame, videoTrack]);
};
