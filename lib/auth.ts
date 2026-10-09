import { cookies } from 'next/headers';
import { getServiceClient } from './supabase';
import {
  USER_COOKIE_NAME,
  ADMIN_COOKIE_NAME,
  verifyUserToken,
  verifyAdminToken,
  type UserTokenPayload,
  type AdminTokenPayload,
} from './jwt';

export interface FullUser {
  id: string;
  name: string;
  phone: string;
  balance: number;
  referral_code: string;
  referred_by: string | null;
  is_bound: boolean;
  bound_phone: string | null;
  bound_full_name: string | null;
  is_banned: boolean;
  created_at: string;
}

export async function getCurrentUser(): Promise<FullUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(USER_COOKIE_NAME)?.value;

    if (!token) return null;

    const payload: UserTokenPayload | null = verifyUserToken(token);
    if (!payload) return null;

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('users')
      .select(
        'id, name, phone, balance, referral_code, referred_by, is_bound, bound_phone, bound_full_name, is_banned, created_at'
      )
      .eq('id', payload.userId)
      .maybeSingle();

    if (error || !data) return null;

    // --- Banned users are treated as logged out everywhere ---
    if (data.is_banned) return null;

    return {
      ...data,
      balance: Number(data.balance) || 0,
    } as FullUser;
  } catch {
    return null;
  }
}

export async function getCurrentAdmin(): Promise<AdminTokenPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = verifyAdminToken(token);
    if (!payload) return null;

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('admins')
      .select('id, username, is_super')
      .eq('id', payload.adminId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      adminId: data.id,
      username: data.username,
      isSuper: data.is_super,
      type: 'admin',
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<FullUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError('Not authenticated');
  }
  return user;
}

export async function requireAdmin(): Promise<AdminTokenPayload> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new AuthError('Not authenticated as admin');
  }
  return admin;
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
