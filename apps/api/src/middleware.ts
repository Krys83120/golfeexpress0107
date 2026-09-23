import { NextRequest, NextResponse } from "next/server";

// Origines autorisées en CORS. En dev, les ports Vite locaux. En prod, les
// domaines Vercel des dashboards web (Pro/Admin) — configurables via la
// variable d'env ALLOWED_ORIGINS (liste séparée par des virgules) pour ne
// pas avoir à modifier le code à chaque nouveau domaine/preview Vercel.
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://golfeexpress0107-admin.vercel.app",
  "https://doyougeckoo.fr",
  "https://www.doyougeckoo.fr",
  "https://commander.doyougeckoo.fr",
  "https://livreur.doyougeckoo.fr",
  "https://pro.doyougeckoo.fr",
  "https://admin.doyougeckoo.fr",
];
const envOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...defaultOrigins, ...envOrigins];

// Resserré le 23/09/2026 (audit sécurité demandé par Krys) : ce suffixe est
// propre au compte/équipe Vercel de Krys -- personne d'autre ne peut créer
// un déploiement dont l'URL se termine par "-<ce-suffixe>.vercel.app",
// Vercel garantissant l'unicité du slug d'équipe dans ses URLs. Surchargeable
// via VERCEL_TEAM_SLUG si le compte Vercel change un jour.
const vercelTeamSlug = process.env.VERCEL_TEAM_SLUG ?? "krys-projects-cc226fd7";
const vercelPreviewPattern = new RegExp(`^https://[a-z0-9-]+-${vercelTeamSlug}\\.vercel\\.app$`);

/**
 * Autorise les déploiements Preview/Production Vercel du VRAI compte de
 * Krys (via vercelPreviewPattern ci-dessus), et non plus N'IMPORTE QUEL
 * sous-domaine *.vercel.app comme avant le 23/09/2026 -- l'ancienne version
 * acceptait par erreur des requêtes authentifiées (Bearer token) depuis
 * l'app Vercel de n'importe qui d'autre, ce qui n'apportait aucun bénéfice
 * réel (les déploiements de Krys ont tous ce suffixe) et élargissait
 * inutilement la surface d'attaque en cas de token volé par ailleurs (XSS).
 *
 * Autorise aussi n'importe quel port localhost — "npx serve dist" (utilisé
 * pour tester les exports web de Client/Livreur) choisit un port différent
 * à chaque lancement dès que le port par défaut est déjà occupé (souvent le
 * cas puisque l'API tourne elle-même sur 3000), rendant une liste de ports
 * fixes impraticable en développement. Sans risque réel : un navigateur
 * n'envoie "origin: http://localhost:PORT" que si la page appelante tourne
 * elle-même sur cette machine, impossible à falsifier depuis un site distant.
 */
function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  if (vercelPreviewPattern.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)?doyougeckoo\.fr$/.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const isAllowed = isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowed ? origin : defaultOrigins[0],
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const res = NextResponse.next();

  if (isAllowed) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return res;
}

export const config = {
  matcher: "/api/:path*",
};