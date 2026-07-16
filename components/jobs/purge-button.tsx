"use client";

import { useState } from "react";
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
import { Loader2, Trash2 } from "lucide-react";

/**
 * Button to purge all untracked jobs (jobs without any linked Application).
 * Helps users clean out old, irrelevant discovered jobs and start fresh.
 */
export function PurgeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  async function handlePurge() {
    setPurging(true);
    try {
      const res = await fetch("/api/jobs", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purge failed");
      toast.success(`Cleaned up ${data.deletedCount} untracked jobs.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purge failed");
    } finally {
      setPurging(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        Clean list
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clean up untracked jobs?</DialogTitle>
            <DialogDescription>
              This will permanently delete all jobs that have not been added to your Tracker or Review Queue.
              Use this to clear out old search results and keep your list clean.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={purging}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePurge} disabled={purging}>
              {purging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Untracked Jobs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
