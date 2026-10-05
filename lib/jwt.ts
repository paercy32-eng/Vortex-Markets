import jwt from 'jsonwebtoken';

// ==========================================
// TYPES
// ==========================================
export interface UserTokenPayload {
  userId: string;
  phone: string;
  type: 'user';
}

export interface AdminTokenPayload {
  adminId: string;
  username: string;
  isSuper: boolean;
  type: 'admin';
}

export type TokenPayload = UserTokenPayload | AdminTokenPayload;

// ==========================================
// CONFIG
// ==========================================
const USER_TOKEN_EXPIRY = '30d'; // 30-day sessions
const ADMIN_TOKEN_EXPIRY = '7d'; // Admin sessions shorter for safety

function getUserSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET in environment');
  return secret;
}

function getAdminSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('Missing ADMIN_JWT_SECRET in environment');
  return secret;
}

// ==========================================
// SIGN TOKENS
// ==========================================
export function signUserToken(payload: Omit<UserTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'user' }, getUserSecret(), {
    expiresIn: USER_TOKEN_EXPIRY,
  });
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'admin' }, getAdminSecret(), {
    expiresIn: ADMIN_TOKEN_EXPIRY,
  });
}

// ==========================================
// VERIFY TOKENS
// ==========================================
export function verifyUserToken(token: string): UserTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getUserSecret()) as UserTokenPayload;
    if (decoded.type !== 'user') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getAdminSecret()) as AdminTokenPayload;
    if (decoded.type !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

// ==========================================
// COOKIE NAMES (single source of truth)
// ==========================================
export const USER_COOKIE_NAME = 'vortex_user_token';
export const ADMIN_COOKIE_NAME = 'vortex_admin_token';

// ==========================================
// COOKIE OPTIONS
// ==========================================
export const USER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
