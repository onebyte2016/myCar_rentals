/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  serverExternalPackages: ['jspdf'],
  transpilePackages: ['leaflet'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
