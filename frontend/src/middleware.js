import { NextResponse } from 'next/server';

export function middleware(request) {
  const authToken = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const { pathname } = request.nextUrl;
  const reason = request.nextUrl.searchParams.get('reason');

  // Paths that authenticated users should NOT see (they get redirected to dashboard)
  const authRestrictedPaths = ['/', '/login', '/signup'];

  // Paths that REQUIRE authentication
  const protectedPaths = ['/dashboard', '/admin', '/settings'];

  const isRestrictedPath = authRestrictedPaths.includes(pathname);
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));

  // If redirected with session_expired or invalidsession, clear stale auth cookies and render login
  if (reason === 'session_expired' || reason === 'invalidsession') {
    const response = NextResponse.next();
    response.cookies.delete('auth_token');
    response.cookies.delete('refreshToken');
    return response;
  }

  // If authenticated (or possesses a valid refresh session) and trying to access a public entry page, redirect to dashboard
  if ((authToken || refreshToken) && isRestrictedPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If completely unauthenticated (neither auth_token nor refreshToken) and trying to access a protected page, redirect to login
  if (!authToken && !refreshToken && isProtectedPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
