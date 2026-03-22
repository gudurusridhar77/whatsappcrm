import apiClient from './client';

export interface AgentSummary {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface TeamResponse {
  id: number;
  name: string;
  description: string | null;
  allowAutoAssign: boolean;
  members: AgentSummary[];
  createdAt: string;
}

export interface AgentResponse {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export const teamsApi = {
  getTeams: (accountId: number) =>
    apiClient.get<TeamResponse[]>(`/api/v1/accounts/${accountId}/teams`),

  getTeam: (accountId: number, teamId: number) =>
    apiClient.get<TeamResponse>(`/api/v1/accounts/${accountId}/teams/${teamId}`),

  createTeam: (accountId: number, data: { name: string; description?: string; allowAutoAssign?: boolean; memberIds?: number[] }) =>
    apiClient.post<TeamResponse>(`/api/v1/accounts/${accountId}/teams`, data),

  updateTeam: (accountId: number, teamId: number, data: { name?: string; description?: string; allowAutoAssign?: boolean }) =>
    apiClient.patch<TeamResponse>(`/api/v1/accounts/${accountId}/teams/${teamId}`, data),

  deleteTeam: (accountId: number, teamId: number) =>
    apiClient.delete(`/api/v1/accounts/${accountId}/teams/${teamId}`),

  setMembers: (accountId: number, teamId: number, userIds: number[]) =>
    apiClient.put<TeamResponse>(`/api/v1/accounts/${accountId}/teams/${teamId}/members`, { userIds }),

  addMembers: (accountId: number, teamId: number, userIds: number[]) =>
    apiClient.post<TeamResponse>(`/api/v1/accounts/${accountId}/teams/${teamId}/members`, { userIds }),
};

export const agentsApi = {
  getAgents: (accountId: number) =>
    apiClient.get<AgentResponse[]>(`/api/v1/accounts/${accountId}/agents`),
};
