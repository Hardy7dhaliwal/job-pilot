import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ScoreBadge } from "@/components/jobs/score-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Circle,
  FileText,
  Kanban,
  ListTodo,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Dashboard home: resume status, job pipeline stats, onboarding checklist,
 * and the current top-scoring matches.
 */
export default async function DashboardPage() {
  const [
    resumeCount,
    master,
    jobCount,
    scoredCount,
    topJobs,
    appliedCount,
    responseCount,
    profileCount,
  ] = await Promise.all([
    prisma.resume.count(),
    prisma.resume.findFirst({ where: { isMaster: true } }),
    prisma.job.count(),
    prisma.job.count({ where: { matchScore: { not: null } } }),
    prisma.job.findMany({
      where: { matchScore: { not: null } },
      orderBy: { matchScore: "desc" },
      take: 5,
      select: { id: true, title: true, company: true, matchScore: true },
    }),
    prisma.application.count({ where: { stage: { in: ["APPLIED", "INTERVIEW", "OFFER"] } } }),
    prisma.application.count({ where: { stage: { in: ["INTERVIEW", "OFFER"] } } }),
    prisma.searchProfile.count(),
  ]);

  const checklist = [
    { label: "Upload your master resume", completed: Boolean(master), href: "/resumes" },
    { label: "Create a job search profile", completed: profileCount > 0, href: "/discover" },
    { label: "Add your first job posting", completed: jobCount > 0, href: "/jobs" },
    { label: "Run an ATS compatibility scan", completed: scoredCount > 0, href: "/jobs" },
  ];
  const completedCount = checklist.filter((item) => item.completed).length;
  const percentComplete = Math.round((completedCount / checklist.length) * 100);
  const showOnboarding = percentComplete < 100;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your job search command center.</p>
        </div>
        {percentComplete === 100 && (
          <Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
            <Sparkles className="h-3 w-3" /> Workspace ready
          </Badge>
        )}
      </div>

      {showOnboarding && (
        <Card className="overflow-hidden border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ListTodo className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Getting Started Checklist</CardTitle>
            </div>
            <CardDescription>
              Complete these steps to set up your workspace and unlock full AI optimization features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Setup progress</span>
                <span className="font-semibold text-primary">{percentComplete}% complete</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="grid gap-2 sm:grid-cols-2">
              {checklist.map((step) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className="group flex items-center gap-3 rounded-lg border bg-card-muted p-3 transition-colors hover:border-primary/40 hover:bg-card"
                >
                  {step.completed ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40">
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <span
                    className={`text-sm ${
                      step.completed ? "text-muted-foreground line-through" : "font-medium"
                    }`}
                  >
                    {step.label}
                  </span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={FileText}
          label="Resumes"
          value={resumeCount}
          action={{ href: "/resumes", label: "Manage" }}
        />

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-warning/15">
                <Star className="h-3.5 w-3.5 text-warning" />
              </div>
              <CardDescription className="leading-none">Master resume</CardDescription>
            </div>
            <CardTitle className="truncate pt-2 text-lg">
              {master ? master.title : "Not set"}
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-auto">
            {master ? (
              <Badge variant="secondary" className="font-normal">Source of truth for matching</Badge>
            ) : (
              <Link href="/resumes">
                <Button size="sm">Add your resume</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <StatCard
          icon={Briefcase}
          label="Jobs"
          value={jobCount}
          sublabel={`${scoredCount} scored`}
          action={{ href: "/jobs", label: "View all" }}
        />
      </div>

      {appliedCount > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={Kanban}
            label="Applications sent"
            value={appliedCount}
            action={{ href: "/tracker", label: "View tracker" }}
          />
          <StatCard
            icon={TrendingUp}
            label="Interviews / Offers"
            value={responseCount}
            sublabel={`${Math.round((responseCount / appliedCount) * 100)}% response rate`}
          />
        </div>
      )}

      {topJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">Top matches</h2>
            </div>
            <Link
              href="/jobs"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {topJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block">
                <Card className="group transition-all hover:border-primary/30 hover:bg-card-muted">
                  <CardHeader className="flex-row items-center justify-between space-y-0 py-3.5">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm group-hover:text-primary">
                        {job.title}
                      </CardTitle>
                      <CardDescription className="text-xs">{job.company}</CardDescription>
                    </div>
                    <ScoreBadge score={job.matchScore} className="ml-4 shrink-0" />
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  action,
}: {
  icon: typeof FileText;
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  action?: { href: string; label: string };
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <CardDescription className="leading-none">{label}</CardDescription>
        </div>
        <CardTitle className="pt-2 text-3xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto flex items-center justify-between">
        {action ? (
          <Link href={action.href}>
            <Button variant="ghost" size="sm" className="-ml-2 gap-1 px-2">
              {action.label} <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        ) : (
          <span />
        )}
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </CardContent>
    </Card>
  );
}
