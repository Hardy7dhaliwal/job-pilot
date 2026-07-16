"use client";

import { diffLines } from "diff";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Side-by-side diff of the master resume (left) vs tailored version (right).
 * Uses the `diff` package for line-level comparison. Added lines are green,
 * removed are red, unchanged are dimmed for context.
 */
export function DiffView({
  original,
  tailored,
}: {
  original: string;
  tailored: string;
}) {
  const changes = diffLines(original, tailored);

  return (
    <ScrollArea className="h-[500px] rounded-md border">
      <div className="p-4 font-mono text-xs leading-relaxed">
        {changes.map((part, i) => {
          const lines = part.value.split("\n").filter((l, idx, arr) => {
            // Remove trailing empty string from split
            if (idx === arr.length - 1 && l === "") return false;
            return true;
          });

          return lines.map((line, j) => (
            <div
              key={`${i}-${j}`}
              className={cn(
                "whitespace-pre-wrap border-l-2 pl-3 py-px",
                part.added
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : part.removed
                    ? "border-red-500 bg-red-500/10 text-red-300 line-through"
                    : "border-transparent text-muted-foreground/60"
              )}
            >
              <span className="mr-3 inline-block w-3 text-center text-muted-foreground/40">
                {part.added ? "+" : part.removed ? "−" : " "}
              </span>
              {line || " "}
            </div>
          ));
        })}
      </div>
    </ScrollArea>
  );
}
