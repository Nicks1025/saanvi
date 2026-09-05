import { NextResponse } from 'next/server';

export function middleware(request) {
  const authToken = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that authenticated users should NOT see (they get redirected to dashboard)
  const authRestrictedPaths = ['/', '/login', '/signup'];

  // Paths that REQUIRE authentication
  const protectedPaths = ['/dashboard', '/admin', '/settings'];

  const isRestrictedPath = authRestrictedPaths.includes(pathname);
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));

  // If authenticated and trying to access a public entry page, redirect to dashboard
  if (authToken && isRestrictedPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If unauthenticated and trying to access a protected page, redirect to login
  if (!authToken && isProtectedPath) {
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
