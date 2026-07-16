/**
 * Common shape returned by all source fetchers. Mapped to a Job record
 * by the orchestrator (deduplication, insertion, auto-scoring).
 */
export interface JobCandidate {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  url: string | null;
  description: string;
  postedAt: Date | null;
}

/** Parameters passed to every fetcher from the search profile. */
export interface FetchParams {
  keywords: string;
  location: string | null;
  remoteOnly: boolean;
  seniority: string | null;
}
