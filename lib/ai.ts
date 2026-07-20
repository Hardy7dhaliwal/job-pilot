import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

/**
 * Multi-provider AI layer.
 *
 * Supports four modes, selectable in-app via the Setting table or by env:
 *
 *   1. "anthropic" (default) — uses the Anthropic SDK with ANTHROPIC_API_KEY.
 *   2. "openai" — uses any OpenAI-compatible API (Groq, Together AI,
 *      OpenRouter, LM Studio, vLLM, etc.) via a raw fetch to
 *      AI_BASE_URL/chat/completions.
 *   3. "ollama" — shorthand for a local Ollama instance. Equivalent to
 *      openai with AI_BASE_URL=http://localhost:11434/v1.
 *   4. "agent" — calls the local general-purpose agent service that spawns
 *      the agy CLI.
 *
 * In-app settings (Setting table) override env values. Env values are used as
 * defaults when no in-app setting exists.
 *
 * All AI calls in the app go through callClaudeJSON() — the name is
 * historical; it works with any provider now.
 */

export type AIProvider = "anthropic" | "openai" | "ollama" | "agent";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  agentBaseUrl: string;
  agentTimeoutMs: number;
}

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

const PROVIDERS: AIProvider[] = ["anthropic", "openai", "ollama", "agent"];

function isProvider(value: string): value is AIProvider {
  return (PROVIDERS as string[]).includes(value);
}

function normalizeProvider(value: string): AIProvider {
  const p = value.toLowerCase();
  return isProvider(p) ? p : "anthropic";
}

function defaultModelForProvider(provider: AIProvider): string {
  switch (provider) {
    case "ollama":
      return "llama3";
    case "openai":
      return "gpt-3.5-turbo";
    case "agent":
      return process.env.AI_MODEL?.trim() ?? "";
    default:
      return "claude-sonnet-4-5";
  }
}

/**
 * Load the active AI configuration. In-app settings (Setting table) override
 * environment variables. Environment variables are used as defaults when no
 * in-app setting exists.
 */
export async function getAIConfig(): Promise<AIConfig> {
  let setting: { aiProvider: string | null; aiModel: string | null } | null = null;
  try {
    setting = await prisma.setting.findUnique({ where: { id: "default" } });
  } catch {
    // If the DB is unreachable (e.g., migration not applied yet), fall back to env.
    setting = null;
  }

  const provider = normalizeProvider(setting?.aiProvider ?? process.env.AI_PROVIDER ?? "anthropic");

  let model = (setting?.aiModel ?? process.env.AI_MODEL ?? "").trim();
  if (!model) {
    model = defaultModelForProvider(provider);
  }

  let baseUrl = process.env.AI_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  if (provider === "ollama") {
    baseUrl = baseUrl || "http://localhost:11434/v1";
  } else if (provider === "openai") {
    baseUrl = baseUrl || "https://api.openai.com/v1";
  }

  const agentBaseUrl = process.env.AGENT_BASE_URL?.trim().replace(/\/$/, "") ?? "http://localhost:4000";

  const rawTimeout = Number(process.env.AGENT_TIMEOUT_MS);
  const agentTimeoutMs = Number.isNaN(rawTimeout) || rawTimeout <= 0 ? 120_000 : rawTimeout;

  let apiKey = "";
  if (provider === "anthropic") {
    apiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  } else {
    apiKey = (process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "not-needed").trim();
  }

  return { provider, model, baseUrl, apiKey, agentBaseUrl, agentTimeoutMs };
}

/**
 * Returns true when an AI provider is configured and (for Anthropic) the
 * API key is present. Use this in every route instead of checking
 * ANTHROPIC_API_KEY directly so Ollama / OpenAI-compatible users work too.
 */
export async function isAIAvailable(): Promise<boolean> {
  const config = await getAIConfig();
  if (config.provider === "anthropic") {
    return Boolean(config.apiKey);
  }
  // ollama / openai-compatible / agent: the server is assumed reachable
  return true;
}

