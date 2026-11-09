/** @type {import('next').NextConfig} */
const withNextIntl = require("next-intl/plugin")("./i18n.ts");

const isProd = process.env.NODE_ENV === "production";

// Every host the app legitimately talks to. Anything else is reported (and later blocked).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://source.zoom.us https://*.zoom.us",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://ui-avatars.com https://images.unsplash.com https://api.dicebear.com https://randomuser.me",
  "media-src 'self' blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.zoom.us wss://*.zoom.us blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // STEP 1: report only (nothing is blocked). After a week with no console
  // warnings, rename this key to "Content-Security-Policy" to enforce it.
  ...(isProd ? [{ key: "Content-Security-Policy-Report-Only", value: csp }] : []),
];

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "ui-avatars.com" },
      {
        protocol: "https",
        hostname: "kxihzopuzqwkhtmmlfsc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    domains: ["images.unsplash.com"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Admin pages: never cached, never indexed by search engines
        source: "/admin-:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);