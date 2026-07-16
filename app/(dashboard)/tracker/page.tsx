import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/tracker/kanban-board";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Kanban } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Application tracker: Kanban board with columns for each stage
 * (Discovered → Tailored → Applied → Interview → Offer → Rejected).
 */
export default async function TrackerPage() {
  const applications = await prisma.application.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      job: { select: { id: true, title: true, company: true, matchScore: true, url: true } },
    },
  });

  const cards = applications.map((a) => ({
    id: a.id,
    stage: a.stage,
    sortOrder: a.sortOrder,
    notes: a.notes,
    appliedAt: a.appliedAt?.toISOString() ?? null,
    followUpAt: a.followUpAt?.toISOString() ?? null,
    reviewStatus: a.reviewStatus,
    job: a.job,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Drag cards between columns to update application status.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/tracker/analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Link>
        </Button>
      </div>

      {cards.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center py-12 text-center">
            <Kanban className="h-8 w-8 text-muted-foreground" />
            <CardTitle className="text-base">No applications yet</CardTitle>
            <CardDescription>
              Applications are created from the review queue or manually from a
              job page. Score some jobs first, then approve them for tracking.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <KanbanBoard applications={cards} />
      )}
    </div>
  );
}
