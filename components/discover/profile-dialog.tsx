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
import { Loader2, Plus, Search } from "lucide-react";

/**
 * Dialog for creating (or editing) a search profile. Editing passes the
 * `existing` prop to pre-fill the form and PATCH instead of POST.
 */
export function ProfileDialog({
  existing,
  trigger,
}: {
  existing?: {
    id: string;
    name: string;
    keywords: string;
    location: string | null;
    remoteOnly: boolean;
    seniority: string | null;
    isActive: boolean;
  };
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(existing?.name ?? "");
  const [keywords, setKeywords] = useState(existing?.keywords ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [remoteOnly, setRemoteOnly] = useState(existing?.remoteOnly ?? false);
  const [seniority, setSeniority] = useState(existing?.seniority ?? "");
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);

  function reset() {
    if (!existing) {
      setName("");
      setKeywords("");
      setLocation("");
      setRemoteOnly(false);
      setSeniority("");
      setIsActive(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name,
        keywords,
        location: location || null,
        remoteOnly,
        seniority: seniority || null,
        isActive,
      };
      const url = existing
        ? `/api/search-profiles/${existing.id}`
        : "/api/search-profiles";
      const res = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(existing ? "Profile updated" : "Profile created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle>{existing ? "Edit profile" : "New search profile"}</DialogTitle>
              <DialogDescription>
                Define keywords and filters. The background fetcher will search
                all enabled sources for matching jobs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              placeholder="e.g. Senior React roles"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-keywords">Keywords (comma-separated)</Label>
            <Input
              id="profile-keywords"
              placeholder="react, typescript, frontend"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-location">Location</Label>
              <Input
                id="profile-location"
                placeholder="San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-seniority">Seniority</Label>
              <select
                id="profile-seniority"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
              >
                <option value="">Any</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="staff">Staff</option>
                <option value="lead">Lead</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-card-muted p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch id="profile-remote" checked={remoteOnly} onCheckedChange={setRemoteOnly} />
              <Label htmlFor="profile-remote">Remote only</Label>
            </div>
            {existing && (
              <div className="flex items-center gap-2">
                <Switch id="profile-active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="profile-active">Active</Label>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existing ? "Save changes" : "Create profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
