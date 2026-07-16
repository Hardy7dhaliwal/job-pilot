import type { FetchParams, JobCandidate } from "./types";
import { matchesKeywords } from "./filter";

/**
 * Lever public job postings API.
 * No API key required: GET https://api.lever.co/v0/postings/{company}?mode=json
 *
 * Same limitation as Greenhouse: we need known company slugs.
 */

const SAMPLE_COMPANIES = [
  "netflix",
  "twitch",
  "cloudflare",
  "notion",
  "vercel",
  "amazon",
  "google",
  "microsoft",
  "facebook",
  "twitter",
  "airbnb",
  "stripe",
  "uber",
  "lyft",
  "salesforce",
];

export async function fetchLever(params: FetchParams): Promise<JobCandidate[]> {
  const results: JobCandidate[] = [];

  for (const company of SAMPLE_COMPANIES) {
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${company}?mode=json`,
        { signal: AbortSignal.timeout(15000) },
      );
      if (!res.ok) continue;
      const postings: Array<{
        id: string;
        text: string;
        categories: { location?: string; team?: string; commitment?: string };
        hostedUrl: string;
        descriptionPlain?: string;
        createdAt: number;
      }> = await res.json();

      for (const post of postings) {
        if (
          !matchesKeywords(
            post.text,
            post.descriptionPlain ?? "",
            params.keywords,
          )
        )
          continue;

        const loc = post.categories?.location ?? null;
        const isRemote = loc?.toLowerCase().includes("remote") ?? false;
        if (params.remoteOnly && !isRemote) continue;

        results.push({
          source: "lever",
          externalId: `lever-${company}-${post.id}`,
          title: post.text,
          company: company.charAt(0).toUpperCase() + company.slice(1),
          location: loc,
          remote: isRemote,
          url: post.hostedUrl,
          description: post.descriptionPlain ?? post.text,
          postedAt: post.createdAt ? new Date(post.createdAt) : null,
        });
      }
    } catch {
      // Skip failures for individual companies.
    }
  }

  return results;
}
