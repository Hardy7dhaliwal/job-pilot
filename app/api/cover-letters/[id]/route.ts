import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/cover-letters/[id] — save hand edits before export. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const existing = await prisma.coverLetter.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
  }

  const updated = await prisma.coverLetter.update({
    where: { id: params.id },
    data: { content: body.content.trim() },
  });
  return NextResponse.json(updated);
}

/** DELETE /api/cover-letters/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.coverLetter.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
  }
  await prisma.coverLetter.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
