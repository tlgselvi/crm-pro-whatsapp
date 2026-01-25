import type { NextConfig } from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: any = {
  output: 'standalone',
  // Next.js 16 compatibility: next-pwa requires webpack. 
  // We remove turbopack config to allow standard webpack plugins to run.
};

export default withPWA(nextConfig);
