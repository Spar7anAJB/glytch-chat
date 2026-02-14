export type SessionUser = {
  id: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
};

export type SessionUserPersisted = Omit<SessionUser, "expiresAt"> & { expiresAt?: number | null };
