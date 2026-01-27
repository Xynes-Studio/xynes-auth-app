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
    ];
  },
};

export default nextConfig;
