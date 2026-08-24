import {
  check,
  checkNotifications,
  openSettings,
  request,
  requestNotifications,
  RESULTS,
  type NotificationOption,
  type PermissionStatus,
} from 'react-native-permissions';

import {getNativePermission} from './permissionConfig';
import type {AppPermissionKey, AppPermissionState} from './types';
import {APP_PERMISSION_KEYS} from './types';

export {RESULTS};

const DEFAULT_NOTIFICATION_OPTIONS: NotificationOption[] = [
  'alert',
  'badge',
  'sound',
];

export async function checkAppPermission(
  key: AppPermissionKey,
): Promise<PermissionStatus> {
  if (key === 'notifications') {
    const {status} = await checkNotifications();
    return status;
  }

  const native = getNativePermission(key);
  if (!native) {
    return RESULTS.UNAVAILABLE;
  }

  return check(native);
}

export async function requestAppPermission(
  key: AppPermissionKey,
): Promise<PermissionStatus> {
  if (key === 'notifications') {
    const {status} = await requestNotifications(DEFAULT_NOTIFICATION_OPTIONS);
    return status;
  }

  const native = getNativePermission(key);
  if (!native) {
    return RESULTS.UNAVAILABLE;
  }

  return request(native);
}

export async function ensureAppPermission(
  key: AppPermissionKey,
): Promise<PermissionStatus> {
  const current = await checkAppPermission(key);
  if (current === RESULTS.GRANTED || current === RESULTS.LIMITED) {
    return current;
  }
  if (current === RESULTS.BLOCKED) {
    return current;
  }
  return requestAppPermission(key);
}

export async function checkAllAppPermissions(): Promise<AppPermissionState> {
  const entries = await Promise.all(
    APP_PERMISSION_KEYS.map(async key => {
      const status = await checkAppPermission(key);
      return [key, status] as const;
    }),
  );

  return Object.fromEntries(entries) as AppPermissionState;
}

export async function requestMultipleAppPermissions(
  keys: AppPermissionKey[],
): Promise<Partial<AppPermissionState>> {
  const result: Partial<AppPermissionState> = {};

  for (const key of keys) {
    result[key] = await requestAppPermission(key);
  }

  return result;
}

export function isPermissionGranted(status: PermissionStatus): boolean {
  return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
}

export function openAppSettings(): Promise<void> {
  return openSettings();
}
