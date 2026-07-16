import { createHash } from "crypto";

/**
 * Cross-source deduplication key: a hash of normalized company + title +
 * location. The same role discovered via Greenhouse and Adzuna (Phase 4)
 * collapses to one Job row; manual entries participate in the same scheme.
 */
export function makeDedupeKey(
  company: string,
  title: string,
  location?: string | null
): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const raw = [normalize(company), normalize(title), normalize(location ?? "")].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
