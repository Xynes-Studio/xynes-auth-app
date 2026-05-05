
import { describe, it, expect } from 'vitest';
import { middleware } from './middleware';
import { NextRequest } from 'next/server';

describe('Middleware Security Headers', () => {
  it('should set Content-Security-Policy header with nonce', async () => {
    const req = new NextRequest('http://localhost:3000/');
    const res = await middleware(req);

    const csp = res.headers.get('Content-Security-Policy');
    const nonce = res.headers.get('x-nonce');

    expect(nonce).toBeTruthy();
    expect(csp).toBeTruthy();
    expect(csp).toContain(`nonce-${nonce}`);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('should allow POST to /api/csp-report without CSRF token', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
    });
    const res = await middleware(req);

    expect(res.status).not.toBe(403);
  });

  it('should reject POST without CSRF token for other routes', async () => {
    const req = new NextRequest('http://localhost:3000/some-post', {
      method: 'POST',
    });
    const res = await middleware(req);

    expect(res.status).toBe(403);
  });

  it('should include strictly defined directives', async () => {
    const req = new NextRequest('http://localhost:3000/');
    const res = await middleware(req);
    const csp = res.headers.get('Content-Security-Policy') || '';

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it('should allow connecting to configured Supabase URL origin', async () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://84.247.176.134:8000';
    try {
      const req = new NextRequest('http://localhost:3000/');
      const res = await middleware(req);
      const csp = res.headers.get('Content-Security-Policy') || '';

      expect(csp).toContain('connect-src');
      expect(csp).toContain('http://84.247.176.134:8000');
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });

  it('should preserve CSRF token logic', async () => {
    const req = new NextRequest('http://localhost:3000/');
    const res = await middleware(req);

    const csrfToken = res.headers.get('x-csrf-token');
    expect(csrfToken).toBeTruthy();
    
    // Check if cookie set call was made (Response cookies API in middleware is slightly different, 
    // but in unit test output, we can check headers 'set-cookie' if fully emulated, 
    // or we check the object state if we can access it.
    // However, middleware returns a Response. We can check headers properties.)
  });
});
