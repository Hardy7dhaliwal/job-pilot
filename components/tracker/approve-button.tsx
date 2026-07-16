"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ThumbsUp } from "lucide-react";

/**
 * Approve button for a single review-queue item.
 * Extracted as a client component so the parent Review Queue page can be
 * a proper async server component (no loading flash).
 */
export function ApproveButton({
  appId,
  jobUrl,
}: {
  appId: string;
  jobUrl: string | null;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/applications/${appId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed");
      toast.success("Approved! Opening application page…");
      if (data.url ?? jobUrl) {
        window.open(data.url ?? jobUrl, "_blank", "noopener");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApproving(false);
    }
  }

  return (
    <Button size="sm" onClick={handleApprove} disabled={approving}>
      {approving ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ThumbsUp className="mr-2 h-4 w-4" />
      )}
      Approve & apply
    </Button>
  );
}
