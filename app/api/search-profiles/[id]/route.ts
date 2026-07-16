import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JOB_SOURCES, SENIORITY_LEVELS } from "@/lib/constants";

/** GET /api/search-profiles/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await prisma.searchProfile.findUnique({ where: { id: params.id } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}

/** PATCH /api/search-profiles/[id] */
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

  const existing = await prisma.searchProfile.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.keywords === "string" && body.keywords.trim()) data.keywords = body.keywords.trim();
  if (typeof body.location === "string") data.location = body.location.trim() || null;
  if (typeof body.remoteOnly === "boolean") data.remoteOnly = body.remoteOnly;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.seniority === null) {
    data.seniority = null;
  } else if (
    typeof body.seniority === "string" &&
    (SENIORITY_LEVELS as readonly string[]).includes(body.seniority)
  ) {
    data.seniority = body.seniority;
  }
  if (Array.isArray(body.sources)) {
    const valid = body.sources.filter(
      (s): s is string =>
        typeof s === "string" && (JOB_SOURCES as readonly string[]).includes(s)
    );
    data.sources = JSON.stringify(valid);
  }

  const updated = await prisma.searchProfile.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

/** DELETE /api/search-profiles/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.searchProfile.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.searchProfile.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
