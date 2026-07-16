import type { FetchParams, JobCandidate } from "./types";
import { matchesKeywords } from "./filter";

/**
 * JSearch API (via RapidAPI).
 * Requires JSEARCH_API_KEY in .env.
 * Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 *
 * ToS-compliant: JSearch is a legitimate job-search API aggregator
 * available via RapidAPI marketplace.
 */

export async function fetchJSearch(params: FetchParams): Promise<JobCandidate[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) return [];

  const query = params.keywords + (params.location ? ` in ${params.location}` : "");
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&remote_jobs_only=${params.remoteOnly}`;

  try {
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const listings: Array<{
      job_id: string;
      job_title: string;
      employer_name: string;
      job_city: string | null;
      job_state: string | null;
      job_country: string;
      job_is_remote: boolean;
      job_apply_link: string;
      job_description: string;
      job_posted_at_datetime_utc: string | null;
    }> = data.data ?? [];

    return listings
      .filter((item) => matchesKeywords(item.job_title, item.job_description ?? "", params.keywords))
      .map((item) => {
        const parts = [item.job_city, item.job_state, item.job_country].filter(Boolean);
        return {
          source: "jsearch",
          externalId: `jsearch-${item.job_id}`,
          title: item.job_title,
          company: item.employer_name ?? "Unknown",
          location: parts.length ? parts.join(", ") : null,
          remote: item.job_is_remote,
          url: item.job_apply_link,
          description: item.job_description ?? item.job_title,
          postedAt: item.job_posted_at_datetime_utc
            ? new Date(item.job_posted_at_datetime_utc)
            : null,
        };
      });
  } catch {
    return [];
  }
}
