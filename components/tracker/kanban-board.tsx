"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { APPLICATION_STAGES } from "@/lib/constants";
import { ScoreBadge } from "@/components/jobs/score-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationNotesDialog } from "@/components/tracker/application-notes-dialog";
import { CalendarClock, GripVertical, StickyNote } from "lucide-react";

interface AppCard {
  id: string;
  stage: string;
  sortOrder: number;
  notes: string;
  appliedAt: string | null;
  followUpAt: string | null;
  reviewStatus: string;
  job: {
    id: string;
    title: string;
    company: string;
    matchScore: number | null;
    url: string | null;
  };
}

const STAGE_META: Record<
  string,
  { color: string; bg: string; border: string; dot: string }
> = {
  DISCOVERED: {
    color: "text-blue-500",
    bg: "bg-blue-500/8",
    border: "border-t-blue-500",
    dot: "bg-blue-500",
  },
  TAILORED: {
    color: "text-violet-500",
    bg: "bg-violet-500/8",
    border: "border-t-violet-500",
    dot: "bg-violet-500",
  },
  APPLIED: {
    color: "text-yellow-500",
    bg: "bg-yellow-500/8",
    border: "border-t-yellow-500",
    dot: "bg-yellow-500",
  },
  INTERVIEW: {
    color: "text-orange-500",
    bg: "bg-orange-500/8",
    border: "border-t-orange-500",
    dot: "bg-orange-500",
  },
  OFFER: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/8",
    border: "border-t-emerald-500",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    color: "text-red-500",
    bg: "bg-red-500/8",
    border: "border-t-red-500",
    dot: "bg-red-500",
  },
};

/**
 * Kanban board with HTML5 drag-and-drop. Cards can be dragged between
 * columns (stage change) and reordered within a column.
 * Cards are clickable links to the job detail page; clicking the notes
 * icon opens the notes/follow-up editor without navigating away.
 */
export function KanbanBoard({ applications }: { applications: AppCard[] }) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const columns = APPLICATION_STAGES.map((stage) => ({
    stage,
    meta: STAGE_META[stage] ?? STAGE_META.DISCOVERED,
    cards: applications
      .filter((a) => a.stage === stage)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  async function moveCard(appId: string, newStage: string) {
    try {
      const maxOrder = Math.max(
        0,
        ...applications.filter((a) => a.stage === newStage).map((a) => a.sortOrder)
      );
      await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, sortOrder: maxOrder + 1 }),
      });
      router.refresh();
    } catch {
      toast.error("Failed to move card");
    }
  }

  function handleDragStart(e: React.DragEvent, appId: string) {
    e.dataTransfer.setData("text/plain", appId);
    setDragging(appId);
  }

  function handleDragOver(e: React.DragEvent, stage: string) {
    e.preventDefault();
    setDragOver(stage);
  }

  function handleDrop(e: React.DragEvent, stage: string) {
    e.preventDefault();
    const appId = e.dataTransfer.getData("text/plain");
    setDragging(null);
    setDragOver(null);
    if (appId) {
      const app = applications.find((a) => a.id === appId);
      if (app && app.stage !== stage) {
        moveCard(appId, stage);
      }
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map(({ stage, meta, cards }) => (
        <div
          key={stage}
          className={cn(
            "flex w-64 shrink-0 flex-col rounded-xl border bg-card-muted p-2 transition-all duration-200",
            dragOver === stage &&
              "bg-primary/5 ring-2 ring-primary/30 border-primary/40 shadow-inner"
          )}
          onDragOver={(e) => handleDragOver(e, stage)}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop(e, stage)}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
              <h3
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  meta.color
                )}
              >
                {stage}
              </h3>
            </div>
            <Badge variant="secondary" className="text-[10px] tabular-nums">
              {cards.length}
            </Badge>
          </div>

          <div className="flex-1 space-y-2">
            {cards.map((app) => (
              <Card
                key={app.id}
                draggable
                onDragStart={(e) => {
                  // Prevent the Link from navigating while dragging.
                  e.stopPropagation();
                  handleDragStart(e, app.id);
                }}
                onDragEnd={() => setDragging(null)}
                className={cn(
                  "group relative cursor-grab overflow-hidden border-t-2 bg-card p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
                  meta.border,
                  dragging === app.id &&
                    "border-dashed border-primary bg-muted/20 opacity-30"
                )}
              >
                {/* Clickable area → job detail */}
                <Link
                  href={`/jobs/${app.job.id}`}
                  className="block p-3"
                  onClick={(e) => {
                    // If we were dragging, cancel navigation.
                    if (dragging) e.preventDefault();
                  }}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{app.job.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.job.company}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <ScoreBadge score={app.job.matchScore} className="text-[10px]" />
                        {app.reviewStatus === "PENDING" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-yellow-500/40 text-yellow-500"
                          >
                            Pending review
                          </Badge>
                        )}
                        {app.reviewStatus === "APPROVED" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-500/40 text-emerald-500"
                          >
                            Approved
                          </Badge>
                        )}
                      </div>
                      {app.followUpAt && (
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CalendarClock className="h-3 w-3 shrink-0" />
                          Follow-up {new Date(app.followUpAt).toLocaleDateString()}
                        </p>
                      )}
                      {app.notes && (
                        <p className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground">
                          <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="line-clamp-1">{app.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Notes/follow-up edit button — overlaid, stops navigation */}
                <div
                  className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ApplicationNotesDialog
                    appId={app.id}
                    jobTitle={app.job.title}
                    jobUrl={app.job.url}
                    initialNotes={app.notes}
                    initialAppliedAt={app.appliedAt}
                    initialFollowUpAt={app.followUpAt}
                  />
                </div>
              </Card>
            ))}
            {cards.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Drop here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
