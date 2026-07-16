import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/applications/[id]/approve
 *
 * Human-in-the-loop approval: marks the application as APPROVED and
 * sets the stage to APPLIED with the current timestamp. The agent never
 * auto-submits; this endpoint is the user's explicit sign-off.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.application.findUnique({
    where: { id: params.id },
    include: { job: { select: { url: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.reviewStatus === "APPROVED") {
    return NextResponse.json(
      { error: "Already approved", url: existing.job?.url },
      { status: 400 }
    );
  }

  const updated = await prisma.application.update({
    where: { id: params.id },
    data: {
      reviewStatus: "APPROVED",
      stage: "APPLIED",
      appliedAt: new Date(),
    },
    include: { job: { select: { url: true } } },
  });

  return NextResponse.json({ ok: true, url: updated.job?.url });
}
