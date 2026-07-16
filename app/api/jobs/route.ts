import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { makeDedupeKey } from "@/lib/jobs";

/**
 * GET /api/jobs — list jobs. Query params:
 *   q:        free-text search over title/company/location
 *   minScore: only jobs with matchScore >= this
 *   sort:     "score" (default, desc, unscored last) | "date" (discovered desc)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const minScore = Number(searchParams.get("minScore"));
  const sort = searchParams.get("sort") === "date" ? "date" : "score";

  const where: Prisma.JobWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { company: { contains: q } },
      { location: { contains: q } },
    ];
  }
  if (Number.isFinite(minScore) && minScore > 0) {
    where.matchScore = { gte: minScore };
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy:
      sort === "date"
        ? [{ discoveredAt: "desc" }]
        : [{ matchScore: { sort: "desc", nulls: "last" } }, { discoveredAt: "desc" }],
    select: {
      id: true,
      source: true,
      title: true,
      company: true,
      location: true,
      remote: true,
      url: true,
      matchScore: true,
      parsedAt: true,
      scoredAt: true,
      discoveredAt: true,
    },
  });

  return NextResponse.json(jobs);
}

/**
 * POST /api/jobs — manual job entry (paste a JD).
 * Body: { title, company, description, location?, url?, remote? }
 * Returns 409 with the existing job's id if the dedupe key already exists.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const location =
    typeof body.location === "string" && body.location.trim() ? body.location.trim() : null;
  const url = typeof body.url === "string" && body.url.trim() ? body.url.trim() : null;
  const remote = body.remote === true;

  if (!title) return NextResponse.json({ error: "Job title is required" }, { status: 400 });
  if (!company) return NextResponse.json({ error: "Company is required" }, { status: 400 });
  if (!description) {
    return NextResponse.json({ error: "Job description is required" }, { status: 400 });
  }

  const dedupeKey = makeDedupeKey(company, title, location);

  const existing = await prisma.job.findUnique({ where: { dedupeKey } });
  if (existing) {
    return NextResponse.json(
      { error: "This job already exists", existingId: existing.id },
      { status: 409 }
    );
  }

  const job = await prisma.job.create({
    data: { source: "manual", dedupeKey, title, company, location, url, remote, description },
  });

  return NextResponse.json(job, { status: 201 });
}

/**
 * DELETE /api/jobs — purge untracked jobs (jobs without a linked Application).
 */
export async function DELETE() {
  const result = await prisma.job.deleteMany({
    where: {
      application: null,
    },
  });

  return NextResponse.json({ deletedCount: result.count });
}
