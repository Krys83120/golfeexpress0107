/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only : pas de pages front, on désactive le strict mode React qui ne sert à rien ici
  reactStrictMode: true,
  experimental: {
    // Permet d'utiliser le client Prisma généré dans packages partagés sans erreur de bundling
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

module.exports = nextConfig;
