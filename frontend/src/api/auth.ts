import apiClient from './client';
import { AuthResponse, User } from '../types';

export const authApi = {
  signup: (data: { name: string; email: string; password: string; accountName: string }) =>
    apiClient.post<AuthResponse>('/api/v1/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/api/v1/auth/login', data),

  refreshToken: (refreshToken: string) =>
    apiClient.post<AuthResponse>('/api/v1/auth/refresh', { refreshToken }),

  getMe: () =>
    apiClient.get<User>('/api/v1/auth/me'),

  updateProfile: (data: { name?: string; displayName?: string; avatarUrl?: string }) =>
    apiClient.patch<User>('/api/v1/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post<{ message: string }>('/api/v1/auth/change-password', data),

  updateAvailability: (availability: string) =>
    apiClient.patch<User>('/api/v1/auth/availability', { availability }),
};
