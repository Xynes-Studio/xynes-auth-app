import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Generate CSP Nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // CSP Directives
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://cdn.supabase.io ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://*.supabase.co https://api.xynes.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    report-uri /api/csp-report;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

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
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // Initialize response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set CSRF token in header for client-side access
  response.headers.set('x-csrf-token', csrfToken);
  response.headers.set('Content-Security-Policy', cspHeader);

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
