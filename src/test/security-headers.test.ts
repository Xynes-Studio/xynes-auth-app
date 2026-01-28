import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config.mjs';

interface HeaderConfig {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

describe('Security Headers', () => {
  it('should have strict security headers configured', async () => {
    // @ts-expect-error - nextConfig type might not be fully inferred
    const headersList: HeaderConfig[] = await nextConfig.headers();
    const globalHeaders = headersList.find((h) => h.source === '/:path*');

    expect(globalHeaders).toBeDefined();

    const headers = globalHeaders?.headers || [];
    const headerMap: Record<string, string> = {};
    headers.forEach((h) => {
      headerMap[h.key] = h.value;
    });

    expect(headerMap['X-Frame-Options']).toBe('DENY');
    expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
    expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headerMap['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload');

    // Check Permissions-Policy contains critical restrictions
    expect(headerMap['Permissions-Policy']).toContain('camera=()');
    expect(headerMap['Permissions-Policy']).toContain('microphone=()');
    expect(headerMap['Permissions-Policy']).toContain('geolocation=()');
    expect(headerMap['Permissions-Policy']).toContain('payment=()');
  });
});
