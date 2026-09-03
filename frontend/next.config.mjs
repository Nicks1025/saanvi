/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'f37119eaaac123ede9bd83ac9b3f209b.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
