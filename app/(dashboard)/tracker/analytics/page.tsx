import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Analytics: applications per week, response rate, avg match score of
 * applications that received responses (Interview/Offer stages).
 * Pure server component — stats computed from DB at render time.
 */
export default async function AnalyticsPage() {
  const [totalApps, appliedApps, responses, allApps] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { stage: { in: ["APPLIED", "INTERVIEW", "OFFER"] } } }),
    prisma.application.count({ where: { stage: { in: ["INTERVIEW", "OFFER"] } } }),
    prisma.application.findMany({
      select: { createdAt: true, stage: true, job: { select: { matchScore: true } } },
    }),
  ]);

  const now = new Date();
  const weeks: { label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = allApps.filter(
      (a) => a.createdAt >= weekStart && a.createdAt < weekEnd
    ).length;
    weeks.push({
      label: formatDate(weekStart),
      count,
    });
  }
  const maxWeekCount = Math.max(1, ...weeks.map((w) => w.count));

  const responseRate = appliedApps > 0 ? Math.round((responses / appliedApps) * 100) : 0;

  const responseApps = allApps.filter(
    (a) => (a.stage === "INTERVIEW" || a.stage === "OFFER") && a.job.matchScore !== null
  );
  const avgScore =
    responseApps.length > 0
      ? Math.round(
          responseApps.reduce((sum, a) => sum + (a.job.matchScore ?? 0), 0) / responseApps.length
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Application pipeline metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total applications" value={totalApps} />
        <StatCard
          label="Response rate"
          value={`${responseRate}%`}
          sublabel={`${responses} response${responses !== 1 ? "s" : ""} from ${appliedApps} applied`}
        />
        <StatCard
          label="Avg match score of responses"
          value={avgScore !== null ? avgScore : "—"}
          sublabel={
            avgScore !== null
              ? `Based on ${responseApps.length} application${responseApps.length !== 1 ? "s" : ""} that reached Interview or Offer`
              : undefined
          }
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-base">Applications per week</CardTitle>
              <CardDescription>Last 8 weeks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {weeks.map((week) => (
              <div key={week.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {week.count > 0 ? week.count : ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary transition-all"
                  style={{
                    height: `${(week.count / maxWeekCount) * 80}px`,
                    minHeight: week.count > 0 ? 4 : 0,
                  }}
                />
                <span className="text-[9px] text-muted-foreground">{week.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {totalApps === 0 && (
        <Card className="border-dashed">
          <CardHeader className="items-center py-8 text-center">
            <CardDescription className="max-w-md">
              No data yet. As you track applications through the Kanban board,
              analytics will populate here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardDescription className="leading-none">{label}</CardDescription>
        <CardTitle className="pt-2 text-3xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      {sublabel && (
        <CardContent className="mt-auto">
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </CardContent>
      )}
    </Card>
  );
}
