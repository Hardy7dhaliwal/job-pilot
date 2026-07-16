import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/resume-versions/[id] — tailored version with its job context. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: params.id },
    include: {
      resume: { select: { id: true, title: true, content: true } },
      job: { select: { id: true, title: true, company: true } },
    },
  });
  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }
  return NextResponse.json(version);
}

/** PATCH /api/resume-versions/[id] — hand-edit content/label before export. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { content?: unknown; label?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.resumeVersion.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const data: Record<string, string> = {};
  if (typeof body.content === "string" && body.content.trim()) {
    data.content = body.content.trim();
  }
  if (typeof body.label === "string" && body.label.trim()) {
    data.label = body.label.trim();
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.resumeVersion.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(updated);
}

/** DELETE /api/resume-versions/[id] — discard a tailored version. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.resumeVersion.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }
  await prisma.resumeVersion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
