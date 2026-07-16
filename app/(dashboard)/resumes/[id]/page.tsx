import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResumeActions } from "@/components/resumes/resume-actions";
import { ResumeEditor } from "@/components/resumes/resume-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, History, Star } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Resume detail: editable content plus version history. Tailored versions
 * are created by the Resume Tailor in Phase 3 — for now the history simply
 * lists them (empty for fresh resumes).
 */
export default async function ResumeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const resume = await prisma.resume.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: { job: { select: { id: true, title: true, company: true } } },
      },
    },
  });

  if (!resume) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/resumes">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to resumes</span>
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{resume.title}</h1>
              {resume.isMaster && (
                <Badge className="gap-1 bg-warning/15 text-warning hover:bg-warning/15">
                  <Star className="h-3 w-3" /> Master
                </Badge>
              )}
              <Badge variant="outline">{resume.format}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {resume.createdAt.toLocaleDateString()} · last updated{" "}
              {resume.updatedAt.toLocaleDateString()}
            </p>
          </div>
        </div>
        <ResumeActions
          resumeId={resume.id}
          isMaster={resume.isMaster}
          redirectAfterDelete="/resumes"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-base">Resume content</CardTitle>
              <CardDescription>Edit directly. Changes save to your master source of truth.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResumeEditor
            resumeId={resume.id}
            initialTitle={resume.title}
            initialContent={resume.content}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Version history */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">Version history</h2>
          <Badge variant="secondary" className="tabular-nums">
            {resume.versions.length}
          </Badge>
        </div>

        {resume.versions.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center py-10 text-center">
              <CardDescription className="max-w-md">
                No tailored versions yet. The Resume Tailor will create
                job-specific variants here — each with an audit list of exactly
                what was changed.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-2">
            {resume.versions.map((version) => (
              <Card key={version.id} className="overflow-hidden transition-all hover:bg-card-muted">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {version.label ??
                      (version.job
                        ? `Tailored for ${version.job.company} — ${version.job.title}`
                        : "Tailored version")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {version.createdAt.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <pre className="max-h-32 overflow-hidden text-ellipsis whitespace-pre-wrap text-xs text-muted-foreground">
                    {version.content.slice(0, 400)}
                    {version.content.length > 400 ? "…" : ""}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
