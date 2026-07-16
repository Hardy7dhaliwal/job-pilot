/**
 * Robust keyword matching check with boundary regex to avoid false-positives
 * (e.g. 'java' matching 'javascript') while supporting special symbols (c++, c#).
 */
export function matchesKeywords(
  title: string,
  description: string,
  keywordsString: string
): boolean {
  const keywords = keywordsString
    .toLowerCase()
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (keywords.length === 0) return true;

  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();

  return keywords.some((kw) => {
    const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:[^a-zA-Z0-9_]|$)`, "i");
    return regex.test(titleLower) || regex.test(descLower);
  });
}
