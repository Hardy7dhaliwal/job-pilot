import { cn } from "@/lib/utils";

/**
 * Match score pill, color-graded by the scoring rubric bands
 * (see MATCH_SCORE_SYSTEM in lib/prompts.ts).
 */
export function ScoreBadge({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  if (score === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground",
          className
        )}
      >
        Not scored
      </span>
    );
  }

  const tone =
    score >= 75
      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
      : score >= 60
        ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
        : score >= 40
          ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
          : "bg-red-500/15 text-red-500 border-red-500/30";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        tone,
        className
      )}
    >
      {score}
    </span>
  );
}
