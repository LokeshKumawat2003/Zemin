import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { useLivePermissions } from '../../permissions/PermissionsContext';
import { colors, typography, spacing } from '../../theme';

type Props = {
  style?: object;
  defaultCamera?: typeof CameraType.Front | typeof CameraType.Back;
  cameraType?: typeof CameraType.Front | typeof CameraType.Back;
  onCameraTypeChange?: (cameraType: typeof CameraType.Front | typeof CameraType.Back) => void;
  showFlip?: boolean;
};

export const LiveCameraPreview = ({
  style,
  defaultCamera = CameraType.Front,
  cameraType: controlledCameraType,
  onCameraTypeChange,
  showFlip = true,
}: Props) => {
  const { ensureAll, isGranted } = useLivePermissions(['camera', 'microphone']);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [cameraType, setCameraType] = useState(defaultCamera);
  const resolvedCameraType = controlledCameraType ?? cameraType;

  const requestAccess = useCallback(async () => {
    setDenied(false);
    const results = await ensureAll();
    const granted = results.camera === 'granted' && results.microphone === 'granted';
    setReady(granted);
    setDenied(!granted);
  }, [ensureAll]);

  useEffect(() => {
    if (isGranted('camera') && isGranted('microphone')) {
      setReady(true);
      setDenied(false);
      return;
    }
    requestAccess();
  }, [isGranted, requestAccess]);

  useEffect(() => {
    if (controlledCameraType !== undefined) {
      setCameraType(controlledCameraType);
    }
  }, [controlledCameraType]);

  const flipCamera = () => {
    const nextCameraType = resolvedCameraType === CameraType.Front ? CameraType.Back : CameraType.Front;
    if (onCameraTypeChange) {
      onCameraTypeChange(nextCameraType);
      return;
    }
    setCameraType(nextCameraType);
  };

  if (!ready) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        {denied ? (
          <>
            <Text style={styles.message}>Camera and microphone access are required to go live.</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={requestAccess}>
              <Text style={styles.actionText}>Allow access</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.message}>Starting camera…</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Camera
        key={resolvedCameraType}
        style={styles.camera}
        cameraType={resolvedCameraType}
        flashMode="off"
        focusMode="on"
      />
      {showFlip && (
        <TouchableOpacity style={styles.flipBtn} onPress={flipCamera} activeOpacity={0.85}>
          <Text style={styles.flipText}>Flip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  camera: {
    flex: 1,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actionBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  actionText: {
    ...typography.button,
    color: '#fff',
  },
  flipBtn: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  flipText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '700',
  },
});
