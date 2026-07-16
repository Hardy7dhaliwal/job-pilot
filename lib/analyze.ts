import { Job } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callClaudeJSON } from "@/lib/ai";
import { JD_PARSE_SYSTEM, jdParseUser } from "@/lib/prompts";
import type { ParsedJD } from "@/lib/types";

/**
 * Return the job's parsed JD, running the parser (and persisting the
 * result) if it hasn't been parsed yet. Used by the tailor and
 * cover-letter routes so users don't have to run "Analyze" first.
 */
export async function ensureParsed(job: Job): Promise<ParsedJD> {
  if (job.parsedJson) {
    try {
      return JSON.parse(job.parsedJson) as ParsedJD;
    } catch {
      // Corrupt stored JSON — fall through and re-parse.
    }
  }

  const parsed = await callClaudeJSON<ParsedJD>({
    system: JD_PARSE_SYSTEM,
    user: jdParseUser(job.description),
    maxTokens: 2048,
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { parsedJson: JSON.stringify(parsed), parsedAt: new Date() },
  });

  return parsed;
}
