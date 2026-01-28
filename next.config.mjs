/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile external packages from local links
  transpilePackages: [
    "@xynes/auth-sdk",
    "@lumia-ui/components",
    "@lumia-ui/forms",
    "@lumia-ui/icons",
  ],
  // Allow cross-origin requests for OAuth callbacks
  async headers() {
    return [
      {
        source: "/callback",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
