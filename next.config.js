/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds to avoid blocking deploys
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
