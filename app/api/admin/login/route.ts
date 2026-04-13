import { NextResponse } from 'next/server';
import { getAdminCookieOptions, getAdminCookieValue, getAdminPassword } from '@/lib/admin-auth';
import { ADMIN_COOKIE_NAME } from '@/lib/config';

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');

  if (password !== getAdminPassword()) {
    return NextResponse.redirect(new URL('/admin/login', request.url), 303);
  }

  const response = NextResponse.redirect(new URL('/admin', request.url), 303);
  response.cookies.set(ADMIN_COOKIE_NAME, getAdminCookieValue(), getAdminCookieOptions());
  return response;
}
