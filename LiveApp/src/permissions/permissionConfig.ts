import {Platform} from 'react-native';
import {PERMISSIONS, type Permission} from 'react-native-permissions';

import type {AppPermissionKey, PermissionDescriptor} from './types';

function galleryPermission(): Permission | null {
  if (Platform.OS === 'ios') {
    return PERMISSIONS.IOS.PHOTO_LIBRARY;
  }
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      return PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
    }
    return PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
  }
  return null;
}

const PERMISSION_NATIVE_MAP: Record<
  AppPermissionKey,
  () => Permission | null
> = {
  camera: () =>
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.CAMERA
      : Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.CAMERA
        : null,
  microphone: () =>
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.MICROPHONE
      : Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.RECORD_AUDIO
        : null,
  gallery: galleryPermission,
  location: () =>
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      : Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        : null,
  notifications: () => null,
};

export function getNativePermission(key: AppPermissionKey): Permission | null {
  return PERMISSION_NATIVE_MAP[key]();
}

export const PERMISSION_CATALOG: PermissionDescriptor[] = [
  {
    key: 'camera',
    title: 'Camera',
    description: 'Take photos and video during live sessions.',
    native: getNativePermission('camera'),
  },
  {
    key: 'microphone',
    title: 'Microphone',
    description: 'Capture audio for calls and recordings.',
    native: getNativePermission('microphone'),
  },
  {
    key: 'gallery',
    title: 'Photos & gallery',
    description: 'Pick images and videos from your library.',
    native: getNativePermission('gallery'),
  },
  {
    key: 'location',
    title: 'Location',
    description: 'Show nearby content when you allow it.',
    native: getNativePermission('location'),
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Alerts for messages and live updates.',
    native: null,
  },
];
