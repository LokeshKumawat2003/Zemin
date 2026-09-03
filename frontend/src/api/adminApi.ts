const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

export type ApiRecord = Record<string, unknown>;

export type AdminResponse<T> = { data: T; meta?: ApiRecord; message?: string };

const readPayload = (payload: unknown): unknown => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiRecord).data;
  }
  return payload;
};

const getApiErrorMessage = (payload: unknown, fallback = "Request failed."): string => {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as ApiRecord;
  const nestedError = record.error;
  if (nestedError && typeof nestedError === "object" && "message" in nestedError) {
    const message = (nestedError as ApiRecord).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return fallback;
};

export const getAdminToken = () => localStorage.getItem("adminToken") || "";

export async function adminRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload));
  }
  return readPayload(payload) as T;
}

export async function adminRequestWithMeta<T = unknown>(path: string, options: RequestInit = {}): Promise<AdminResponse<T>> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null) as ApiRecord | null;
  if (!response.ok) throw new Error(getApiErrorMessage(payload));
  const meta = payload && payload.meta && typeof payload.meta === "object" ? payload.meta as ApiRecord : undefined;
  return { data: (payload?.data ?? payload) as T, meta, message: payload?.message ? String(payload.message) : undefined };
}

export async function adminLogin(email: string, password: string) {
  const response = await adminRequest<ApiRecord>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = readPayload(response) as ApiRecord;
  const tokens = data && typeof data.tokens === "object" ? data.tokens as ApiRecord : {};
  const accessToken = String(tokens.accessToken || "");
  if (accessToken) localStorage.setItem("adminToken", accessToken);
  return response;
}

export const endpoint = {
  notifications: (page = 1, limit = 20) => `/admin/notifications?page=${page}&limit=${limit}`,
  unreadNotifications: "/admin/notifications/unread-count",
  notification: (id: string) => `/admin/notifications/${id}`,
  markNotificationRead: (id: string) => `/admin/notifications/${id}/read`,
  markAllNotificationsRead: "/admin/notifications/read-all",
  sendNotification: "/admin/notifications/send",
  broadcastNotifications: "/admin/notifications/broadcast",
  users: (page = 1, limit = 10) => `/admin/users?page=${page}&limit=${limit}`,
  user: (id: string) => `/admin/users/${id}`,
  userBan: (id: string) => `/admin/users/${id}/ban`,
  userUnban: (id: string) => `/admin/users/${id}/unban`,
  userRole: (id: string) => `/admin/users/${id}/role`,
  paymentMethods: (id: string) => `/admin/users/${id}/payment-methods`,
  deletePaymentMethod: (id: string, paymentMethodId: string) => `/admin/users/${id}/payment-methods/${paymentMethodId}`,
  payments: (page = 1, limit = 10) => `/admin/payments?page=${page}&limit=${limit}`,
  payment: (id: string) => `/admin/payments/${id}`,
  payouts: (page = 1, limit = 10) => `/admin/payouts?page=${page}&limit=${limit}`,
  payout: (id: string) => `/admin/payouts/${id}`,
  payoutApprove: (id: string) => `/admin/payouts/${id}/approve`,
  payoutReject: (id: string) => `/admin/payouts/${id}/reject`,
  chats: (page = 1, limit = 10) => `/admin/chats?page=${page}&limit=${limit}`,
  chat: (id: string) => `/admin/chats/${id}`,
  chatMessages: (id: string, page = 1, limit = 10) => `/admin/chats/${id}/messages?page=${page}&limit=${limit}`,
  creators: (page = 1, limit = 10) => `/admin/creators?page=${page}&limit=${limit}`,
  creator: (id: string) => `/admin/creators/${id}`,
  creatorApprove: (id: string) => `/admin/creators/${id}/approve`,
  creatorReject: (id: string) => `/admin/creators/${id}/reject`,
  creatorSuspend: (id: string) => `/admin/creators/${id}/suspend`,
  contentPosts: (page = 1, limit = 10) => `/admin/content/posts?page=${page}&limit=${limit}`,
  post: (id: string) => `/admin/content/posts/${id}`,
  postHide: (id: string) => `/admin/content/posts/${id}/hide`,
  postRestore: (id: string) => `/admin/content/posts/${id}/restore`,
  contentComments: (page = 1, limit = 10) => `/admin/content/comments?page=${page}&limit=${limit}`,
  comment: (id: string) => `/admin/content/comments/${id}`,
  commentRestore: (id: string) => `/admin/content/comments/${id}/restore`,
  commentDelete: (id: string) => `/admin/content/comments/${id}`,
  activity: (page = 1, limit = 20) => `/admin/activity?page=${page}&limit=${limit}`,
  liveStreams: "/admin/live",
  reports: (page = 1, limit = 10) => `/admin/reports?page=${page}&limit=${limit}`,
  report: (id: string) => `/admin/reports/${id}`,
  reportResolve: (id: string) => `/admin/reports/${id}/resolve`,
  reportDismiss: (id: string) => `/admin/reports/${id}/dismiss`,
  moderationLog: (page = 1, limit = 50) => `/admin/logs/moderation?page=${page}&limit=${limit}`,
  live: "/admin/live",
  dashboardStats: "/admin/stats/dashboard",
  userStats: "/admin/stats/users",
  reportStats: "/admin/stats/reports",
  financialStats: "/admin/stats/financial",
};
