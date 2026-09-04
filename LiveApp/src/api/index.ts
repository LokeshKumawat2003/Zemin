import apiClient from './client';
import { StorageService } from '../services/storage.service';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  bio?: string;
  role: string;
  isVerified: boolean;
  isCreator: boolean;
  coinBalance?: number;
  walletBalance?: number;
}

export const unwrapApiResponse = <T = any>(response: any): T => {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
};

export const authApi = {
  checkUsername: (username: string) =>
    apiClient.get('/auth/check-username', { params: { username } }),

  register: (data: {
    username: string;
    email: string;
    password: string;
    registrationMethod: 'email';
  }) => apiClient.post('/auth/register', data),

  verifyOtp: (data: { userId: string; otp: string; purpose: string }) =>
    apiClient.post('/auth/verify-otp', data),

  login: (identifier: string, password: string, fcmToken?: string) =>
    apiClient.post('/auth/login', {
      identifier,
      password,
      ...(fcmToken ? { fcmToken } : {}),
    }),

  getMe: () => apiClient.get('/auth/me'),

  logout: () => {
    const refreshToken = StorageService.getRefreshToken();
    const body = refreshToken ? { refreshToken } : undefined;
    return apiClient.post('/auth/logout', body);
  },

  forgotPassword: (identifier: string) =>
    apiClient.post('/auth/forgot-password', { identifier }),

  resetPassword: (data: { userId: string; otp: string; newPassword: string }) =>
    apiClient.post('/auth/reset-password', data),
};

export const feedApi = {
  getFollowing: (page = 1) => apiClient.get('/feed/following', { params: { page } }),
  getForYou: (page = 1) => apiClient.get('/feed/for-you', { params: { page } }),
  getPost: (postId: string) => apiClient.get(`/post/${postId}`),
  createPost: (data: object) => apiClient.post('/post/create', data),
  likePost: (postId: string) => apiClient.post('/post/like', { postId }),
  unlikePost: (postId: string) => apiClient.post('/post/unlike', { postId }),
  getComments: (postId: string, page = 1) =>
    apiClient.get(`/post/${postId}/comments`, { params: { page } }),
  addComment: (postId: string, text: string) =>
    apiClient.post('/post/comment', { postId, text }),
  purchasePpv: (postId: string) => apiClient.post('/post/purchase-ppv', { postId }),
};

export const creatorApi = {
  getProfile: (username: string) => apiClient.get(`/creator/${username}`),
  getPosts: (username: string, page = 1) =>
    apiClient.get(`/creator/${username}/posts`, { params: { page } }),
  getFollowers: (username: string, page = 1) =>
    apiClient.get(`/creator/${username}/followers`, { params: { page } }),
  getFollowing: (username: string, page = 1) =>
    apiClient.get(`/creator/${username}/following`, { params: { page } }),
  follow: (creatorId: string) => apiClient.post('/creator/follow', { creatorId }),
  unfollow: (creatorId: string) => apiClient.post('/creator/unfollow', { creatorId }),
  apply: (data: { displayName?: string; bio?: string; categories?: string[] }) =>
    apiClient.post('/creator/apply', data),
};

export const walletApi = {
  getBalance: () => apiClient.get('/wallet/balance'),
  getPackages: () => apiClient.get('/coin/packages'),
  purchaseCoins: (packageId: string, paymentMethod?: string, currency?: string) =>
    apiClient.post('/coin/purchase', { packageId, paymentMethod, currency }),
  withdrawEarnings: (payload?: object) => apiClient.post('/wallet/withdraw', payload),
  getPaymentMethods: () => apiClient.get('/wallet/payment-methods'),
  deletePaymentMethod: (id: string) => apiClient.delete(`/wallet/payment-methods/${id}`),
  getGiftCatalog: () => apiClient.get('/gift/catalog'),
  sendGift: (data: {
    giftId: string;
    recipientId: string;
    quantity: number;
    context?: object;
  }) => apiClient.post('/gift/send', data),
};

export const liveApi = {
  getActive: (page = 1) => apiClient.get('/live/active', { params: { page } }),
  getVipRooms: (page = 1) => apiClient.get('/live/vip', { params: { page } }),
  getRoom: (roomId: string) => apiClient.get(`/live/${roomId}`),
  create: (data: {
    title: string;
    category?: string;
    entryFeeCoins?: number;
  }) => apiClient.post('/live/create', data),
  createVip: (data: {
    title: string;
    entryGiftId: string;
    entryFeeCoins?: number;
    startMode: 'instant' | 'scheduled';
    scheduledAt?: string;
    category?: string;
  }) => apiClient.post('/live/create-vip', data),
  start: (roomId: string) => apiClient.post('/live/start', { roomId }),
  join: (roomId: string) => apiClient.post('/live/join', { roomId }),
  leave: (roomId: string) => apiClient.post('/live/leave', { roomId }),
  end: (roomId: string) => apiClient.post('/live/end', { roomId }),
};

export const chatApi = {
  getConversations: (page = 1) =>
    apiClient.get('/chat/conversations', { params: { page } }),

  startConversation: (recipientId: string) =>
    apiClient.post('/chat/start', { recipientId }),

  getMessages: (conversationId: string, page = 1) =>
    apiClient.get(`/chat/messages/${conversationId}`, { params: { page } }),

  sendMessage: (conversationId: string, text: string) =>
    apiClient.post('/chat/send', { conversationId, text, type: 'text' }),
};

export const searchApi = {
  search: (q: string, type = 'all') =>
    apiClient.get('/search', { params: { q, type } }),
};

export const notificationApi = {
  list: (page = 1, options?: { unreadOnly?: boolean; limit?: number }) =>
    apiClient.get('/notifications', { params: { page, ...options } }),
  unreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/notifications/read-all'),
  broadcast: (payload: {
    userIds?: string[];
    all?: boolean;
    type?: string;
    title: string;
    body: string;
    data?: object;
    sendPush?: boolean;
  }) => apiClient.post('/notifications/broadcast', payload),
};

export const userApi = {
  getPosts: (page = 1) => apiClient.get('/user/posts', { params: { page } }),
  updateProfile: (data: object) => apiClient.put('/user/profile', data),
  getSettings: () => apiClient.get('/user/settings'),
  updateSettings: (data: object) => apiClient.put('/user/settings', data),
  registerPushToken: (token: string) => apiClient.post('/user/push-token', { token }),
};

export const subscriptionApi = {
  getTiers: (username: string) => apiClient.get(`/subscription/tiers/${username}`),
  createTier: (data: {
    name: string;
    price: number;
    description?: string;
    benefits?: string[];
    badge?: string;
    accessAllLive?: boolean;
    unlockAllPosts?: boolean;
  }) => apiClient.post('/subscription/tier/create', data),
  subscribe: (tierId: string) => apiClient.post('/subscription/create', { tierId }),
  cancel: (subscriptionId: string) => apiClient.post('/subscription/cancel', { subscriptionId }),
  mySubscriptions: () => apiClient.get('/subscription/my-subscriptions'),
};

export const paymentApi = {
  verifyPayment: (payload: {
    gateway: 'razorpay' | 'stripe';
    orderId?: string;
    paymentId?: string;
    signature?: string;
    sessionId?: string;
  }) => apiClient.post('/payment/verify', payload),
};

export const uploadApi = {
  uploadMedia: (formData: FormData) =>
    apiClient.post('/upload/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const reportApi = {
  create: (data: {
    targetType: 'user' | 'post' | 'live' | 'message';
    targetId: string;
    reason: string;
    description?: string;
  }) => apiClient.post('/report', data),
};
