import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'Zemin-storage' });

export const StorageService = {
  setTokens(access: string, refresh: string) {
    storage.set('accessToken', access);
    storage.set('refreshToken', refresh);
  },
  getAccessToken: () => storage.getString('accessToken'),
  getRefreshToken: () => storage.getString('refreshToken'),
  clearAll: () => storage.clearAll(),
  setHasOnboarded: (value: boolean) => storage.set('hasOnboarded', value),
  getHasOnboarded: () => storage.getBoolean('hasOnboarded') ?? false,
  setPushToken: (token: string) => storage.set('pushToken', token),
  getPushToken: () => storage.getString('pushToken'),
  clearPushToken: () => storage.remove('pushToken'),
};
