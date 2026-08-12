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
];
const envOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...defaultOrigins, ...envOrigins];

/**
 * Autorise aussi tout domaine *.vercel.app (projet personnel, pas d'enjeu de
 * sécurité à restreindre finement), pour que tous les déploiements Preview
 * et Production des dashboards web fonctionnent sans avoir à maintenir une
 * liste exacte de sous-domaines à chaque nouveau déploiement.
 *
 * Autorise aussi n'importe quel port localhost — "npx serve dist" (utilisé
 * pour tester les exports web de Client/Livreur) choisit un port différent
 * à chaque lancement dès que le port par défaut est déjà occupé (souvent le
 * cas puisque l'API tourne elle-même sur 3000), rendant une liste de ports
 * fixes impraticable en développement.
 */
function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
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