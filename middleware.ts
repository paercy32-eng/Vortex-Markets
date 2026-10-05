import { NextRequest, NextResponse } from 'next/server';
import { USER_COOKIE_NAME } from '@/lib/jwt';

// ==========================================
// ROUTES
// ==========================================
const PUBLIC_ROUTES = ['/login', '/register'];

// ==========================================
// MIDDLEWARE
// ==========================================
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Soft check — real verification happens in each API route
  const token = req.cookies.get(USER_COOKIE_NAME)?.value;
  const isLoggedIn = !!token;

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (!isLoggedIn && !isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ==========================================
// MATCHER
// ==========================================
export const config = {
  matcher: [
    '/((?!api|_next|_static|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
