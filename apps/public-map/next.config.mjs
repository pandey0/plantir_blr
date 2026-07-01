/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Map libraries can sometimes be fussy with strict mode double-renders
  transpilePackages: ['leaflet', 'react-leaflet'],
};

export default nextConfig;
