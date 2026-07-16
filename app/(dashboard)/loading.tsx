import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared skeleton loading state for all pages inside the dashboard shell.
 * Next.js automatically wraps page contents in Suspense and displays this
 * skeleton while async server components fetch data.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title & Description Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-12" />
            <div className="h-4" />
          </div>
        ))}
      </div>

      {/* Content Feed Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border bg-card p-4"
            >
              <div className="min-w-0 flex-1 space-y-2 pr-4">
                <Skeleton className="h-5 w-1/3" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              </div>
              <Skeleton className="h-8 w-12 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
