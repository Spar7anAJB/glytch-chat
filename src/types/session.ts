export type SessionUser = {
  id: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  singleSessionId: string;
  expiresAt: number | null;
};

export type SessionUserPersisted = Omit<SessionUser, "expiresAt" | "singleSessionId"> & {
  expiresAt?: number | null;
  singleSessionId?: string;
};
