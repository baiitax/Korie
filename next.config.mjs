/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security / headless niceness: drop the X-Powered-By header.
  poweredByHeader: false,

  // Let Vercel / Next apply gzip + brotli compression to HTML/JS/CSS.
  compress: true,

  // Target modern browsers + automatic SWC minification.
  swcMinify: true,

  // React dev strictness (double-invoke checks in dev, no effect in prod).
  reactStrictMode: true,

  // Strip verbosity from production client bundles but keep error logs.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Serve brand imagery in modern formats where supported.
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Only import the used icons rather than the whole lucide-react barrel
  // (and keep framer/other optionals out of the bundle when not used).
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
