import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddResumeDialog } from "@/components/resumes/add-resume-dialog";
import { ResumeActions } from "@/components/resumes/resume-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Star } from "lucide-react";

export const dynamic = "force-dynamic";

/** Resume list: master pinned first, then most recently updated. */
export default async function ResumesPage() {
  const resumes = await prisma.resume.findMany({
    orderBy: [{ isMaster: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { versions: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            Your master resume is the source of truth for job matching and
            tailoring.
          </p>
        </div>
        <AddResumeDialog />
      </div>

      {resumes.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No resumes yet</CardTitle>
            <CardDescription className="max-w-xs">
              Add your resume by pasting it or uploading a PDF — the first one
              becomes your master automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className="group transition-all hover:border-primary/30 hover:bg-card-muted"
            >
              <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 py-4">
                <Link
                  href={`/resumes/${resume.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="truncate text-base transition-colors group-hover:text-primary">
                      {resume.title}
                    </CardTitle>
                    {resume.isMaster && (
                      <Badge className="gap-1 bg-warning/15 text-warning hover:bg-warning/15">
                        <Star className="h-3 w-3" /> Master
                      </Badge>
                    )}
                    <Badge variant="outline">{resume.format}</Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {resume._count.versions} tailored version
                    {resume._count.versions === 1 ? "" : "s"} · updated{" "}
                    {resume.updatedAt.toLocaleDateString()}
                  </CardDescription>
                </Link>
                <ResumeActions
                  resumeId={resume.id}
                  isMaster={resume.isMaster}
                />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
