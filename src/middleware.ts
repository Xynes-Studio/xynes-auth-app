import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Get existing CSRF token from cookie
  let csrfToken = req.cookies.get('csrf_token')?.value;
  const isNewToken = !csrfToken;

  // Generate new token if missing
  if (!csrfToken) {
    csrfToken = crypto.randomUUID();
  }

  // Create request headers for downstream components (server components, layout)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-csrf-token', csrfToken);

  // Initialize response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set CSRF token in header for client-side access
  response.headers.set('x-csrf-token', csrfToken);

  // Set httpOnly cookie if it's a new token
  if (isNewToken) {
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || '.xynes.com',
    });
  }

  // Validate CSRF token for state-changing methods
  const method = req.method;
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const headerToken = req.headers.get('x-csrf-token');
    
    // If token was just generated (isNewToken), it means the request didn't have a valid cookie,
    // so it couldn't have had a valid header derived from it.
    if (isNewToken || !headerToken || headerToken !== csrfToken) {
      return NextResponse.json(
        { message: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
