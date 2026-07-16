import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIError, callClaudeJSON } from "@/lib/ai";
import { ensureParsed } from "@/lib/analyze";
import { COVER_LETTER_SYSTEM, coverLetterUser } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/jobs/[id]/cover-letter
 *
 * Generate a cover letter from the master resume + this job's parsed
 * requirements. One letter per job: regenerating replaces the existing
 * letter's content (the user can also edit it by hand via PATCH
 * /api/cover-letters/[id] before exporting).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const master = await prisma.resume.findFirst({ where: { isMaster: true } });
  if (!master) {
    return NextResponse.json(
      { error: "No master resume set. Add a resume first." },
      { status: 400 }
    );
  }

  try {
    const parsed = await ensureParsed(job);

    const result = await callClaudeJSON<{ content: string }>({
      system: COVER_LETTER_SYSTEM,
      user: coverLetterUser(
        master.content,
        JSON.stringify(parsed, null, 2),
        job.title,
        job.company,
        job.description
      ),
      maxTokens: 2048,
    });

    if (!result.content?.trim()) {
      return NextResponse.json(
        { error: "The AI returned an empty letter. Please try again." },
        { status: 502 }
      );
    }

    const existing = await prisma.coverLetter.findFirst({
      where: { jobId: job.id },
    });

    const letter = existing
      ? await prisma.coverLetter.update({
          where: { id: existing.id },
          data: { content: result.content.trim() },
        })
      : await prisma.coverLetter.create({
          data: { jobId: job.id, content: result.content.trim() },
        });

    return NextResponse.json(letter, { status: existing ? 200 : 201 });
  } catch (err) {
    if (err instanceof AIError) {
      return NextResponse.json(
        { error: err.message, retryable: err.retryable },
        { status: err.status }
      );
    }
    console.error("Cover letter failed:", err);
    return NextResponse.json(
      { error: "Cover letter generation failed unexpectedly. Please try again." },
      { status: 500 }
    );
  }
}
