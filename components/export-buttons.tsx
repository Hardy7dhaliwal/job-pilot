"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer, FileDown } from "lucide-react";

/**
 * Export controls for tailored resumes and cover letters.
 * - Markdown: direct .md file download (client-side blob).
 * - Print PDF: opens a clean print view in a new tab that auto-triggers the
 *   browser's print dialog — "Save as PDF" produces the file.
 * - Download PDF: server-generated compact PDF via @react-pdf/renderer.
 */
export function ExportButtons({
  markdown,
  filename,
  printUrl,
  pdfUrl,
}: {
  markdown: string;
  filename: string;
  printUrl: string;
  pdfUrl?: string;
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

  function downloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    const base = filename.endsWith(".pdf") ? filename.slice(0, -4) : filename;
    a.download = `${base}.pdf`;
    a.click();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={downloadMarkdown}>
        <Download className="mr-2 h-4 w-4" /> Markdown
      </Button>
      {pdfUrl && (
        <Button variant="outline" size="sm" onClick={downloadPdf}>
          <FileDown className="mr-2 h-4 w-4" /> PDF
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(printUrl, "_blank", "noopener")}
      >
        <Printer className="mr-2 h-4 w-4" /> Print
      </Button>
    </div>
  );
}
