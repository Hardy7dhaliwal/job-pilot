"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Check, Loader2 } from "lucide-react";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "openai", label: "OpenAI-compatible" },
  { value: "ollama", label: "Ollama (local)" },
  { value: "agent", label: "Agent (agy)" },
] as const;

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-3.5-turbo",
  ollama: "qwen3.5:9b",
  agent: "Gemini 3.5 Flash (High)",
};

interface Settings {
  aiProvider: string | null;
  aiModel: string | null;
}

/** AI provider/model selector that persists to the Setting table. */
export function ProviderToggle() {
  const [settings, setSettings] = useState<Settings>({ aiProvider: null, aiModel: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data) => {
        setSettings({
          aiProvider: data.aiProvider ?? "",
          aiModel: data.aiModel ?? "",
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleProviderChange(provider: string) {
    const next = {
      aiProvider: provider,
      aiModel: settings.aiModel || DEFAULT_MODELS[provider] || "",
    };
    setSettings(next);
    const result = await saveSettings(next);
    if (!result.ok) {
      // Roll back to the last known server state on failure.
      setSettings({
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel,
      });
    }
  }

  function handleModelChange(model: string) {
    setSettings((prev) => ({ ...prev, aiModel: model }));
  }

  async function handleModelBlur() {
    const previous = { ...settings };
    const result = await saveSettings(settings);
    if (!result.ok) {
      setSettings(previous);
    }
  }

  async function saveSettings(next: Settings): Promise<{ ok: boolean }> {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProvider: next.aiProvider,
          aiModel: next.aiModel,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save settings");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return { ok: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
      return { ok: false };
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 px-3 py-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5" />
          AI Provider
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-[10px] font-normal normal-case text-green-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex h-9 items-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="ai-provider" className="text-[11px] text-muted-foreground">
              Provider
            </Label>
            <select
              id="ai-provider"
              value={settings.aiProvider ?? ""}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={saving}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Default (from env)</option>
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ai-model" className="text-[11px] text-muted-foreground">
              Model
            </Label>
            <Input
              id="ai-model"
              value={settings.aiModel ?? ""}
              onChange={(e) => handleModelChange(e.target.value)}
              onBlur={handleModelBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              placeholder={settings.aiProvider ? DEFAULT_MODELS[settings.aiProvider] : "e.g. llama3"}
              disabled={saving}
              className="h-9 text-sm"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
