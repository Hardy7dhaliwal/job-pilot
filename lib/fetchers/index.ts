import type { FetchParams, JobCandidate } from "./types";
import { fetchGreenhouse } from "./greenhouse";
import { fetchLever } from "./lever";
import { fetchAshby } from "./ashby";
import { fetchAdzuna } from "./adzuna";
import { fetchJSearch } from "./jsearch";

export type { JobCandidate, FetchParams };

/**
 * Registry of source fetchers. Each key matches a JOB_SOURCES value
 * from lib/constants.ts. "manual" has no fetcher — those are pasted by
 * the user in Phase 2.
 */
const FETCHERS: Record<string, (p: FetchParams) => Promise<JobCandidate[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  adzuna: fetchAdzuna,
  jsearch: fetchJSearch,
};

export { matchesKeywords } from "./filter";

/**
 * Run all enabled fetchers for a search profile and return combined
 * candidates. Sources not in `enabledSources` are skipped.
 */
export async function fetchAllSources(
  params: FetchParams,
  enabledSources: string[]
): Promise<JobCandidate[]> {
  const fetchers = enabledSources
    .filter((s) => s in FETCHERS)
    .map((s) => FETCHERS[s](params).catch(() => [] as JobCandidate[]));

  const arrays = await Promise.all(fetchers);
  return arrays.flat();
}
