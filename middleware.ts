import { NextRequest, NextResponse } from 'next/server';
import { USER_COOKIE_NAME, ADMIN_COOKIE_NAME } from '@/lib/jwt';

// Public user routes
const USER_PUBLIC = ['/login', '/register'];

// Admin public routes (login page accessible without admin auth)
const ADMIN_PUBLIC = ['/admin/login', '/admin/setup'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ==========================================
  // ADMIN ROUTES
  // ==========================================
  if (pathname.startsWith('/admin')) {
    const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isAdminLoggedIn = !!adminToken;
    const isAdminPublic = ADMIN_PUBLIC.some((r) => pathname.startsWith(r));

    // Not logged in, trying to access protected admin page
    if (!isAdminLoggedIn && !isAdminPublic) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = '';
      return NextResponse.redirect(url);
    }

    // Logged in, trying to access admin login page
    if (isAdminLoggedIn && isAdminPublic) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      url.search = '';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // ==========================================
  // USER ROUTES
  // ==========================================
  const userToken = req.cookies.get(USER_COOKIE_NAME)?.value;
  const isUserLoggedIn = !!userToken;
  const isUserPublic = USER_PUBLIC.some((r) => pathname.startsWith(r));

  if (!isUserLoggedIn && !isUserPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isUserLoggedIn && isUserPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/modules';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|_static|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
