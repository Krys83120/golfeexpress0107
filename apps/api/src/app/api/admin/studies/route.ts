import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin > Études (ajout du 16/10/2026, demande de Krys) -- trace des études
 * de marché réalisées avec MiroFish (commerçants, clients, livreurs).
 * MiroFish tourne en local sur l'ordinateur de Krys : aucune liaison
 * automatique, les résultats sont saisis depuis la page Admin.
 *
 * Une seule route (GET/POST/PATCH/DELETE, id en query ou dans le body)
 * plutôt qu'un dossier [studyId] : même effet, un fichier de moins.
 */

const AUDIENCES = ["MERCHANTS", "CLIENTS", "RIDERS"] as const;

const actionSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1, "Une action ne peut pas être vide."),
  done: z.boolean(),
});

const optionalText = z.string().trim().optional().nullable();

const studyFieldsSchema = z.object({
  audience: z.enum(AUDIENCES),
  title: z.string().trim().min(1, "Le titre est requis."),
  question: optionalText,
  summary: optionalText,
  findings: optionalText,
  actions: z.array(actionSchema).optional(),
  simulationId: optionalText,
  reportId: optionalText,
  rounds: z.number().int().min(0).optional().nullable(),
  agents: z.number().int().min(0).optional().nullable(),
  limitsNote: optionalText,
});

const updateStudySchema = studyFieldsSchema.partial().extend({
  id: z.string().trim().min(1),
});

/** GET /api/admin/studies */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const studies = await prisma.marketStudy.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ studies });
}

/** POST /api/admin/studies */
async function postHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = studyFieldsSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const d = parsed.data;

  const study = await prisma.marketStudy.create({
    data: {
      audience: d.audience,
      title: d.title,
      question: d.question || null,
      summary: d.summary || null,
      findings: d.findings || null,
      actions: d.actions ?? [],
      simulationId: d.simulationId || null,
      reportId: d.reportId || null,
      rounds: d.rounds ?? null,
      agents: d.agents ?? null,
      limitsNote: d.limitsNote || null,
    },
  });
  return NextResponse.json({ study }, { status: 201 });
}

/** PATCH /api/admin/studies -- body : { id, ...champs à modifier } */
async function patchHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = updateStudySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const { id, ...d } = parsed.data;

  const existing = await prisma.marketStudy.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Étude introuvable.");

  const study = await prisma.marketStudy.update({
    where: { id },
    data: {
      ...(d.audience !== undefined ? { audience: d.audience } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.question !== undefined ? { question: d.question || null } : {}),
      ...(d.summary !== undefined ? { summary: d.summary || null } : {}),
      ...(d.findings !== undefined ? { findings: d.findings || null } : {}),
      ...(d.actions !== undefined ? { actions: d.actions } : {}),
      ...(d.simulationId !== undefined ? { simulationId: d.simulationId || null } : {}),
      ...(d.reportId !== undefined ? { reportId: d.reportId || null } : {}),
      ...(d.rounds !== undefined ? { rounds: d.rounds } : {}),
      ...(d.agents !== undefined ? { agents: d.agents } : {}),
      ...(d.limitsNote !== undefined ? { limitsNote: d.limitsNote || null } : {}),
    },
  });
  return NextResponse.json({ study });
}

/** DELETE /api/admin/studies?id=... */
async function deleteHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) throw new ApiError(400, "Identifiant manquant.");

  const existing = await prisma.marketStudy.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Étude introuvable.");

  await prisma.marketStudy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
