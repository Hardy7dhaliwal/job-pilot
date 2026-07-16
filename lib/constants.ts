/**
 * Enum-like value sets.
 *
 * SQLite (via Prisma) has no native enum type, so enum-ish columns are
 * stored as strings. These constants are the single source of truth for
 * the allowed values — validate against them at API boundaries. The
 * casing here matches the defaults declared in prisma/schema.prisma.
 */

/** Application tracker Kanban stages (Phase 5). Matches Application.stage. */
export const APPLICATION_STAGES = [
  "DISCOVERED",
  "TAILORED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

/**
 * Human-in-the-loop review states (Application.reviewStatus).
 * The agent never auto-submits an application.
 */
export const REVIEW_STATUSES = ["NONE", "PENDING", "APPROVED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Where a job record came from (Job.source). */
export const JOB_SOURCES = [
  "manual",
  "greenhouse",
  "lever",
  "ashby",
  "adzuna",
  "jsearch",
] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

/**
 * Resume storage formats (Resume.format). PDFs are converted to plain text
 * at upload time, so "pdf" never appears here — only what we store.
 */
export const RESUME_FORMATS = ["markdown", "text"] as const;
export type ResumeFormat = (typeof RESUME_FORMATS)[number];

/** Seniority levels (SearchProfile.seniority, parsed JDs). null = any. */
export const SENIORITY_LEVELS = [
  "junior",
  "mid",
  "senior",
  "staff",
  "lead",
] as const;
export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];

/** Max upload size for resume files (PDF/text/markdown): 5 MB. */
export const MAX_RESUME_UPLOAD_BYTES = 5 * 1024 * 1024;
