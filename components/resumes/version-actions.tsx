"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExportButtons } from "@/components/export-buttons";
import {
  Eye,
  Download,
  Printer,
  Trash2,
  Loader2,
  MoreVertical,
  FileText,
  ExternalLink,
  FileDown,
} from "lucide-react";

interface VersionActionsProps {
  versionId: string;
  versionContent: string;
  versionLabel: string;
  /** Name used for file exports and titles. */
  fileName: string;
  /** URL for the print view (/print/resume-version/:id). */
  printUrl: string;
  /** URL for the server-generated PDF download (/api/resume-versions/:id/pdf). */
  pdfUrl?: string;
  /** Optional link to the job this was tailored for. */
  jobUrl?: string;
}

/**
 * Actions for a tailored resume version: view full content in a dialog,
 * download as Markdown, print as PDF, and delete (with confirmation).
 *
 * Renders as a kebab-menu button. The "View" option opens a scrollable
 * dialog with the complete version content rendered as monospaced text.
 */
export function VersionActions({
  versionId,
  versionContent,
  versionLabel,
  fileName,
  printUrl,
  pdfUrl,
  jobUrl,
}: VersionActionsProps) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/resume-versions/${versionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Version deleted");
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Version actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setViewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View full content
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const blob = new Blob([versionContent], {
                type: "text/markdown;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${fileName}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Markdown
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => window.open(printUrl, "_blank", "noopener")}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print view
          </DropdownMenuItem>
          {pdfUrl && (
            <DropdownMenuItem onClick={() => window.open(pdfUrl, "_blank", "noopener")}>
              <FileDown className="mr-2 h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
          )}
          {jobUrl && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.open(jobUrl, "_self")}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View job details
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete version
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View content dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {versionLabel}
            </DialogTitle>
            <DialogDescription>
              Full tailored resume content — review before using.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] rounded-md border bg-muted/50 p-4">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
              {versionContent}
            </pre>
          </ScrollArea>
          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <ExportButtons
              markdown={versionContent}
              filename={fileName}
              printUrl={printUrl}
              pdfUrl={pdfUrl}
            />
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this version?</DialogTitle>
            <DialogDescription>
              This removes the tailored resume version permanently. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
