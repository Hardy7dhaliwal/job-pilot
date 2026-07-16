"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Sparkles } from "lucide-react";

/**
 * Manual job entry: paste a JD, fill in the basics, and the job is
 * created and immediately analyzed (parse + score) if possible.
 * Analysis failure is non-fatal — the job still saves, and the detail
 * page has a re-run button.
 */
export function AddJobDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "analyzing">("idle");

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [remote, setRemote] = useState(false);
  const [description, setDescription] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);

  function reset() {
    setTitle("");
    setCompany("");
    setLocation("");
    setUrl("");
    setRemote(false);
    setDescription("");
    setPhase("idle");
    setFetchingUrl(false);
  }

  async function handleFetchUrl() {
    if (!url) return;
    setFetchingUrl(true);
    try {
      const res = await fetch("/api/jobs/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch details");

      if (data.title) setTitle(data.title);
      if (data.company) setCompany(data.company);
      if (data.location) setLocation(data.location);
      if (data.description) setDescription(data.description);

      const isRemote =
        (data.location && data.location.toLowerCase().includes("remote")) ||
        (data.title && data.title.toLowerCase().includes("remote"));
      if (isRemote) setRemote(true);

      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success("Job details fetched and populated!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch details");
    } finally {
      setFetchingUrl(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setPhase("saving");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, company, location, url, remote, description }),
      });
      const job = await res.json();
      if (res.status === 409 && job.existingId) {
        toast.info("This job already exists — opening it.");
        setOpen(false);
        reset();
        router.push(`/jobs/${job.existingId}`);
        return;
      }
      if (!res.ok) throw new Error(job.error ?? "Failed to save job");

      setPhase("analyzing");
      const analyzeRes = await fetch(`/api/jobs/${job.id}/analyze`, { method: "POST" });
      if (analyzeRes.ok) {
        toast.success("Job added and scored");
      } else {
        const data = await analyzeRes.json().catch(() => ({}));
        toast.warning(
          `Job saved, but analysis failed: ${data.error ?? "unknown error"}. You can re-run it from the job page.`
        );
      }

      setOpen(false);
      reset();
      router.push(`/jobs/${job.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setSaving(false);
      setPhase("idle");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle>Add job</DialogTitle>
              <DialogDescription>
                Paste a job description. It will be parsed and scored against your
                master resume automatically.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role info */}
          <div className="space-y-3 rounded-xl border bg-card-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Role details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="job-title">Title</Label>
                <Input
                  id="job-title"
                  placeholder="Senior Backend Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-company">Company</Label>
                <Input
                  id="job-company"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="job-location">Location (optional)</Label>
                <Input
                  id="job-location"
                  placeholder="San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch id="job-remote" checked={remote} onCheckedChange={setRemote} />
                <Label htmlFor="job-remote">Remote</Label>
              </div>
            </div>
          </div>

          {/* URL fetch */}
          <div className="space-y-2">
            <Label htmlFor="job-url">Application URL (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="job-url"
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleFetchUrl}
                disabled={fetchingUrl || !url}
              >
                {fetchingUrl ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Fetch details"
                )}
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="job-description">Job description</Label>
            <Textarea
              id="job-description"
              placeholder="Paste the full job description here…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[200px] bg-background text-xs"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {phase === "analyzing"
              ? "Analyzing with AI…"
              : phase === "saving"
                ? "Saving…"
                : "Add & analyze"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
