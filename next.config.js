/** @type {import('next').NextConfig} */
const withNextIntl = require("next-intl/plugin")("./i18n.ts");

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
    domains: ["images.unsplash.com"],
  },
};

module.exports = withNextIntl(nextConfig);
