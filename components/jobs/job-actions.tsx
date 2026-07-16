"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kanban, Loader2, Sparkles, Trash2 } from "lucide-react";

/**
 * Analyze (parse + score), delete, and "Add to tracker" controls for a job.
 * Analysis shows a persistent loading state — the two chained AI calls
 * typically take 10-30 seconds.
 */
export function JobActions({
  jobId,
  hasBeenScored,
  hasApplication,
}: {
  jobId: string;
  hasBeenScored: boolean;
  hasApplication: boolean;
}) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [addingToTracker, setAddingToTracker] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      toast.success(`Scored ${data.matchScore}/100 against your master resume`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAddToTracker() {
    setAddingToTracker(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.status === 409) {
        // Already exists — navigate to tracker
        toast.info("Already in tracker — opening it.");
        router.push("/tracker");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to add to tracker");
      toast.success("Added to tracker");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to tracker");
    } finally {
      setAddingToTracker(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Job deleted");
      router.push("/jobs");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
        {analyzing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {analyzing ? "Analyzing…" : hasBeenScored ? "Re-analyze" : "Analyze & score"}
      </Button>

      {hasApplication ? (
        <Button variant="outline" size="sm" asChild>
          <Link href="/tracker">
            <Kanban className="mr-2 h-4 w-4" />
            In tracker
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddToTracker}
          disabled={addingToTracker}
        >
          {addingToTracker ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Kanban className="mr-2 h-4 w-4" />
          )}
          Add to tracker
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete job</span>
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete job?</DialogTitle>
            <DialogDescription>
              This removes the job and any tailored materials linked to it.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
