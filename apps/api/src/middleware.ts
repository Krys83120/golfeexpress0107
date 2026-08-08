import { NextRequest, NextResponse } from "next/server";

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://golfeexpress0107-admin.vercel.app",
];
const envOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...defaultOrigins, ...envOrigins];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
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