import axios from 'axios';
import { API_CONFIG } from '../constants/api.constants';
import { StorageService } from '../services/storage.service';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = StorageService.getAccessToken();
  if (token) {
    const headers = config.headers ?? {};
    config.headers = {
      ...(headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    } as typeof config.headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = StorageService.getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
            refreshToken,
          }, {
            headers: { 'ngrok-skip-browser-warning': 'true' },
          });
          const { accessToken, refreshToken: newRefresh } = res.data.data;
          StorageService.setTokens(accessToken, newRefresh || refreshToken);
          const headers = original.headers ?? {};
          original.headers = {
            ...(headers as Record<string, string>),
            Authorization: `Bearer ${accessToken}`,
          } as typeof original.headers;
          return apiClient(original);
        } catch {
          StorageService.clearAll();
        }
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default apiClient;
