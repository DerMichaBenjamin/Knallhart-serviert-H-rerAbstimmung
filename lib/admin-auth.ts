import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME } from '@/lib/config';

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD fehlt. Bitte in .env.local oder Vercel setzen.');
  }
  return password;
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieValue) return false;

  const expected = hash(getAdminPassword());
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getAdminCookieValue() {
  return hash(getAdminPassword());
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  };
}
