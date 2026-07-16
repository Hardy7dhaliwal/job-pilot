import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIError, callClaudeJSON } from "@/lib/ai";
import { ensureParsed } from "@/lib/analyze";
import {
  MATCH_SCORE_SYSTEM,
  matchScoreUser,
} from "@/lib/prompts";
import type { MatchResult } from "@/lib/types";

// AI calls can take a while; run on Node with an extended limit.
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/jobs/[id]/analyze
 *
 * Runs the two Phase-2 AI steps for one job:
 *   1. Parse the JD into structured requirements  -> Job.parsedJson (reuses cached if available)
 *   2. Score the resume content against it (0-100) -> Job.matchScore/matchJson
 *
 * Supports an optional JSON body: { resumeVersionId: string } to score a tailored version.
 * Otherwise, scores the master resume.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Parse optional request body
  let body: { resumeVersionId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body is empty or malformed; default to master resume
  }

  let resumeContent = "";

  if (body.resumeVersionId) {
    const version = await prisma.resumeVersion.findFirst({
      where: { id: body.resumeVersionId, jobId: job.id },
    });
    if (!version) {
      return NextResponse.json({ error: "Tailored version not found" }, { status: 404 });
    }
    resumeContent = version.content;
  } else {
    const master = await prisma.resume.findFirst({ where: { isMaster: true } });
    if (!master) {
      return NextResponse.json(
        { error: "No master resume set. Add a resume first — matching runs against your master resume." },
        { status: 400 }
      );
    }
    resumeContent = master.content;
  }

  try {
    // Step 1: Parse/ensure parsed JD.
    const parsed = await ensureParsed(job);

    // Step 2: Score the selected resume against the parsed requirements.
    const match = await callClaudeJSON<MatchResult>({
      system: MATCH_SCORE_SYSTEM,
      user: matchScoreUser(resumeContent, JSON.stringify(parsed, null, 2), job.description),
      maxTokens: 2048,
    });

    // Clamp defensively — the model is instructed to return 0-100 but we
    // never trust model output for DB invariants.
    const score = Math.max(0, Math.min(100, Math.round(Number(match.score) || 0)));

    const now = new Date();
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        parsedJson: JSON.stringify(parsed),
        parsedAt: now,
        matchScore: score,
        matchJson: JSON.stringify({ ...match, score }),
        scoredAt: now,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AIError) {
      return NextResponse.json(
        { error: err.message, retryable: err.retryable },
        { status: err.status }
      );
    }
    console.error("Analyze failed:", err);
    return NextResponse.json(
      { error: "Analysis failed unexpectedly. Please try again." },
      { status: 500 }
    );
  }
}
