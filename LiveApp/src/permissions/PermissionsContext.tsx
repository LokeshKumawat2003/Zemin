import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {PermissionStatus} from 'react-native-permissions';
import {RESULTS} from 'react-native-permissions';

import {PERMISSION_CATALOG} from './permissionConfig';
import {
  checkAllAppPermissions,
  checkAppPermission,
  ensureAppPermission,
  isPermissionGranted,
  openAppSettings,
  requestAppPermission,
  requestMultipleAppPermissions,
} from './permissionsHandler';
import type {AppPermissionKey, AppPermissionState} from './types';
import {APP_PERMISSION_KEYS} from './types';

const initialState: AppPermissionState = {
  camera: RESULTS.UNAVAILABLE,
  microphone: RESULTS.UNAVAILABLE,
  gallery: RESULTS.UNAVAILABLE,
  location: RESULTS.UNAVAILABLE,
  notifications: RESULTS.UNAVAILABLE,
};

type PermissionsContextValue = {
  permissions: AppPermissionState;
  catalog: typeof PERMISSION_CATALOG;
  isReady: boolean;
  refreshPermissions: () => Promise<AppPermissionState>;
  checkPermission: (key: AppPermissionKey) => Promise<PermissionStatus>;
  requestPermission: (key: AppPermissionKey) => Promise<PermissionStatus>;
  ensurePermission: (key: AppPermissionKey) => Promise<PermissionStatus>;
  requestPermissions: (
    keys: AppPermissionKey[],
  ) => Promise<Partial<AppPermissionState>>;
  isGranted: (key: AppPermissionKey) => boolean;
  openSettings: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

type PermissionsProviderProps = {
  children: ReactNode;
  autoCheckOnMount?: boolean;
};

export function PermissionsProvider({
  children,
  autoCheckOnMount = true,
}: PermissionsProviderProps) {
  const [permissions, setPermissions] =
    useState<AppPermissionState>(initialState);
  const [isReady, setIsReady] = useState(!autoCheckOnMount);

  const refreshPermissions = useCallback(async () => {
    const next = await checkAllAppPermissions();
    setPermissions(prev => ({...prev, ...next}));
    setIsReady(true);
    return next;
  }, []);

  useEffect(() => {
    if (autoCheckOnMount) {
      refreshPermissions();
    }
  }, [autoCheckOnMount, refreshPermissions]);

  const checkPermission = useCallback(async (key: AppPermissionKey) => {
    const status = await checkAppPermission(key);
    setPermissions(prev => ({...prev, [key]: status}));
    return status;
  }, []);

  const requestPermission = useCallback(async (key: AppPermissionKey) => {
    const status = await requestAppPermission(key);
    setPermissions(prev => ({...prev, [key]: status}));
    return status;
  }, []);

  const ensurePermission = useCallback(async (key: AppPermissionKey) => {
    const status = await ensureAppPermission(key);
    setPermissions(prev => ({...prev, [key]: status}));
    return status;
  }, []);

  const requestPermissions = useCallback(async (keys: AppPermissionKey[]) => {
    const partial = await requestMultipleAppPermissions(keys);
    setPermissions(prev => ({...prev, ...partial}));
    return partial;
  }, []);

  const isGranted = useCallback(
    (key: AppPermissionKey) => isPermissionGranted(permissions[key]),
    [permissions],
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      catalog: PERMISSION_CATALOG,
      isReady,
      refreshPermissions,
      checkPermission,
      requestPermission,
      ensurePermission,
      requestPermissions,
      isGranted,
      openSettings: openAppSettings,
    }),
    [
      permissions,
      isReady,
      refreshPermissions,
      checkPermission,
      requestPermission,
      ensurePermission,
      requestPermissions,
      isGranted,
    ],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

export function useLivePermissions(
  keys: readonly AppPermissionKey[] = APP_PERMISSION_KEYS,
) {
  const {ensurePermission, isGranted, permissions} = usePermissions();

  const ensureAll = useCallback(async () => {
    const results: Partial<AppPermissionState> = {};
    for (const key of keys) {
      results[key] = await ensurePermission(key);
    }
    return results;
  }, [ensurePermission, keys]);

  const allGranted = keys.every(key => isGranted(key));

  return {
    permissions,
    ensureAll,
    allGranted,
    ensurePermission,
    isGranted,
  };
}
