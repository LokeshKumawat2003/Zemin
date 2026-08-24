import { RESULTS } from '../permissions/permissionsHandler';
import { requestAppPermission } from '../permissions/permissionsHandler';
import { authApi, userApi } from '../api';
import { StorageService } from './storage.service';

export const NotificationService = {
  async ensurePushPermission(): Promise<boolean> {
    const status = await requestAppPermission('notifications');
    return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
  },

  getStoredPushToken(): string | undefined {
    return StorageService.getPushToken();
  },

  setPushToken(token: string) {
    StorageService.setPushToken(token);
  },

  async registerPushTokenWithBackend(token: string): Promise<void> {
    if (!token) return;
    StorageService.setPushToken(token);
    await userApi.registerPushToken(token);
  },

  async syncStoredPushToken(): Promise<void> {
    const token = StorageService.getPushToken();
    if (!token) return;
    try {
      await userApi.registerPushToken(token);
    } catch {
      // Token sync is best-effort.
    }
  },

  async registerPushTokenOnLogin(identifier: string, password: string) {
    const fcmToken = StorageService.getPushToken();
    return authApi.login(identifier, password, fcmToken);
  },
};
