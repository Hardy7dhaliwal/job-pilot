import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STAGES } from "@/lib/constants";

/**
 * GET /api/applications — list all applications, optionally filtered by stage.
 * Query: ?stage=DISCOVERED (comma-separated for multiple)
 */
export async function GET(req: NextRequest) {
  const stageParam = req.nextUrl.searchParams.get("stage");
  const stages = stageParam
    ? stageParam.split(",").filter((s) => (APPLICATION_STAGES as readonly string[]).includes(s))
    : undefined;

  const applications = await prisma.application.findMany({
    where: stages ? { stage: { in: stages } } : undefined,
    orderBy: [{ stage: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      job: { select: { id: true, title: true, company: true, matchScore: true, url: true } },
    },
  });

  return NextResponse.json(applications);
}

/**
 * POST /api/applications — create an application from a job.
 * Body: { jobId, stage? }
 * Returns 409 if the job already has an application.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const existing = await prisma.application.findUnique({ where: { jobId } });
  if (existing) {
    return NextResponse.json(
      { error: "Application already exists for this job", existingId: existing.id },
      { status: 409 }
    );
  }

  const stage =
    typeof body.stage === "string" &&
    (APPLICATION_STAGES as readonly string[]).includes(body.stage)
      ? body.stage
      : "DISCOVERED";

  const maxOrder = await prisma.application.aggregate({
    where: { stage },
    _max: { sortOrder: true },
  });

  const app = await prisma.application.create({
    data: {
      jobId,
      stage,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: {
      job: { select: { id: true, title: true, company: true, matchScore: true, url: true } },
    },
  });

  return NextResponse.json(app, { status: 201 });
}
