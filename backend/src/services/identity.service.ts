import crypto from 'crypto';

import { generateAccessToken, generateRefreshToken } from '../utils/jwt.utils';

const MAX_SESSIONS = 5;

type SessionMetadata = {
  userAgent?: string;
  ipAddress?: string;
};

type AuthUserRecord = {
  _id: unknown;
  role: 'creator' | 'consumer' | 'admin';
  refreshTokens: string[];
  refreshSessions?: unknown[];
};

type SessionPayload = {
  tokenId: string;
  maskedToken: string;
  createdAt: string;
  lastUsedAt: string;
  userAgent?: string;
  ipAddress?: string;
};

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const maskToken = (token: string): string => {
  if (token.length <= 12) {
    return `${token.slice(0, 2)}...${token.slice(-2)}`;
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
};

const normalizeSessionArray = (sessions: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
  if (sessions.length <= MAX_SESSIONS) {
    return sessions;
  }

  return sessions.slice(sessions.length - MAX_SESSIONS);
};

const normalizeTokenArray = (tokens: string[]): string[] => {
  if (tokens.length <= MAX_SESSIONS) {
    return tokens;
  }

  return tokens.slice(tokens.length - MAX_SESSIONS);
};

export const getSessionMetadata = (req: { headers: Record<string, unknown>; ip?: string }): SessionMetadata => {
  const forwarded = req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];
  const forwardedIp = Array.isArray(forwarded)
    ? String(forwarded[0] ?? '')
    : typeof forwarded === 'string'
      ? forwarded.split(',')[0]
      : '';

  return {
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 260) : undefined,
    ipAddress: (forwardedIp || req.ip || '').trim().slice(0, 80),
  };
};

export const issueSessionTokens = (
  user: AuthUserRecord,
  metadata: SessionMetadata,
): { accessToken: string; refreshToken: string } => {
  const accessToken = generateAccessToken(String(user._id), user.role);
  const refreshToken = generateRefreshToken(String(user._id));

  const tokenId = crypto.randomUUID();
  const now = new Date();
  const nextSession = {
    tokenId,
    tokenHash: hashToken(refreshToken),
    maskedToken: maskToken(refreshToken),
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    createdAt: now,
    lastUsedAt: now,
  };

  user.refreshTokens = normalizeTokenArray([...(user.refreshTokens ?? []), refreshToken]);
  const currentSessions = (user.refreshSessions ?? []) as Array<Record<string, unknown>>;
  user.refreshSessions = normalizeSessionArray([...currentSessions, nextSession]);

  return {
    accessToken,
    refreshToken,
  };
};

export const rotateSessionTokens = (
  user: AuthUserRecord,
  oldRefreshToken: string,
  metadata: SessionMetadata,
): { accessToken: string; refreshToken: string } => {
  const oldHash = hashToken(oldRefreshToken);
  const sessions = (user.refreshSessions ?? []) as Array<Record<string, unknown>>;
  const matched = sessions.find((session) => String(session.tokenHash) === oldHash);

  if (!matched && !user.refreshTokens.includes(oldRefreshToken)) {
    throw new Error('Refresh token is not recognized');
  }

  const accessToken = generateAccessToken(String(user._id), user.role);
  const refreshToken = generateRefreshToken(String(user._id));
  const tokenId = crypto.randomUUID();
  const now = new Date();

  const filteredSessions = sessions.filter((session) => String(session.tokenHash) !== oldHash);
  filteredSessions.push({
    tokenId,
    tokenHash: hashToken(refreshToken),
    maskedToken: maskToken(refreshToken),
    userAgent: metadata.userAgent ?? matched?.userAgent,
    ipAddress: metadata.ipAddress ?? matched?.ipAddress,
    createdAt: matched?.createdAt ? new Date(String(matched.createdAt)) : now,
    lastUsedAt: now,
  });

  user.refreshSessions = normalizeSessionArray(filteredSessions);
  user.refreshTokens = normalizeTokenArray(
    user.refreshTokens.filter((token) => token !== oldRefreshToken).concat(refreshToken),
  );

  return {
    accessToken,
    refreshToken,
  };
};

export const revokeSessionByToken = (
  user: AuthUserRecord,
  refreshToken: string,
): void => {
  const tokenHash = hashToken(refreshToken);

  user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
  user.refreshSessions = ((user.refreshSessions ?? []) as Array<Record<string, unknown>>).filter(
    (session) => String(session.tokenHash) !== tokenHash,
  );
};

export const revokeSessionById = (
  user: AuthUserRecord,
  tokenId: string,
): boolean => {
  const sessions = (user.refreshSessions ?? []) as Array<Record<string, unknown>>;
  const target = sessions.find((session) => String(session.tokenId) === tokenId);

  if (!target) {
    return false;
  }

  const tokenHash = String(target.tokenHash);

  user.refreshSessions = sessions.filter((session) => String(session.tokenId) !== tokenId);
  user.refreshTokens = user.refreshTokens.filter((token) => hashToken(token) !== tokenHash);
  return true;
};

export const listActiveSessions = (
  user: AuthUserRecord,
): SessionPayload[] => {
  const sessions = (user.refreshSessions ?? []) as Array<Record<string, unknown>>;

  return sessions
    .map((session) => ({
      tokenId: String(session.tokenId),
      maskedToken: String(session.maskedToken ?? 'session'),
      createdAt: new Date(String(session.createdAt)).toISOString(),
      lastUsedAt: new Date(String(session.lastUsedAt ?? session.createdAt)).toISOString(),
      userAgent: session.userAgent ? String(session.userAgent) : undefined,
      ipAddress: session.ipAddress ? String(session.ipAddress) : undefined,
    }))
    .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1));
};
