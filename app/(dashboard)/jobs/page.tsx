import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AddJobDialog } from "@/components/jobs/add-job-dialog";
import { PurgeButton } from "@/components/jobs/purge-button";
import { BulkAnalyzeButton } from "@/components/jobs/bulk-analyze-button";
import { JobsFilter } from "@/components/jobs/jobs-filter";
import { ScoreBadge } from "@/components/jobs/score-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase, MapPin, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Jobs dashboard: sorted by match score (best first, unscored last) by
 * default. Search/filter/sort state lives in the URL — see JobsFilter.
 */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: { q?: string; minScore?: string; sort?: string };
}) {
  const q = searchParams.q?.trim();
  const minScore = Number(searchParams.minScore);
  const sort = searchParams.sort === "date" ? "date" : "score";

  const where: Prisma.JobWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { company: { contains: q } },
      { location: { contains: q } },
    ];
  }
  if (Number.isFinite(minScore) && minScore > 0) {
    where.matchScore = { gte: minScore };
  }

  // Fetch jobs for the active list view
  const jobs = await prisma.job.findMany({
    where,
    orderBy:
      sort === "date"
        ? [{ discoveredAt: "desc" }]
        : [{ matchScore: { sort: "desc", nulls: "last" } }, { discoveredAt: "desc" }],
  });

  // Fetch all unscored jobs in the database for the bulk analyzer
  const unscoredJobs = await prisma.job.findMany({
    where: { matchScore: null },
    select: { id: true, company: true, title: true },
  });

  const hasFilters = Boolean(q || (Number.isFinite(minScore) && minScore > 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Paste job descriptions and see how your master resume scores against
            each one.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkAnalyzeButton unscoredJobs={unscoredJobs} />
          <PurgeButton />
          <AddJobDialog />
        </div>
      </div>

      <JobsFilter />

      {jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">
              {hasFilters ? "No jobs match your filters" : "No jobs yet"}
            </CardTitle>
            <CardDescription className="max-w-xs">
              {hasFilters
                ? "Try clearing the search or lowering the score filter."
                : "Add a job by pasting its description — it gets parsed and scored automatically."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="group block">
              <Card className="transition-all hover:border-primary/30 hover:bg-card-muted">
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="truncate text-base transition-colors group-hover:text-primary">
                        {job.title}
                      </CardTitle>
                      {job.remote && <Badge variant="outline">Remote</Badge>}
                    </div>
                    <CardDescription className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium text-foreground/80">{job.company}</span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        added {job.discoveredAt.toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <ScoreBadge score={job.matchScore} className="ml-2 shrink-0" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
