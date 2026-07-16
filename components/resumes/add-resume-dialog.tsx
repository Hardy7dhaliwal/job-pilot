"use client";

import { useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Upload } from "lucide-react";

/**
 * "Add resume" dialog with two modes:
 *  - Paste: title + markdown/plain-text content
 *  - Upload: PDF / .md / .txt file (PDF text is extracted server-side)
 */
export function AddResumeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setContent("");
    setUploadTitle("");
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePaste(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, format: "markdown" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save resume");
      toast.success("Resume saved");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save resume");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (uploadTitle.trim()) form.append("title", uploadTitle.trim());
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      toast.success("Resume uploaded and parsed");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add resume
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle>Add resume</DialogTitle>
              <DialogDescription>
                Paste your resume as Markdown/plain text, or upload a PDF, .md, or
                .txt file.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="paste">
          <TabsList className="grid w-full grid-cols-2 bg-card-muted">
            <TabsTrigger value="paste">Paste</TabsTrigger>
            <TabsTrigger value="upload">Upload file</TabsTrigger>
          </TabsList>

          <TabsContent value="paste">
            <form onSubmit={handlePaste} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="resume-title">Title</Label>
                <Input
                  id="resume-title"
                  placeholder="e.g. Master Resume 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resume-content">Content</Label>
                <Textarea
                  id="resume-content"
                  placeholder="# Jane Doe\nSenior Software Engineer…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[220px] bg-background font-mono text-xs"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save resume
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upload">
            <form onSubmit={handleUpload} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="upload-title">Title (optional)</Label>
                <Input
                  id="upload-title"
                  placeholder="Defaults to the file name"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resume-file">File</Label>
                <Input
                  id="resume-file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.md,.markdown,.txt"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                  required
                />
                {fileName && (
                  <p className="text-xs text-muted-foreground">Selected: {fileName}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload & parse
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