// --- JSON extraction (shared across all providers) ---

/**
 * Attempt to extract a valid JSON object or array from a string that may
 * contain markdown fences, explanatory text, or other wrapping.
 *
 * Strategy:
 *  1. Parse the trimmed text directly.
 *  2. Look for a fenced JSON code block.
 *  3. Scan for the first top-level JSON object/array by tracking brace/bracket depth.
 *  4. Log the raw text and throw a user-facing AIError if nothing parses.
 */
function extractJson<T>(text: string): T {
  const trimmed = text.trim();

  // 1. Direct parse.
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // fall through
  }

  // 2. Markdown fenced code block (```json ... ``` or ``` ... ```).
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // fall through to scan the whole text
    }
  }

  // 3. Scan the text for the first balanced JSON object or array.
  const candidates: string[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "{" || ch === "[") {
      const stack: string[] = [ch];
      let j = i + 1;
      let inString = false;
      let escaped = false;
      while (j < trimmed.length && stack.length > 0) {
        const c = trimmed[j];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (c === "\\") {
            escaped = true;
          } else if (c === '"') {
            inString = false;
          }
        } else {
          if (c === '"') {
            inString = true;
          } else if (c === "{" || c === "[") {
            stack.push(c);
          } else if (c === "}" || c === "]") {
            const open = stack[stack.length - 1];
            if ((c === "}" && open === "{") || (c === "]" && open === "[")) {
              stack.pop();
            }
          }
        }
        j++;
        if (stack.length === 0) {
          candidates.push(trimmed.slice(i, j));
          i = j - 1;
          break;
        }
      }
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try next candidate
    }
  }

  // 4. Nothing worked — log the raw response for debugging and fail.
  const preview = trimmed.length > 1000 ? `${trimmed.slice(0, 1000)}...` : trimmed;
  console.error("AI returned unparseable JSON:", preview);
  throw new AIError("The AI returned malformed JSON. Please try again.", 502, true);
}

// --- Anthropic provider ---

const globalForAI = globalThis as unknown as { anthropic?: Anthropic };

function getAnthropicClient(apiKey: string): Anthropic {
  if (!globalForAI.anthropic) {
    globalForAI.anthropic = new Anthropic({ apiKey, maxRetries: 3 });
  }
  return globalForAI.anthropic;
}

async function callAnthropicText(
  config: AIConfig,
  opts: { system: string; user: string; maxTokens: number }
): Promise<string> {
  if (!config.apiKey) {
    throw new AIError(
      "ANTHROPIC_API_KEY is not set. Add it to .env or switch AI provider to 'ollama' for free local models.",
      503,
      false
    );
  }

  const client = getAnthropicClient(config.apiKey);
  try {
    const response = await client.messages.create({
      model: config.model,
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
    return textBlock.text;
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

async function callAnthropic<T>(
  config: AIConfig,
  opts: { system: string; user: string; maxTokens: number }
): Promise<T> {
  const text = await callAnthropicText(config, opts);
  return extractJson<T>(text);
}

// --- OpenAI-compatible provider (Ollama, Groq, Together, LM Studio, etc.) ---

async function callOpenAICompatibleText(
  config: AIConfig,
  opts: { system: string; user: string; maxTokens: number }
): Promise<string> {
  const body = {
    model: config.model,
    max_tokens: opts.maxTokens,
    temperature: 0.1,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  };

  let lastError: Error | null = null;

  // Simple retry loop (3 attempts) for transient failures.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey !== "not-needed" ? { Authorization: `Bearer ${config.apiKey}` } : {}),
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
      return text;
    } catch (err) {
      if (err instanceof AIError) throw err;
      lastError = err as Error;
      if (err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("ECONNREFUSED"))) {
        throw new AIError(
          `Could not connect to AI at ${config.baseUrl}. Is the server running? (${err.message})`,
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

async function callOpenAICompatible<T>(
  config: AIConfig,
  opts: { system: string; user: string; maxTokens: number }
): Promise<T> {
  const text = await callOpenAICompatibleText(config, opts);
  return extractJson<T>(text);
}

// --- Agent provider (external general-purpose agent service) ---

/**
 * Truncate a prompt destined for the agent service so it fits the service's
 * maximum payload size while preserving the system instructions and the
 * XML-style delimiters.
 *
 * The agent service currently accepts up to 100,000 characters. We leave a
 * generous safety margin for JSON encoding overhead.
 */
function truncateAgentPrompt(system: string, user: string, maxChars = 95_000): string {
  const header = `<system_instructions>\n${system}\n</system_instructions>\n\n<user_request>\n`;
  const footer = "\n</user_request>";
  const reserved = header.length + footer.length;

  if (user.length <= maxChars - reserved) {
    return `${header}${user}${footer}`;
  }

  const truncated = user.slice(0, maxChars - reserved - 100);
  return `${header}${truncated}\n\n[TRUNCATED: user request was too long and has been cut to fit service limits.]${footer}`;
}

async function callAgentText(
  config: AIConfig,
  opts: { system: string; user: string; maxTokens: number }
): Promise<string> {
  const timeoutMs = config.agentTimeoutMs;

  // The agent service expects a single prompt string. Combine system and user
  // with clear delimiters so the underlying model still sees the separation.
  const prompt = truncateAgentPrompt(opts.system, opts.user);

  const body: Record<string, unknown> = {
    prompt,
    stream: false,
    timeoutMs,
  };
  if (config.model) {
    body.model = config.model;
  }

  try {
    const res = await fetch(`${config.agentBaseUrl}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.AGENT_API_KEY ? { Authorization: `Bearer ${process.env.AGENT_API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs + 10_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new AIError(
        `Agent service returned HTTP ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`,
        502,
        true
      );
    }

    const data = (await res.json()) as {
      stdout?: string;
      stderr?: string;
      exitCode?: number;
      durationMs?: number;
    };

    if (data.exitCode !== 0) {
      throw new AIError(
        `Agent execution failed (exit ${data.exitCode ?? "unknown"})${data.stderr ? `: ${data.stderr.slice(0, 200)}` : ""}`,
        502,
        false
      );
    }

    if (!data.stdout) {
      throw new AIError("Agent returned empty output.", 502, true);
    }

    return data.stdout;
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("ECONNREFUSED"))) {
      throw new AIError(
        `Could not connect to agent service at ${config.agentBaseUrl}. Is it running? (${err.message})`,
        502,
        true
      );
    }
    throw new AIError(`Agent request failed: ${(err as Error).message}`, 502, true);
  }
}

async function callAgent<T>(
  config: AIConfig,
  opts: { system: string; user: string; maxTokens: number }
): Promise<T> {
  const text = await callAgentText(config, opts);
  return extractJson<T>(text);
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
  const config = await getAIConfig();

  if (config.provider === "anthropic") {
    return callAnthropic<T>(config, { ...opts, maxTokens });
  }
  if (config.provider === "agent") {
    return callAgent<T>(config, { ...opts, maxTokens });
  }
  return callOpenAICompatible<T>(config, { ...opts, maxTokens });
}

/**
 * Run a single free-text AI call and return the raw string. Works with any
 * configured provider. Use this when you need to parse a custom format
 * (e.g. XML-tagged output) instead of strict JSON.
 */
export async function callClaudeText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const maxTokens = opts.maxTokens ?? 2048;
  const config = await getAIConfig();

  if (config.provider === "anthropic") {
    return callAnthropicText(config, { ...opts, maxTokens });
  }
  if (config.provider === "agent") {
    return callAgentText(config, { ...opts, maxTokens });
  }
  return callOpenAICompatibleText(config, { ...opts, maxTokens });
}
