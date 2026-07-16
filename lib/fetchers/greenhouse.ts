import type { FetchParams, JobCandidate } from "./types";
import { matchesKeywords } from "./filter";

/**
 * Greenhouse Harvest public job board API.
 * No API key required — uses the public JSON feed: GET https://boards-api.greenhouse.io/v1/boards/{board}/jobs
 *
 * Limitation: we can only search boards we know about. The orchestrator
 * passes keywords and we use them to filter the full listing client-side,
 * since the Greenhouse public API has no search parameter.
 *
 * For Phase 4 MVP we search a small set of well-known boards. Users can
 * add custom board tokens via search profile config in a future iteration.
 */

const SAMPLE_BOARDS = [
  "github",
  "airbnb",
  "stripe",
  "figma",
  "linear",
  "notion",
  "vercel",
  "netflix",
  "twitch",
  "cloudflare",
  "uber",
  "lyft",
  "salesforce",
];

export async function fetchGreenhouse(
  params: FetchParams,
): Promise<JobCandidate[]> {
  const results: JobCandidate[] = [];

  for (const board of SAMPLE_BOARDS) {
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`,
        { signal: AbortSignal.timeout(15000) },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const jobs: Array<{
        id: number;
        title: string;
        location: { name: string };
        absolute_url: string;
        content: string;
        updated_at: string;
      }> = data.jobs ?? [];

      for (const job of jobs) {
        if (!matchesKeywords(job.title, job.content ?? "", params.keywords))
          continue;

        if (
          params.remoteOnly &&
          !job.location?.name?.toLowerCase().includes("remote")
        ) {
          continue;
        }

        results.push({
          source: "greenhouse",
          externalId: `gh-${board}-${job.id}`,
          title: job.title,
          company: board.charAt(0).toUpperCase() + board.slice(1),
          location: job.location?.name ?? null,
          remote: job.location?.name?.toLowerCase().includes("remote") ?? false,
          url: job.absolute_url,
          description: stripHtml(job.content ?? ""),
          postedAt: job.updated_at ? new Date(job.updated_at) : null,
        });
      }
    } catch {
      // Network error for one board shouldn't block the rest.
    }
  }

  return results;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
