"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DiffView } from "@/components/jobs/diff-view";
import { ExportButtons } from "@/components/export-buttons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { Loader2, FileText, History, Mail, Save, Sparkles } from "lucide-react";

interface ResumeVersion {
  id: string;
  resumeId: string;
  content: string;
  label: string | null;
  changesMade: string;
  createdAt: string;
}

interface CoverLetter {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ParsedData {
  atsKeywords: string[];
  mustHaveSkills: string[];
}

/**
 * The "Materials" card on a job detail page. Shows tailored resume diff
 * view, cover letter with inline editing, and generate/export actions.
 */
export function JobMaterials({
  jobId,
  masterContent,
  parsed,
  latestVersion,
  coverLetter,
}: {
  jobId: string;
  masterContent: string | null;
  parsed: ParsedData | null;
  latestVersion: ResumeVersion | null;
  coverLetter: CoverLetter | null;
}) {
  const router = useRouter();
  const [tailoring, setTailoring] = useState(false);
  const [scoringTailored, setScoringTailored] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [letterContent, setLetterContent] = useState(coverLetter?.content ?? "");
  const [letterDirty, setLetterDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const changesMade: string[] = latestVersion
    ? (() => {
        try {
          return JSON.parse(latestVersion.changesMade);
        } catch {
          return [];
        }
      })()
    : [];

  const atsKeywords = parsed?.atsKeywords ?? [];
  const tailoredContent = latestVersion?.content ?? "";

  const keywordMatches = atsKeywords.map((kw) => {
    const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    const matched = regex.test(tailoredContent);
    return { name: kw, matched };
  });

  const matchedCount = keywordMatches.filter((k) => k.matched).length;

  async function handleTailor() {
    setTailoring(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/tailor`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tailoring failed");
      toast.success("Resume tailored");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tailoring failed");
    } finally {
      setTailoring(false);
    }
  }

  async function handleScoreTailored() {
    if (!latestVersion) return;
    setScoringTailored(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVersionId: latestVersion.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scoring failed");
      toast.success(`Scored ${data.matchScore}/100 against tailored resume version`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setScoringTailored(false);
    }
  }

  async function handleGenerateLetter() {
    setGeneratingLetter(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/cover-letter`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      toast.success("Cover letter generated");
      setLetterContent(data.content);
      setLetterDirty(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingLetter(false);
    }
  }

  async function handleSaveLetter() {
    if (!coverLetter) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cover-letters/${coverLetter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: letterContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Cover letter saved");
      setLetterDirty(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-0.5">
            <CardTitle className="text-base">Application materials</CardTitle>
            <CardDescription>AI-tailored resume and cover letter — review before using.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resume">
          <TabsList className="grid w-full grid-cols-2 bg-card-muted">
            <TabsTrigger value="resume" className="gap-2">
              <FileText className="h-4 w-4" /> Tailored resume
            </TabsTrigger>
            <TabsTrigger value="letter" className="gap-2">
              <Mail className="h-4 w-4" /> Cover letter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="space-y-4 pt-4">
            {latestVersion && masterContent ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{latestVersion.label}</span>{" "}
                    · created {formatDateTime(latestVersion.createdAt)}
                    <Link
                      href={`/resumes/${latestVersion.resumeId}`}
                      className="ml-2 inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary"
                    >
                      <History className="h-3 w-3" />
                      View all versions
                    </Link>
                  </p>
                  <ExportButtons
                    markdown={latestVersion.content}
                    filename={`resume-${jobId}`}
                    printUrl={`/print/resume-version/${latestVersion.id}`}
                    pdfUrl={`/api/resume-versions/${latestVersion.id}/pdf`}
                  />
                </div>
                <DiffView original={masterContent} tailored={latestVersion.content} />

                {/* Keyword Checklist */}
                {atsKeywords.length > 0 && (
                  <div className="space-y-3 rounded-xl border bg-card-muted p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold tracking-tight">ATS Keyword Checklist</h4>
                      <Badge variant="secondary" className="text-xs">
                        {matchedCount} of {atsKeywords.length} matched
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ensure these key terms appear in your tailored resume to optimize ATS parsing.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {keywordMatches.map((kw) => (
                        <Badge
                          key={kw.name}
                          variant={kw.matched ? "secondary" : "outline"}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 text-xs transition-colors",
                            kw.matched
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                              : "text-muted-foreground border-muted-foreground/20"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              kw.matched ? "bg-emerald-500" : "bg-muted-foreground/45"
                            )}
                          />
                          {kw.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {changesMade.length > 0 && (
                  <div className="space-y-2 rounded-xl border bg-card-muted p-4">
                    <h4 className="text-sm font-medium">Changes made</h4>
                    <ul className="space-y-1">
                      {changesMade.map((change, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="mt-0.5 shrink-0">
                            {i + 1}
                          </Badge>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTailor}
                    disabled={tailoring || scoringTailored}
                  >
                    {tailoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Sparkles className="mr-2 h-4 w-4" /> Re-tailor
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScoreTailored}
                    disabled={scoringTailored || tailoring}
                  >
                    {scoringTailored && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Sparkles className="mr-2 h-4 w-4" /> Score tailored resume
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {masterContent
                    ? "No tailored version yet. Generate one to see the diff against your master resume."
                    : "Set a master resume first so JobPilot can tailor it for this role."}
                </p>
                {masterContent && (
                  <Button onClick={handleTailor} disabled={tailoring}>
                    {tailoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Sparkles className="mr-2 h-4 w-4" /> Tailor resume
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="letter" className="space-y-4 pt-4">
            {coverLetter ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Last generated {formatDateTime(coverLetter.updatedAt)}
                    {letterDirty && (
                      <span className="ml-2 text-xs text-yellow-500">· unsaved edits</span>
                    )}
                  </p>
                  <ExportButtons
                    markdown={letterContent}
                    filename={`cover-letter-${jobId}`}
                    printUrl={`/print/cover-letter/${coverLetter.id}`}
                    pdfUrl={`/api/cover-letters/${coverLetter.id}/pdf`}
                  />
                </div>
                <Textarea
                  value={letterContent}
                  onChange={(e) => {
                    setLetterContent(e.target.value);
                    setLetterDirty(true);
                  }}
                  className="min-h-[280px] bg-background font-mono text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveLetter}
                    disabled={!letterDirty || saving}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Save edits
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateLetter}
                    disabled={generatingLetter}
                  >
                    {generatingLetter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Sparkles className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {masterContent
                    ? "No cover letter yet. Generate one tailored to this job."
                    : "Set a master resume first so JobPilot can write a cover letter."}
                </p>
                {masterContent && (
                  <Button onClick={handleGenerateLetter} disabled={generatingLetter}>
                    {generatingLetter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Sparkles className="mr-2 h-4 w-4" /> Generate cover letter
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
