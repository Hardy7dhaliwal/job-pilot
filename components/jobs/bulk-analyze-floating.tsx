"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulkAnalyzeStore, JobResult } from "@/lib/bulk-store";
import { Loader2, CheckCircle2, AlertCircle, Minimize2 } from "lucide-react";

/**
 * Global background analyzer interface. Rendered in the root layout.
 * Shows a floating pill when minimized, and a detailed dialog when maximized.
 * Survives page navigation because it lives in the persistent layout.
 */
export function BulkAnalyzeFloating() {
  const router = useRouter();
  const [storeState, setStoreState] = useState({
    running: false,
    currentIndex: 0,
    results: [] as JobResult[],
    total: 0,
  });
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    // Subscribe to global store changes
    const unsubscribe = bulkAnalyzeStore.subscribe((state) => {
      setStoreState(state);
    });

    bulkAnalyzeStore.setMaximizeCallback(() => setMinimized(false));

    return () => {
      unsubscribe();
      bulkAnalyzeStore.setMaximizeCallback(() => {});
    };
  }, []);

  // When analysis starts (running goes from false to true), maximize automatically
  useEffect(() => {
    if (storeState.running && storeState.total > 0 && storeState.currentIndex === 0) {
      setMinimized(false);
    }
  }, [storeState.running, storeState.total, storeState.currentIndex]);

  const { running, currentIndex, results, total } = storeState;

  // Don't render anything if not active/running and no results to display
  if (total === 0) return null;

  const progressPercent = Math.round((currentIndex / total) * 100) || 0;
  const isFinished = !running && currentIndex === total && total > 0;

  function handleClose() {
    if (running) {
      // If still running, close visual modal but keep running in background (minimize)
      setMinimized(true);
      toast.info("Scoring continues in the background.");
    } else {
      // If finished, reset store to clear results from layout
      bulkAnalyzeStore.stop();
      setMinimized(false);
      router.refresh();
    }
  }

  function handleStop() {
    bulkAnalyzeStore.stop();
    toast.error("Analysis stopped.");
    setMinimized(false);
    router.refresh();
  }

  // Render Minimized Pill
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full border bg-card p-2 pl-4 pr-3 shadow-xl animate-in fade-in slide-in-from-bottom-5">
        <div className="flex flex-col text-xs pr-1">
          <span className="font-semibold flex items-center gap-1.5">
            {running && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            {isFinished ? "Analysis complete!" : `Scoring: ${progressPercent}%`}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {currentIndex} of {total} jobs
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-full text-[10px] px-2.5"
            onClick={() => setMinimized(false)}
          >
            Show details
          </Button>
          {running ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
              onClick={handleStop}
              title="Stop"
            >
              <AlertCircle className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
              onClick={handleClose}
              title="Dismiss"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Render Detailed Dialog
  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <div>
            <DialogTitle>Bulk Job Analysis</DialogTitle>
            <DialogDescription>
              Scoring your master resume against unscored listings.
            </DialogDescription>
          </div>
          {running && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
              onClick={() => setMinimized(true)}
              title="Minimize to background"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {isFinished
                  ? "Completed"
                  : `Analyzing ${currentIndex} of ${total}`}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* List of results */}
          <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2 bg-muted/20">
            {results.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-medium truncate">{job.title}</p>
                  <p className="text-muted-foreground truncate">{job.company}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 font-medium">
                  {job.status === "pending" && (
                    <span className="text-muted-foreground">Waiting</span>
                  )}
                  {job.status === "running" && (
                    <span className="flex items-center gap-1 text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" /> Analyzing
                    </span>
                  )}
                  {job.status === "success" && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {job.score}/100
                    </span>
                  )}
                  {job.status === "error" && (
                    <span
                      className="flex items-center gap-1 text-destructive"
                      title={job.error}
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> Error
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {running ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setMinimized(true)}
                >
                  Minimize to Background
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleStop}
                >
                  Stop
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
