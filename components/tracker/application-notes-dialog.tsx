"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, StickyNote } from "lucide-react";

/**
 * Small dialog for editing application notes, applied date, and follow-up
 * date. Triggered by a hovering icon button on each Kanban card.
 */
export function ApplicationNotesDialog({
  appId,
  jobTitle,
  jobUrl,
  initialNotes,
  initialAppliedAt,
  initialFollowUpAt,
}: {
  appId: string;
  jobTitle: string;
  jobUrl: string | null;
  initialNotes: string;
  initialAppliedAt: string | null;
  initialFollowUpAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [appliedAt, setAppliedAt] = useState(
    initialAppliedAt ? initialAppliedAt.slice(0, 10) : ""
  );
  const [followUpAt, setFollowUpAt] = useState(
    initialFollowUpAt ? initialFollowUpAt.slice(0, 10) : ""
  );

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          appliedAt: appliedAt ? appliedAt : null,
          followUpAt: followUpAt ? followUpAt : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Saved");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6 rounded-full shadow-sm"
          title="Edit notes & dates"
        >
          <StickyNote className="h-3 w-3" />
          <span className="sr-only">Edit notes</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate text-base">{jobTitle}</DialogTitle>
          {jobUrl && (
            <a
              href={jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View posting <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`applied-${appId}`}>Applied date</Label>
              <Input
                id={`applied-${appId}`}
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`followup-${appId}`}>Follow-up date</Label>
              <Input
                id={`followup-${appId}`}
                type="date"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`notes-${appId}`}>Notes</Label>
            <Textarea
              id={`notes-${appId}`}
              placeholder="Any notes about this application…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[120px] text-sm"
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
