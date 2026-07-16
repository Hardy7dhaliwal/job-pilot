import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/jobs/[id] — full job record including parsed/match JSON. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

/** DELETE /api/jobs/[id] — remove a job (cascades to application/letters). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  await prisma.job.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
