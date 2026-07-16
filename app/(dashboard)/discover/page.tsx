import { prisma } from "@/lib/prisma";
import { ProfileDialog } from "@/components/discover/profile-dialog";
import { FetchButton } from "@/components/discover/fetch-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Radio } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Discover page: manage search profiles and trigger background fetches.
 * Shows profile list with last-fetched timestamps.
 */
export default async function DiscoverPage() {
  const profiles = await prisma.searchProfile.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  const activeCount = profiles.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="text-sm text-muted-foreground">
            Saved search profiles fetch jobs from Greenhouse, Lever, Ashby, Adzuna,
            and JSearch — then auto-score them against your master resume.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && <FetchButton />}
          <ProfileDialog />
        </div>
      </div>

      {profiles.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No search profiles yet</CardTitle>
            <CardDescription className="max-w-xs">
              Create a profile to start discovering jobs automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {profiles.map((profile) => {
            const sources: string[] = (() => {
              try {
                return JSON.parse(profile.sources);
              } catch {
                return [];
              }
            })();

            return (
              <Card
                key={profile.id}
                className="group transition-all hover:border-primary/30 hover:bg-card-muted"
              >
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="truncate text-base transition-colors group-hover:text-primary">
                        {profile.name}
                      </CardTitle>
                      {profile.isActive ? (
                        <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                          <Radio className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Paused
                        </Badge>
                      )}
                      {profile.remoteOnly && <Badge variant="secondary">Remote</Badge>}
                      {profile.seniority && <Badge variant="secondary">{profile.seniority}</Badge>}
                    </div>
                    <CardDescription className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium text-foreground/80">{profile.keywords}</span>
                      {profile.location && <span>{profile.location}</span>}
                      <span>{sources.length} source{sources.length === 1 ? "" : "s"}</span>
                      {profile.lastFetchedAt && (
                        <span>last fetched {profile.lastFetchedAt.toLocaleString()}</span>
                      )}
                    </CardDescription>
                  </div>
                  <ProfileDialog
                    existing={{
                      id: profile.id,
                      name: profile.name,
                      keywords: profile.keywords,
                      location: profile.location,
                      remoteOnly: profile.remoteOnly,
                      seniority: profile.seniority,
                      isActive: profile.isActive,
                    }}
                    trigger={
                      <button className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                        Edit
                      </button>
                    }
                  />
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
