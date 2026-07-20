import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { prisma } from "@/lib/prisma";
import { cn, formatDate } from "@/lib/utils";
import { JobActions } from "@/components/jobs/job-actions";
import { JobMaterials } from "@/components/jobs/job-materials";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MatchResult, ParsedJD } from "@/lib/types";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Sparkles,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

/** Safe JSON parse for the string-typed JSON columns. */
function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function scoreTone(score: number | null) {
  if (score === null) return { color: "text-muted-foreground", stroke: "stroke-muted-foreground", dot: "bg-muted-foreground" };
  if (score >= 75) return { color: "text-emerald-500", stroke: "stroke-emerald-500", dot: "bg-emerald-500" };
  if (score >= 60) return { color: "text-yellow-500", stroke: "stroke-yellow-500", dot: "bg-yellow-500" };
  if (score >= 40) return { color: "text-orange-500", stroke: "stroke-orange-500", dot: "bg-orange-500" };
  return { color: "text-red-500", stroke: "stroke-red-500", dot: "bg-red-500" };
}

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) notFound();

  const [parsed, match, master, latestVersion, coverLetter, application] = await Promise.all([
    Promise.resolve(parseJson<ParsedJD>(job.parsedJson)),
    Promise.resolve(parseJson<MatchResult>(job.matchJson)),
    prisma.resume.findFirst({ where: { isMaster: true }, select: { content: true } }),
    prisma.resumeVersion.findFirst({
      where: { jobId: job.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coverLetter.findFirst({ where: { jobId: job.id } }),
    prisma.application.findUnique({ where: { jobId: job.id }, select: { id: true } }),
  ]);

  const tone = scoreTone(job.matchScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/jobs">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to jobs</span>
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
              {job.remote && <Badge variant="outline">Remote</Badge>}
              <Badge variant="secondary">{job.source}</Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">{job.company}</span>
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {job.location}
                </span>
              )}
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  Posting <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          </div>
        </div>
        <JobActions
          jobId={job.id}
          hasBeenScored={job.matchScore !== null}
          hasApplication={Boolean(application)}
        />
      </div>

      {match ? (
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              {/* Gauge */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative h-32 w-32">
                  <svg className="h-full w-full -rotate-90">
                    <defs>
                      <linearGradient id="scoreGauge" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="currentColor" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      className="stroke-muted"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      className={cn("transition-all duration-700", tone.stroke)}
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 - ((job.matchScore ?? 0) / 100) * 2 * Math.PI * 52}
                      strokeLinecap="round"
                      style={{ color: "inherit" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-3xl font-extrabold tracking-tight tabular-nums", tone.color)}>
                      {job.matchScore}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Match
                    </span>
                  </div>
                </div>
                {job.scoredAt && (
                  <span className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">
                    Scored {formatDate(job.scoredAt)}
                  </span>
                )}
              </div>

              {/* Analysis */}
              <div className="flex-1 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Match Analysis
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                    {match.rationale}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border bg-card-muted p-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                      Matched Skills ({match.matchedSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matchedSkills.length ? (
                        match.matchedSkills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">None detected.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border bg-card-muted p-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                      <XCircle className="h-4 w-4" />
                      Missing Requirements ({match.missingMustHaves.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {match.missingMustHaves.length ? (
                        match.missingMustHaves.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="border-destructive/40 text-destructive dark:text-red-400"
                          >
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No critical requirements missing.</p>
                      )}
                    </div>
                  </div>

                  {match.gaps.length > 0 && (
                    <div className="space-y-2 sm:col-span-2 rounded-xl border bg-card-muted p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Identified Experience Gaps
                      </h4>
                      <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                        {match.gaps.map((gap) => (
                          <li key={gap}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="items-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">Not analyzed yet</CardTitle>
            <CardDescription className="max-w-md">
              Run <span className="font-medium">Analyze & score</span> to parse this job and score your
              master resume against it. Requires an AI provider configured in{" "}
              <code className="font-mono text-xs">.env</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <JobMaterials
        jobId={job.id}
        masterContent={master?.content ?? null}
        parsed={
          parsed
            ? {
                atsKeywords: parsed.atsKeywords || [],
                mustHaveSkills: parsed.mustHaveSkills || [],
              }
            : null
        }
        latestVersion={
          latestVersion
            ? {
                id: latestVersion.id,
                resumeId: latestVersion.resumeId,
                content: latestVersion.content,
                label: latestVersion.label,
                changesMade: latestVersion.changesMade,
                createdAt: latestVersion.createdAt.toISOString(),
              }
            : null
        }
        coverLetter={
          coverLetter
            ? {
                id: coverLetter.id,
                content: coverLetter.content,
                createdAt: coverLetter.createdAt.toISOString(),
                updatedAt: coverLetter.updatedAt.toISOString(),
              }
            : null
        }
      />

      <Separator />

      <Tabs defaultValue={parsed ? "parsed" : "description"}>
        <TabsList className="bg-card-muted">
          <TabsTrigger value="parsed" disabled={!parsed}>
            Parsed requirements
          </TabsTrigger>
          <TabsTrigger value="description">Full description</TabsTrigger>
        </TabsList>

        {parsed && (
          <TabsContent value="parsed" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{parsed.summary}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-card-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Must-have skills</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {parsed.mustHaveSkills.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-card-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Nice-to-haves</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {parsed.niceToHaveSkills.length ? (
                    parsed.niceToHaveSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">None listed.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="rounded-lg border bg-card-muted px-3 py-1.5">
                <span className="font-medium text-foreground/80">Experience:</span>{" "}
                {parsed.yearsExperience !== null ? `${parsed.yearsExperience}+ years` : "not stated"}
              </span>
              <span className="rounded-lg border bg-card-muted px-3 py-1.5">
                <span className="font-medium text-foreground/80">Seniority:</span>{" "}
                {parsed.seniority ?? "not stated"}
              </span>
            </div>
            {parsed.atsKeywords.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">ATS keywords</h3>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.atsKeywords.map((kw) => (
                    <Badge key={kw} variant="outline">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="description" className="pt-2">
          <Card className="bg-card-muted">
            <CardContent className="pt-6">
              <div
                className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(job.description || "", { async: false }) as string,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
