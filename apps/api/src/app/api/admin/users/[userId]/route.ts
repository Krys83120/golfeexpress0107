import { NextRequest, NextResponse } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";

async function handler(req: NextRequest, { params }: { params: { userId: string } }) {
  await requireAuth(req, ["ADMIN" as any]);

  const body = await req.json();

  const data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: UserRole;
    status?: UserStatus;
  } = {};

  if (typeof body.firstName === "string") data.firstName = body.firstName;
  if (typeof body.lastName === "string") data.lastName = body.lastName;
  if (typeof body.phone === "string") data.phone = body.phone;
  if (body.role && Object.values(UserRole).includes(body.role)) data.role = body.role;
  if (body.status && Object.values(UserStatus).includes(body.status)) data.status = body.status;

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "Aucune donnée valide à modifier.");
  }

  const user = await prisma.user.update({
    where: { id: params.userId },
    data,
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}

export const PATCH = withErrorHandling(handler);