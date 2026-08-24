import type {Permission, PermissionStatus} from 'react-native-permissions';

export const APP_PERMISSION_KEYS = [
  'camera',
  'microphone',
  'gallery',
  'location',
  'notifications',
] as const;

export type AppPermissionKey = (typeof APP_PERMISSION_KEYS)[number];

export type AppPermissionState = Record<AppPermissionKey, PermissionStatus>;

export type PermissionDescriptor = {
  key: AppPermissionKey;
  title: string;
  description: string;
  native: Permission | null;
};
