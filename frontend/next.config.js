/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Skip TypeScript errors
  },
  eslint: {
    ignoreDuringBuilds: true, // Skip ESLint errors
  },
};

module.exports = nextConfig;
