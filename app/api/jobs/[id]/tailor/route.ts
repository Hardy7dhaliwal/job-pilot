import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIError, callClaudeJSON } from "@/lib/ai";
import { ensureParsed } from "@/lib/analyze";
import { TAILOR_SYSTEM, tailorUser } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

interface TailorOutput {
  content: string;
  changesMade: string[];
}

/**
 * POST /api/jobs/[id]/tailor
 *
 * One-click tailored resume: takes the master resume and this job's
 * parsed requirements, and produces a ResumeVersion whose content only
 * reorders/reframes/re-emphasizes real resume content. The model must
 * also return a changesMade audit list so every edit is reviewable.
 *
 * Each run creates a NEW version (history is kept; see the resume's
 * version list). Parses the JD first if that hasn't happened yet.
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

    const result = await callClaudeJSON<TailorOutput>({
      system: TAILOR_SYSTEM,
      user: tailorUser(
        master.content,
        JSON.stringify(parsed, null, 2),
        job.title,
        job.company
      ),
      maxTokens: 8192, // full resume + audit list
    });

    if (!result.content?.trim()) {
      return NextResponse.json(
        { error: "The AI returned an empty resume. Please try again." },
        { status: 502 }
      );
    }

    const version = await prisma.resumeVersion.create({
      data: {
        resumeId: master.id,
        jobId: job.id,
        label: `Tailored for ${job.company} — ${job.title}`,
        content: result.content.trim(),
        changesMade: JSON.stringify(
          Array.isArray(result.changesMade) ? result.changesMade : []
        ),
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    if (err instanceof AIError) {
      return NextResponse.json(
        { error: err.message, retryable: err.retryable },
        { status: err.status }
      );
    }
    console.error("Tailor failed:", err);
    return NextResponse.json(
      { error: "Tailoring failed unexpectedly. Please try again." },
      { status: 500 }
    );
  }
}
