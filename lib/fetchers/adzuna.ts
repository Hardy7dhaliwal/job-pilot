import type { FetchParams, JobCandidate } from "./types";
import { matchesKeywords } from "./filter";

/**
 * Adzuna job search API.
 * Requires ADZUNA_APP_ID + ADZUNA_APP_KEY in .env.
 * Docs: https://developer.adzuna.com/overview
 *
 * ToS-compliant: Adzuna is a public job-search aggregator with a free
 * developer API (attribution required; we store the source URL).
 */

export async function fetchAdzuna(params: FetchParams): Promise<JobCandidate[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const query = encodeURIComponent(params.keywords);
  const where = params.location ? `&where=${encodeURIComponent(params.location)}` : "";
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=25&what=${query}${where}&content-type=application/json`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();
    const listings: Array<{
      id: string;
      title: string;
      company: { display_name: string };
      location: { display_name: string };
      redirect_url: string;
      description: string;
      created: string;
    }> = data.results ?? [];

    return listings
      .filter((item) => matchesKeywords(item.title, item.description ?? "", params.keywords))
      .map((item) => {
        const loc = item.location?.display_name ?? null;
        const isRemote =
          loc?.toLowerCase().includes("remote") ||
          item.title.toLowerCase().includes("remote") ||
          item.description?.toLowerCase().includes("remote") ||
          false;

        return {
          source: "adzuna",
          externalId: `adzuna-${item.id}`,
          title: item.title,
          company: item.company?.display_name ?? "Unknown",
          location: loc,
          remote: isRemote,
          url: item.redirect_url,
          description: item.description ?? item.title,
          postedAt: item.created ? new Date(item.created) : null,
        };
      })
      .filter((j) => !params.remoteOnly || j.remote);
  } catch {
    return [];
  }
}
