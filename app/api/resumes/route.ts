import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RESUME_FORMATS } from "@/lib/constants";

/**
 * GET /api/resumes — list all resumes (newest first, master pinned on top),
 * with version counts for the list view.
 */
export async function GET() {
  const resumes = await prisma.resume.findMany({
    orderBy: [{ isMaster: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { versions: true } } },
  });
  return NextResponse.json(resumes);
}

/**
 * POST /api/resumes — create a resume from pasted content.
 * Body: { title: string, content: string, format?: "markdown" | "text",
 *         isMaster?: boolean }
 *
 * The first resume ever created automatically becomes the master.
 */
export async function POST(req: NextRequest) {
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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const format =
    typeof body.format === "string" &&
    (RESUME_FORMATS as readonly string[]).includes(body.format)
      ? body.format
      : "markdown";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json(
      { error: "Resume content is required" },
      { status: 400 }
    );
  }

  const existingCount = await prisma.resume.count();
  const wantsMaster = body.isMaster === true || existingCount === 0;

  const resume = await prisma.$transaction(async (tx) => {
    if (wantsMaster) {
      // Enforce the single-master invariant.
      await tx.resume.updateMany({ data: { isMaster: false } });
    }
    return tx.resume.create({
      data: { title, content, format, isMaster: wantsMaster },
    });
  });

  return NextResponse.json(resume, { status: 201 });
}
