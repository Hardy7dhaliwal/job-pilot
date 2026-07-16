import Anthropic from "@anthropic-ai/sdk";

/**
 * Multi-provider AI layer.
 *
 * Supports three modes via the AI_PROVIDER env var:
 *
 *   1. "anthropic" (default) — uses the Anthropic SDK with ANTHROPIC_API_KEY.
 *   2. "openai" — uses any OpenAI-compatible API (Groq, Together AI,
 *      OpenRouter, LM Studio, vLLM, etc.) via a raw fetch to
 *      AI_BASE_URL/chat/completions.
 *   3. "ollama" — shorthand for a local Ollama instance. Equivalent to
 *      openai with AI_BASE_URL=http://localhost:11434/v1.
 *
 * AI_MODEL overrides the model name for any provider.
 *
 * All AI calls in the app go through callClaudeJSON() — the name is
 * historical; it works with any provider now.
 */

export class AIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "AIError";
  }
}

type Provider = "anthropic" | "openai" | "ollama";

function getProvider(): Provider {
  const p = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (p === "ollama" || p === "openai") return p;
  return "anthropic";
}

function getModel(): string {
  if (process.env.AI_MODEL?.trim()) return process.env.AI_MODEL.trim();
  const provider = getProvider();
  if (provider === "ollama") return "llama3";
  if (provider === "openai") return "gpt-3.5-turbo";
  return "claude-sonnet-4-5";
}

function getBaseUrl(): string {
  if (process.env.AI_BASE_URL?.trim()) return process.env.AI_BASE_URL.trim().replace(/\/$/, "");
  if (getProvider() === "ollama") return "http://localhost:11434/v1";
  return "https://api.openai.com/v1";
}

function getApiKey(): string {
  const provider = getProvider();
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key?.trim()) {
      throw new AIError(
        "ANTHROPIC_API_KEY is not set. Add it to .env or switch AI_PROVIDER to 'ollama' for free local models.",
        503,
        false
      );
    }
    return key.trim();
  }
  // OpenAI-compatible: API key is optional (Ollama doesn't need one)
  return (process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "not-needed").trim();
}

/**
 * Returns true when an AI provider is configured and (for Anthropic) the
 * API key is present. Use this in every route instead of checking
 * ANTHROPIC_API_KEY directly so Ollama / OpenAI-compatible users work too.
 */
export function isAIAvailable(): boolean {
  const provider = getProvider();
  if (provider === "anthropic") {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }
  // ollama / openai-compatible: the server is assumed reachable
  return true;
}

// --- JSON extraction (shared across all providers) ---

function extractJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      throw new AIError("The AI returned malformed JSON. Please try again.", 502, true);
    }
  }
}

// --- Anthropic provider ---

const globalForAI = globalThis as unknown as { anthropic?: Anthropic };

function getAnthropicClient(): Anthropic {
  const apiKey = getApiKey();
  if (!globalForAI.anthropic) {
    globalForAI.anthropic = new Anthropic({ apiKey, maxRetries: 3 });
  }
  return globalForAI.anthropic;
}

async function callAnthropic<T>(opts: {
  system: string;
  user: string;
  maxTokens: number;
}): Promise<T> {
  const client = getAnthropicClient();
  try {
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    });

    if (response.stop_reason === "refusal") {
      throw new AIError("The AI declined this request.", 502, false);
    }
    if (response.stop_reason === "max_tokens") {
      throw new AIError("The AI response was cut off. Please try again.", 502, true);
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new AIError("The AI returned no text output.", 502, true);
    }
    return extractJson<T>(textBlock.text);
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new AIError("AI rate limit reached. Please wait a minute and try again.", 429, true);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AIError("Invalid ANTHROPIC_API_KEY. Check your .env file.", 503, false);
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new AIError("Could not reach the Anthropic API. Check your connection.", 502, true);
    }
    if (err instanceof Anthropic.APIError) {
      throw new AIError(`AI request failed (${err.status ?? "unknown"}).`, 502, true);
    }
    throw err;
  }
}

// --- OpenAI-compatible provider (Ollama, Groq, Together, LM Studio, etc.) ---

async function callOpenAICompatible<T>(opts: {
  system: string;
  user: string;
  maxTokens: number;
}): Promise<T> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const model = getModel();

  const body = {
    model,
    max_tokens: opts.maxTokens,
    temperature: 0.1,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  };

  let res: Response;
  let lastError: Error | null = null;

  // Simple retry loop (3 attempts) for transient failures.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey !== "not-needed" ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });

      if (res.status === 429) {
        lastError = new AIError("AI rate limit reached. Please wait and try again.", 429, true);
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      if (res.status >= 500) {
        lastError = new AIError(`AI server error (${res.status}).`, 502, true);
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403) {
          throw new AIError(
            `AI authentication failed. Check AI_API_KEY in .env. (${res.status})`,
            503,
            false
          );
        }
        throw new AIError(
          `AI request failed (${res.status}): ${errBody.slice(0, 200)}`,
          502,
          true
        );
      }

      const data = await res.json();
      const text: string = data.choices?.[0]?.message?.content ?? "";
      if (!text) {
        throw new AIError("The AI returned an empty response.", 502, true);
      }
      return extractJson<T>(text);
    } catch (err) {
      if (err instanceof AIError) throw err;
      lastError = err as Error;
      if (err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("ECONNREFUSED"))) {
        throw new AIError(
          `Could not connect to AI at ${baseUrl}. Is the server running? (${err.message})`,
          502,
          true
        );
      }
    }
  }

  if (lastError instanceof AIError) throw lastError;
  throw new AIError(
    `AI request failed after 3 attempts: ${lastError?.message ?? "unknown error"}`,
    502,
    true
  );
}

// --- Public API (used by the rest of the app) ---

/**
 * Run a single JSON-producing AI call. Works with any configured provider.
 * Throws AIError with an HTTP-appropriate status on failure.
 */
export async function callClaudeJSON<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const maxTokens = opts.maxTokens ?? 2048;
  const provider = getProvider();

  if (provider === "anthropic") {
    return callAnthropic<T>({ ...opts, maxTokens });
  }
  return callOpenAICompatible<T>({ ...opts, maxTokens });
}
