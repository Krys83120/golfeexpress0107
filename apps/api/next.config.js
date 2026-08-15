/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only : pas de pages front, on désactive le strict mode React qui ne sert à rien ici
  reactStrictMode: true,
  experimental: {
    // Permet d'utiliser le client Prisma généré dans packages partagés sans erreur de bundling.
    // pdfkit/fontkit sont ajoutés pour la même raison qu'ils ont fait planter les tickets/rapports
    // Z en production (500 "Erreur interne du serveur") : ces libs lisent des fichiers de données
    // (polices .afm) sur disque via des chemins relatifs à leur propre dossier au moment de
    // l'exécution. Si webpack les bundle "normalement", ces fichiers ne suivent pas et Vercel ne
    // les inclut pas dans la fonction serverless → ENOENT au premier appel PDF. En les marquant
    // "external", Next laisse le tracer de fichiers (nft) copier tout le contenu du package,
    // fichiers de données compris.
    serverComponentsExternalPackages: ["@prisma/client", "pdfkit", "fontkit"],
  },
};

module.exports = nextConfig;
