import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STAGES, REVIEW_STATUSES } from "@/lib/constants";

/**
 * PATCH /api/applications/[id] — update stage, sortOrder, notes, dates,
 * reviewStatus, or linked resume/cover-letter IDs.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.application.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (
    typeof body.stage === "string" &&
    (APPLICATION_STAGES as readonly string[]).includes(body.stage)
  ) {
    data.stage = body.stage;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = body.sortOrder;
  }
  if (typeof body.notes === "string") {
    data.notes = body.notes;
  }
  if (typeof body.appliedAt === "string") {
    data.appliedAt = new Date(body.appliedAt);
  }
  if (body.appliedAt === null) data.appliedAt = null;
  if (typeof body.followUpAt === "string") {
    data.followUpAt = new Date(body.followUpAt);
  }
  if (body.followUpAt === null) data.followUpAt = null;
  if (
    typeof body.reviewStatus === "string" &&
    (REVIEW_STATUSES as readonly string[]).includes(body.reviewStatus)
  ) {
    data.reviewStatus = body.reviewStatus;
  }
  if (typeof body.resumeVersionId === "string" || body.resumeVersionId === null) {
    data.resumeVersionId = body.resumeVersionId;
  }
  if (typeof body.coverLetterId === "string" || body.coverLetterId === null) {
    data.coverLetterId = body.coverLetterId;
  }

  const updated = await prisma.application.update({
    where: { id: params.id },
    data,
    include: {
      job: { select: { id: true, title: true, company: true, matchScore: true, url: true } },
    },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/applications/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.application.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.application.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
