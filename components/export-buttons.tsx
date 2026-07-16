"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

/**
 * Export controls for tailored resumes and cover letters.
 * - Markdown: direct .md file download (client-side blob).
 * - PDF: opens a clean print view in a new tab that auto-triggers the
 *   browser's print dialog — "Save as PDF" produces the file. This keeps
 *   the app dependency-light (no headless-browser PDF pipeline).
 */
export function ExportButtons({
  markdown,
  filename,
  printUrl,
}: {
  markdown: string;
  filename: string;
  printUrl: string;
}) {
  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={downloadMarkdown}>
        <Download className="mr-2 h-4 w-4" /> Markdown
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(printUrl, "_blank", "noopener")}
      >
        <Printer className="mr-2 h-4 w-4" /> PDF
      </Button>
    </div>
  );
}
