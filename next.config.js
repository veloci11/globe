/** @type {import('next').NextConfig} */
const nextConfig = {
  // Supprimer les consoles en production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig