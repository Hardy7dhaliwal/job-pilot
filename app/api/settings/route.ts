import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIProvider } from "@/lib/ai";

export const runtime = "nodejs";

const VALID_PROVIDERS: AIProvider[] = ["anthropic", "openai", "ollama", "agent"];

function isValidProvider(value: string): value is AIProvider {
  return (VALID_PROVIDERS as string[]).includes(value);
}

/**
 * GET /api/settings
 *
 * Returns the current AI provider/model settings. If no row exists yet,
 * returns an empty object so the client can fall back to env defaults.
 */
export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "default" } });
    return NextResponse.json(
      setting ?? { id: "default", aiProvider: null, aiModel: null }
    );
  } catch (err) {
    console.error("Failed to load settings:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/**
 * PATCH /api/settings
 *
 * Body: { aiProvider?: string, aiModel?: string }
 *
 * Updates (or creates) the single-row settings record. Empty strings are
 * treated as "clear the override" and stored as null so env defaults apply.
 */
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const aiProviderRaw = typeof body.aiProvider === "string" ? body.aiProvider.trim() : undefined;
  const aiModelRaw = typeof body.aiModel === "string" ? body.aiModel.trim() : undefined;

  if (aiProviderRaw !== undefined && aiProviderRaw !== "" && !isValidProvider(aiProviderRaw)) {
    return NextResponse.json(
      { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` },
      { status: 400 }
    );
  }

  // Only update fields that were explicitly sent. An empty string means
  // "clear the override" (store null). undefined means "leave unchanged".
  const aiProvider = aiProviderRaw === undefined ? undefined : aiProviderRaw === "" ? null : aiProviderRaw;
  const aiModel = aiModelRaw === undefined ? undefined : aiModelRaw === "" ? null : aiModelRaw;

  try {
    const setting = await prisma.setting.upsert({
      where: { id: "default" },
      update: {
        ...(aiProvider !== undefined && { aiProvider }),
        ...(aiModel !== undefined && { aiModel }),
      },
      create: {
        id: "default",
        aiProvider: aiProvider ?? null,
        aiModel: aiModel ?? null,
      },
    });

    return NextResponse.json(setting);
  } catch (err) {
    console.error("Failed to update settings:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
