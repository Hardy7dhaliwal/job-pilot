import { prisma } from "@/lib/prisma";
import { ApproveButton } from "@/components/tracker/approve-button";
import { ScoreBadge } from "@/components/jobs/score-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Human-in-the-loop review queue. Shows applications with reviewStatus
 * "PENDING" — high-scoring jobs with pre-generated tailored materials
 * awaiting one-click approval. Approving marks "APPLIED" and opens the
 * job's application URL.
 */
export default async function ReviewQueuePage() {
  const pending = await prisma.application.findMany({
    where: {
      reviewStatus: "PENDING",
      stage: { in: ["DISCOVERED", "TAILORED"] },
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      job: {
        select: { id: true, title: true, company: true, matchScore: true, url: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          High-scoring jobs with pre-generated materials awaiting your approval.
          The agent never auto-submits — approve to mark as applied.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">Queue is empty</CardTitle>
            <CardDescription className="max-w-md">
              When jobs are scored and materials are generated, they appear here
              for your approval before any application is submitted.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {pending.map((item) => (
            <Card key={item.id} className="transition-all hover:bg-card-muted">
              <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="truncate text-base">{item.job.title}</CardTitle>
                    <ScoreBadge score={item.job.matchScore} />
                  </div>
                  <CardDescription className="mt-1.5">
                    <span className="font-medium text-foreground/80">{item.job.company}</span>
                    {item.job.url && (
                      <a
                        href={item.job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View posting <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-yellow-500/40 text-yellow-500">
                    Pending
                  </Badge>
                  <ApproveButton appId={item.id} jobUrl={item.job.url} />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
