import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Générer un export statique (créera des fichiers HTML lors du build si les pages sont exportables)
  // Voir : https://nextjs.org/docs/pages/static-export
  output: 'export',
  // Facultatif : crée des dossiers par route (ex: /about/index.html)
  trailingSlash: true,
  eslint: {
    // Désactiver ESLint pendant le build (erreurs any)
    ignoreDuringBuilds: true,
  },
  images: {
    // Désactiver l'optimisation d'images pour l'export statique
    unoptimized: true,
    // Accepter tous les formats d'images
    formats: ['image/avif', 'image/webp'],
    // Autoriser les domaines externes si besoin
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
