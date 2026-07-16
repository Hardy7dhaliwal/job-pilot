"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { bulkAnalyzeStore } from "@/lib/bulk-store";
import { Play, Loader2 } from "lucide-react";

/**
 * Trigger button for bulk analysis. Starts the run in the global store,
 * or maximizes the active progress dialog if it's already running in the background.
 */
export function BulkAnalyzeButton({
  unscoredJobs,
}: {
  unscoredJobs: { id: string; company: string; title: string }[];
}) {
  const [running, setRunning] = useState(false);
  const [totalJobs, setTotalJobs] = useState(unscoredJobs.length);

  useEffect(() => {
    const unsubscribe = bulkAnalyzeStore.subscribe((state) => {
      setRunning(state.running);
      if (state.total > 0) {
        setTotalJobs(state.total);
      } else {
        setTotalJobs(unscoredJobs.length);
      }
    });
    return unsubscribe;
  }, [unscoredJobs]);

  // Don't show if there are no unscored jobs and no active run is running
  if (unscoredJobs.length === 0 && !running) return null;

  function handleClick() {
    if (running) {
      // If already running (minimized), click to bring to foreground
      bulkAnalyzeStore.maximize();
    } else {
      // Start a new run
      bulkAnalyzeStore.start(unscoredJobs);
    }
  }

  return (
    <Button onClick={handleClick} className="gap-2" variant="secondary">
      {running ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Analyzing ({totalJobs} jobs)...
        </>
      ) : (
        <>
          <Play className="h-4 w-4 fill-current" /> Score unscored ({unscoredJobs.length})
        </>
      )}
    </Button>
  );
}
