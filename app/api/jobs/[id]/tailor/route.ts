import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIError, callClaudeText } from "@/lib/ai";
import { ensureParsed } from "@/lib/analyze";
import { TAILOR_SYSTEM, tailorUser } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Parse the XML-style tags the tailor model returns.
 *
 * Expected format:
 *   <tailored_resume>
 *   ...markdown...
 *   </tailored_resume>
 *
 *   <changes_made>
 *   ["change 1", "change 2"]
 *   </changes_made>
 *
 * Returns the trimmed resume content and a list of changes.
 */
function parseTailorOutput(text: string): { content: string; changesMade: string[] } {
  const resumeMatch = text.match(/<tailored_resume>\s*([\s\S]*?)\s*<\/tailored_resume>/);
  const changesMatch = text.match(/<changes_made>\s*([\s\S]*?)\s*<\/changes_made>/);

  // Fallback: some providers/agents may return plain markdown without the
  // requested XML tags. Treat the whole output as the resume in that case.
  const content = resumeMatch?.[1]?.trim() ?? text.trim();
  let changesMade: string[] = [];

  if (changesMatch?.[1]) {
    const changesText = changesMatch[1].trim();
    try {
      const parsed = JSON.parse(changesText);
      if (Array.isArray(parsed)) {
        changesMade = parsed.filter((item) => typeof item === "string");
      }
    } catch {
      // Fallback: treat as a bulleted/plaintext list.
      changesMade = changesText
        .split("\n")
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);
    }
  }

  return { content, changesMade };
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

    const raw = await callClaudeText({
      system: TAILOR_SYSTEM,
      user: tailorUser(
        master.content,
        JSON.stringify(parsed, null, 2),
        job.title,
        job.company
      ),
      maxTokens: 8192, // full resume + audit list
    });

    const { content, changesMade } = parseTailorOutput(raw);

    if (!content) {
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
        content,
        changesMade: JSON.stringify(changesMade),
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
