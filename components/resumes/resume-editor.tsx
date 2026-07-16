"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";

/**
 * Inline editor for a resume's title and content. Saves via PATCH and
 * refreshes the server-rendered page around it.
 */
export function ResumeEditor({
  resumeId,
  initialTitle,
  initialContent,
}: {
  resumeId: string;
  initialTitle: string;
  initialContent: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  const dirty = title !== initialTitle || content !== initialContent;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success("Resume saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-content">Content</Label>
        <Textarea
          id="edit-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[420px] font-mono text-xs leading-relaxed"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
}
