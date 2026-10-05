import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, USER_COOKIE_NAME } from '@/lib/jwt';

// ==========================================
// ROUTES
// ==========================================
// Public routes — accessible without login
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
    pathname.includes('.') // any file with extension (favicon.ico, etc.)
  ) {
    return NextResponse.next();
  }

  // Read the user token
  const token = req.cookies.get(USER_COOKIE_NAME)?.value;
  const payload = token ? verifyUserToken(token) : null;
  const isLoggedIn = !!payload;

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // --- Not logged in, trying to access a protected route ---
  if (!isLoggedIn && !isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // --- Logged in, trying to access login/register ---
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
// Only run middleware on these paths.
// ==========================================
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /api/*          (API routes)
     * - /_next/*        (Next.js internals)
     * - /_static/*      (static assets)
     * - /favicon.ico    (favicon)
     * - /robots.txt     (robots)
     * - /sitemap.xml    (sitemap)
     */
    '/((?!api|_next|_static|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
