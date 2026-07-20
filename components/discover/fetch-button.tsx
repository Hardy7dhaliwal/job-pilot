"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

/**
 * Triggers POST /api/discover/fetch — runs all active search profiles,
 * inserts new jobs, and auto-scores them. Shows progress via toasts.
 */
export function FetchButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleFetch() {
    setRunning(true);
    try {
      const res = await fetch("/api/discover/fetch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed");
      toast.success(
        `Found ${data.fetched} listings, ${data.newJobs} new jobs added, ${data.scored} scored.` +
          (data.errors > 0
            ? ` (${data.errors} scoring errors — jobs still saved)`
            : ""),
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button onClick={handleFetch} disabled={running}>
      {running ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      {running ? "Fetching" : "Fetch now"}
    </Button>
  );
}
