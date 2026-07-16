import { marked } from "marked";
import { AutoPrint } from "@/components/print/auto-print";

/**
 * Shared print layout: renders markdown as clean, light-themed HTML
 * suitable for the browser's "Save as PDF". Forces light colors even
 * though the app defaults to dark mode.
 */
export function PrintDocument({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown, { async: false }) as string;

  return (
    <div className="min-h-screen bg-white text-black">
      <AutoPrint />
      <style>{`
        @page {
          size: letter;
          margin: 1.5cm 2cm;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          html, body { height: 99%; }
          .print-doc { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
        }
        .print-doc {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          max-width: 48rem;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
          color: #111827;
        }
        .print-doc h1 {
          font-size: 1.6rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
          text-align: center;
          color: #111827;
        }
        .print-doc h2 {
          font-size: 1.15rem;
          font-weight: 600;
          margin: 1.4rem 0 0.4rem;
          border-bottom: 1px solid #e5e5e5;
          padding-bottom: 0.2rem;
          break-after: avoid;
          page-break-after: avoid;
          color: #111827;
        }
        .print-doc h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 1rem 0 0.3rem;
          break-after: avoid;
          page-break-after: avoid;
          color: #111827;
        }
        .print-doc p {
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 0.5rem;
          orphans: 3;
          widows: 3;
          color: #374151;
        }
        .print-doc li {
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 0.25rem;
          break-inside: avoid;
          page-break-inside: avoid;
          color: #374151;
        }
        .print-doc ul, .print-doc ol {
          padding-left: 1.2rem;
          margin: 0.3rem 0 0.8rem;
        }
        .print-doc a { color: inherit; text-decoration: none; }
        .print-doc strong { color: #111827; }
      `}</style>
      <div className="no-print border-b border-neutral-200 bg-neutral-100 px-6 py-3 text-sm text-neutral-600">
        Use your browser&apos;s print dialog to save this as a PDF (Destination:
        “Save as PDF”).
      </div>
      <article
        className="print-doc"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
