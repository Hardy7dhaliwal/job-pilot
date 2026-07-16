import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RESUME_FORMATS } from "@/lib/constants";

/**
 * GET /api/resumes/[id] — one resume with its version history
 * (versions include the job they were tailored for, when linked).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const resume = await prisma.resume.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: { job: { select: { id: true, title: true, company: true } } },
      },
    },
  });
  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }
  return NextResponse.json(resume);
}

/**
 * PATCH /api/resumes/[id] — update title/content/format, or promote to
 * master. Setting isMaster: true demotes any other master (single-master
 * invariant). Setting isMaster: false is rejected — demote by promoting
 * another resume, so there is always exactly one master.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: {
    title?: unknown;
    content?: unknown;
    format?: unknown;
    isMaster?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.resume.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (typeof body.content === "string" && body.content.trim()) {
    data.content = body.content.trim();
  }
  if (
    typeof body.format === "string" &&
    (RESUME_FORMATS as readonly string[]).includes(body.format)
  ) {
    data.format = body.format;
  }
  if (body.isMaster === false && existing.isMaster) {
    return NextResponse.json(
      { error: "Cannot unset master directly — mark another resume as master instead" },
      { status: 400 }
    );
  }

  const promote = body.isMaster === true && !existing.isMaster;

  const updated = await prisma.$transaction(async (tx) => {
    if (promote) {
      await tx.resume.updateMany({ data: { isMaster: false } });
      data.isMaster = true;
    }
    return tx.resume.update({ where: { id: params.id }, data });
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/resumes/[id] — delete a resume and (via cascade) its
 * versions. The master resume cannot be deleted while others exist;
 * promote another one first.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.resume.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  if (existing.isMaster) {
    const others = await prisma.resume.count({
      where: { id: { not: params.id } },
    });
    if (others > 0) {
      return NextResponse.json(
        { error: "Cannot delete the master resume — mark another resume as master first" },
        { status: 400 }
      );
    }
  }

  await prisma.resume.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
