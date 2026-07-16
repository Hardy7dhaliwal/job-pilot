import type { FetchParams, JobCandidate } from "./types";
import { matchesKeywords } from "./filter";

/**
 * Ashby public job board API.
 * POST https://jobs.ashbyhq.com/api/non-user-graphql with operation JobBoardWithSearch.
 * No API key required.
 *
 * Known board slugs (company domain) used as starting points.
 */

const SAMPLE_BOARDS = ["notion", "ramp", "anthropic", "linear", "vercel"];

const QUERY = `
query JobBoardWithSearch($organizationHostedJobsPageName: String!) {
  jobBoard: jobBoardWithSearch(
    organizationHostedJobsPageName: $organizationHostedJobsPageName
  ) {
    jobPostings {
      id
      title
      locationName
      isRemote
      publishedDate
      externalLink
      descriptionPlain
      departmentName
      compensationTierSummary
    }
    organization { name }
  }
}`;

export async function fetchAshby(params: FetchParams): Promise<JobCandidate[]> {
  const results: JobCandidate[] = [];

  for (const board of SAMPLE_BOARDS) {
    try {
      const res = await fetch("https://jobs.ashbyhq.com/api/non-user-graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationName: "JobBoardWithSearch",
          variables: { organizationHostedJobsPageName: board },
          query: QUERY,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const boardData = json?.data?.jobBoard;
      if (!boardData) continue;

      const orgName: string = boardData.organization?.name ?? board;
      const postings: Array<{
        id: string;
        title: string;
        locationName: string | null;
        isRemote: boolean;
        publishedDate: string | null;
        externalLink: string | null;
        descriptionPlain: string | null;
      }> = boardData.jobPostings ?? [];

      for (const post of postings) {
        if (!matchesKeywords(post.title, post.descriptionPlain ?? "", params.keywords)) continue;

        if (params.remoteOnly && !post.isRemote) continue;

        results.push({
          source: "ashby",
          externalId: `ashby-${board}-${post.id}`,
          title: post.title,
          company: orgName,
          location: post.locationName,
          remote: post.isRemote,
          url: post.externalLink ?? `https://jobs.ashbyhq.com/${board}/${post.id}`,
          description: post.descriptionPlain ?? post.title,
          postedAt: post.publishedDate ? new Date(post.publishedDate) : null,
        });
      }
    } catch {
      // Skip failures.
    }
  }

  return results;
}
