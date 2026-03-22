import apiClient from './client';
import { AccountUser, AccountSettings } from '../types';

export const accountApi = {
  getUsers: (accountId: number) =>
    apiClient.get<AccountUser[]>(`/api/v1/accounts/${accountId}/users`),

  inviteUser: (accountId: number, data: { name: string; email: string; role: string }) =>
    apiClient.post<AccountUser>(`/api/v1/accounts/${accountId}/users/invite`, data),

  updateRole: (accountId: number, userId: number, role: string) =>
    apiClient.patch<AccountUser>(`/api/v1/accounts/${accountId}/users/${userId}/role`, { role }),

  removeUser: (accountId: number, userId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/users/${userId}`),

  getSettings: (accountId: number) =>
    apiClient.get<AccountSettings>(`/api/v1/accounts/${accountId}/settings`),

  updateSettings: (accountId: number, data: Partial<AccountSettings>) =>
    apiClient.patch<AccountSettings>(`/api/v1/accounts/${accountId}/settings`, data),
};
