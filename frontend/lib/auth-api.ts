import api from '@/lib/axios';

export type ActiveSession = {
  tokenId: string;
  maskedToken: string;
  createdAt: string;
  lastUsedAt: string;
  userAgent?: string;
  ipAddress?: string;
};

export const fetchActiveSessions = async (): Promise<ActiveSession[]> => {
  const response = await api.get('/auth/sessions');
  return (response.data?.data?.sessions as ActiveSession[]) ?? [];
};

export const revokeActiveSession = async (tokenId: string): Promise<void> => {
  await api.delete(`/auth/sessions/${tokenId}`);
};
