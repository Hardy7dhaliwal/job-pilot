"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ListFilter, Search } from "lucide-react";

/**
 * Search + filter bar for the jobs list. State lives in the URL
 * (?q=…&minScore=…&sort=…) so the server component re-queries on change
 * and links are shareable.
 */
export function JobsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const minScore = searchParams.get("minScore") ?? "0";
  const sort = searchParams.get("sort") ?? "score";

  function apply(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "0" && value !== "score") params.set(key, value);
      else params.delete(key);
    }
    router.push(`/jobs?${params.toString()}`);
  }

  // Debounced search-as-you-type.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== q) apply({ q });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search title, company, location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ListFilter className="h-4 w-4" />
            {minScore !== "0" ? `Score ≥ ${minScore}` : "Filter"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={minScore}
            onValueChange={(v) => apply({ minScore: v })}
          >
            <DropdownMenuRadioItem value="0">All scores</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="75">75+ (strong)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="60">60+ (partial)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="40">40+ (stretch)</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Sort: {sort === "date" ? "Newest" : "Score"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={sort} onValueChange={(v) => apply({ sort: v })}>
            <DropdownMenuRadioItem value="score">Match score</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="date">Newest first</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
