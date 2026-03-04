/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const proxyTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:4000";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${proxyTarget}/api/v1/:path*`
      }
    ];
  }
};

export default nextConfig;
