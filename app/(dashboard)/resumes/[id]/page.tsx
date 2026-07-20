import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResumeActions } from "@/components/resumes/resume-actions";
import { ResumeEditor } from "@/components/resumes/resume-editor";
import { VersionActions } from "@/components/resumes/version-actions";
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
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  FileText,
  History,
  Star,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Resume detail: editable content plus version history with full actions.
 * Each tailored version can be viewed, exported (Markdown/PDF), and deleted.
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

  const getFileName = (version: (typeof resume.versions)[number]) => {
    const slug =
      version.label ??
      (version.job
        ? `tailored-${version.job.company.replace(/\s+/g, "-").toLowerCase()}-${version.job.title.replace(/\s+/g, "-").toLowerCase()}`
        : "tailored-version");
    return `resume-${slug}`;
  };

  const getVersionLabel = (version: (typeof resume.versions)[number]) => {
    return (
      version.label ??
      (version.job
        ? `Tailored for ${version.job.company} — ${version.job.title}`
        : "Tailored version")
    );
  };

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
              Created {formatDate(resume.createdAt)} · last updated{" "}
              {formatDate(resume.updatedAt)}
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
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">Tailored versions</h2>
          <Badge variant="secondary" className="tabular-nums">
            {resume.versions.length}
          </Badge>
        </div>

        {resume.versions.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center py-10 text-center">
              <CardDescription className="max-w-md">
                No tailored versions yet. Use the Resume Tailor on a job page
                to create job-specific variants — each will appear here with
                full view, export, and delete controls.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3">
            {resume.versions.map((version) => (
              <Card
                key={version.id}
                className="overflow-hidden transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between p-4 pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm leading-tight">
                        {getVersionLabel(version)}
                      </CardTitle>
                      {version.content.length > 400 && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] text-muted-foreground/60"
                        >
                          {version.content.length.toLocaleString()} chars
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-0.5 text-xs">
                      {formatDateTime(version.createdAt)}
                    </CardDescription>
                    {version.job && (
                      <Link
                        href={`/jobs/${version.job.id}`}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {version.job.company} — {version.job.title}
                      </Link>
                    )}
                  </div>
                  <VersionActions
                    versionId={version.id}
                    versionContent={version.content}
                    versionLabel={getVersionLabel(version)}
                    fileName={getFileName(version)}
                    printUrl={`/print/resume-version/${version.id}`}
                    jobUrl={version.job ? `/jobs/${version.job.id}` : undefined}
                  />
                </div>
                <CardContent className="pb-4 pt-3">
                  {/* Content preview */}
                  <pre className="max-h-28 overflow-hidden text-ellipsis whitespace-pre-wrap rounded-md bg-muted/30 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
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
