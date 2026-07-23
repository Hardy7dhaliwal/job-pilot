import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderMarkdownPDF } from "@/lib/pdf";

export const runtime = "nodejs";

/**
 * GET /api/cover-letters/[id]/pdf
 * Returns a compact, server-generated PDF of the cover letter.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const letter = await prisma.coverLetter.findUnique({
    where: { id: params.id },
    include: {
      job: { select: { title: true, company: true } },
    },
  });

  if (!letter) {
    return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
  }

  try {
    const title = letter.job
      ? `Cover Letter: ${letter.job.company} — ${letter.job.title}`
      : "Cover Letter";

    const pdf = await renderMarkdownPDF(
      letter.content,
      title,
      "JobPilot"
    );

    const slug = letter.job
      ? `${letter.job.company}-${letter.job.title}`
      : "cover-letter";
    const safeSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fileName = `cover-letter-${safeSlug || params.id}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
