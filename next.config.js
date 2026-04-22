/** @type {import('next').NextConfig} */
const nextConfig = {
  // Env vars are read from .env.local (local) or deployment platform env vars (Vercel/Railway/etc.)
  // Do NOT hardcode them here.
  images: { unoptimized: true },
};

module.exports = nextConfig;
