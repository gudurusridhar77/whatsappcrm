export interface User {
  id: number;
  name: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  availability: string;
  accounts: AccountInfo[];
}

export interface AccountInfo {
  accountId: number;
  accountName: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export interface AccountUser {
  id: number;
  userId: number;
  userName: string;
  email: string;
  role: string;
  invitationStatus: string;
  availability: string;
  displayName: string | null;
}

export interface AccountSettings {
  id: number;
  name: string;
  domain: string | null;
  locale: string | null;
  timezone: string;
  businessHours: string | null;
  autoResolveHours: number;
  status: string;
}
