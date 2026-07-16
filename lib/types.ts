/**
 * Shared TypeScript types for LLM-produced structured data.
 *
 * These mirror the JSON stored in Job.parsedJson and Job.matchJson
 * (SQLite has no JSON column type, so they're stored as strings and
 * parsed at the edges).
 */

/** Structured job description, produced by the JD parser (Phase 2). */
export interface ParsedJD {
  /** Skills the posting treats as required. */
  mustHaveSkills: string[];
  /** Skills listed as preferred / bonus. */
  niceToHaveSkills: string[];
  /** Minimum years of experience, null if not stated. */
  yearsExperience: number | null;
  /** Seniority level, normalized to lib/constants SENIORITY_LEVELS or null. */
  seniority: string | null;
  /** Keywords an ATS would likely scan for. */
  atsKeywords: string[];
  /** One-paragraph plain-language summary of the role. */
  summary: string;
}

/** Match score detail, produced by the match scorer (Phase 2). */
export interface MatchResult {
  /** Honest 0-100 score of resume fit against the JD. */
  score: number;
  /** Required skills clearly evidenced in the resume. */
  matchedSkills: string[];
  /** Required skills NOT evidenced in the resume. */
  missingMustHaves: string[];
  /** Broader gaps: experience level, domain, education, etc. */
  gaps: string[];
  /** Short explanation of how the score was reached. */
  rationale: string;
}

/** Audit entry list produced by the resume tailor (Phase 3). */
export type ChangesMade = string[];
