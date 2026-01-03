/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow cross-origin requests for OAuth callbacks
  async headers() {
    return [
      {
        source: '/callback',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
