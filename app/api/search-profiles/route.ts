import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JOB_SOURCES, SENIORITY_LEVELS } from "@/lib/constants";

/**
 * GET /api/search-profiles — list all saved search profiles.
 */
export async function GET() {
  const profiles = await prisma.searchProfile.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(profiles);
}

/**
 * POST /api/search-profiles — create a new search profile.
 * Body: { name, keywords, location?, remoteOnly?, seniority?, sources?, isActive? }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const keywords = typeof body.keywords === "string" ? body.keywords.trim() : "";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!keywords) return NextResponse.json({ error: "Keywords are required" }, { status: 400 });

  const location =
    typeof body.location === "string" && body.location.trim() ? body.location.trim() : null;
  const remoteOnly = body.remoteOnly === true;
  const seniority =
    typeof body.seniority === "string" &&
    (SENIORITY_LEVELS as readonly string[]).includes(body.seniority)
      ? body.seniority
      : null;

  let sources: string[] = [];
  if (Array.isArray(body.sources)) {
    sources = body.sources.filter(
      (s): s is string =>
        typeof s === "string" && (JOB_SOURCES as readonly string[]).includes(s)
    );
  }

  const profile = await prisma.searchProfile.create({
    data: {
      name,
      keywords,
      location,
      remoteOnly,
      seniority,
      sources: JSON.stringify(sources.length ? sources : JOB_SOURCES),
      isActive: body.isActive !== false,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
