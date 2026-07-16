import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeDedupeKey } from "@/lib/jobs";
import { fetchAllSources } from "@/lib/fetchers";
import type { FetchParams } from "@/lib/fetchers";

export const runtime = "nodejs";
export const maxDuration = 300; // background fetch can take a while

/**
 * POST /api/discover/fetch
 *
 * Runs all active search profiles:
 *   1. Fetch candidates from enabled sources (Greenhouse, Lever, Ashby, Adzuna, JSearch)
 *   2. Deduplicate against existing jobs (by dedupeKey)
 *   3. Insert new jobs
 *   4. Auto-score each new job against the master resume (if AI key is set)
 *
 * Returns a summary: { fetched, newJobs, scored, errors }
 */
export async function POST() {
  const profiles = await prisma.searchProfile.findMany({
    where: { isActive: true },
  });

  if (profiles.length === 0) {
    return NextResponse.json(
      { error: "No active search profiles. Create one on the Discover page." },
      { status: 400 }
    );
  }

  let totalFetched = 0;
  let newJobs = 0;
  const scored = 0;
  const errors = 0;

  for (const profile of profiles) {
    const sources: string[] = (() => {
      try {
        return JSON.parse(profile.sources);
      } catch {
        return [];
      }
    })();

    const params: FetchParams = {
      keywords: profile.keywords,
      location: profile.location,
      remoteOnly: profile.remoteOnly,
      seniority: profile.seniority,
    };

    const candidates = await fetchAllSources(params, sources);
    totalFetched += candidates.length;

    for (const candidate of candidates) {
      const dedupeKey = makeDedupeKey(candidate.company, candidate.title, candidate.location);

      const exists = await prisma.job.findUnique({ where: { dedupeKey } });
      if (exists) continue;

      await prisma.job.create({
        data: {
          source: candidate.source,
          externalId: candidate.externalId,
          dedupeKey,
          title: candidate.title,
          company: candidate.company,
          location: candidate.location,
          remote: candidate.remote,
          url: candidate.url,
          description: candidate.description,
          postedAt: candidate.postedAt,
        },
      });
      newJobs++;

      // Auto-scoring is removed from the fetch loop to prevent HTTP request timeouts,
      // API rate limits, and page-switching abort issues.
      // Jobs are saved instantly, and can be scored individually in the UI.
    }

    // Mark profile as fetched.
    await prisma.searchProfile.update({
      where: { id: profile.id },
      data: { lastFetchedAt: new Date() },
    });
  }

  return NextResponse.json({ fetched: totalFetched, newJobs, scored, errors });
}
