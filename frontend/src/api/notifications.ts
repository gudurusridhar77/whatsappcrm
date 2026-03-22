import apiClient from './client';

export interface NotificationResponse {
  id: number;
  notificationType: string;
  category: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, any>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  content: NotificationResponse[];
  totalElements: number;
  totalPages: number;
}

export const notificationsApi = {
  getNotifications: (accountId: number, unreadOnly = false, page = 0) =>
    apiClient.get<NotificationPage>(`/api/v1/accounts/${accountId}/notifications`, {
      params: { unreadOnly, page, size: 20 },
    }),

  getUnreadCount: (accountId: number) =>
    apiClient.get<{ count: number }>(`/api/v1/accounts/${accountId}/notifications/unread_count`),

  markAsRead: (accountId: number, notificationId: number) =>
    apiClient.post(`/api/v1/accounts/${accountId}/notifications/${notificationId}/read`),

  markAllAsRead: (accountId: number) =>
    apiClient.post(`/api/v1/accounts/${accountId}/notifications/read_all`),
};
