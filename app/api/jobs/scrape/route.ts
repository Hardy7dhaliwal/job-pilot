import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON, isAIAvailable } from "@/lib/ai";

export const runtime = "nodejs";

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|h[1-6]|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * POST /api/jobs/scrape
 * Body: { url }
 * Fetches the HTML content of the job board URL and uses LLM to extract structured details.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const urlStr = typeof body.url === "string" ? body.url.trim() : "";
  if (!urlStr) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const res = await fetch(urlStr, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${res.statusText} (${res.status})` },
        { status: 400 }
      );
    }

    const html = await res.text();
    const cleanText = htmlToText(html);

    if (!cleanText || cleanText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract readable text from the URL." },
        { status: 400 }
      );
    }

    // If AI is available, use it to clean up and structure the job posting.
    if (isAIAvailable()) {
      try {
        const system = `You are a helpful job parser. Analyze the scraped text from a job posting web page and extract:
1. Job Title (normalize slightly if needed, e.g., "Senior Software Engineer (Remote)" -> "Senior Software Engineer")
2. Company Name
3. Location (if remote, output "Remote", otherwise the city/state/country)
4. Job Description (the full text of the job description/requirements, cleaned of headers, footers, similar roles lists, and menus. Keep the original formatting/markdown structure of the job details where possible).

Respond with ONLY a valid JSON object — no markdown fences, no commentary. Use exactly this shape:
{
  "title": string|null,
  "company": string|null,
  "location": string|null,
  "description": string|null
}`;

        // Truncate clean text to ~8k chars to avoid token limits
        const truncatedText = cleanText.slice(0, 8000);
        const extracted = await callClaudeJSON<{
          title: string | null;
          company: string | null;
          location: string | null;
          description: string | null;
        }>({
          system,
          user: `Extract job details from this text:\n\n${truncatedText}`,
          maxTokens: 2048,
        });

        return NextResponse.json({
          title: extracted.title ?? "",
          company: extracted.company ?? "",
          location: extracted.location ?? "",
          description: extracted.description ?? cleanText,
        });
      } catch {
        // Fallback to returning clean raw text if AI fails
        return NextResponse.json({
          title: "",
          company: "",
          location: "",
          description: cleanText,
          warning: "Scraped successfully, but AI extraction failed. Text was imported directly.",
        });
      }
    }

    // AI not configured, just return the raw text
    return NextResponse.json({
      title: "",
      company: "",
      location: "",
      description: cleanText,
      warning: "Scraped successfully. Configure an AI key to auto-fill Title, Company, and Location.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch and parse URL." },
      { status: 500 }
    );
  }
}
