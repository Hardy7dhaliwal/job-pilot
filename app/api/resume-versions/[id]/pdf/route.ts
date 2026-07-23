import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderMarkdownPDF } from "@/lib/pdf";

export const runtime = "nodejs";

/**
 * GET /api/resume-versions/[id]/pdf
 * Returns a compact, server-generated PDF of the tailored resume version.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: params.id },
    include: {
      resume: { select: { title: true } },
      job: { select: { title: true, company: true } },
    },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  try {
    const title = version.job
      ? `${version.job.company} — ${version.job.title}`
      : version.resume.title;

    const pdf = await renderMarkdownPDF(
      version.content,
      `Resume: ${title}`,
      "JobPilot"
    );

    const slug = version.job
      ? `${version.job.company}-${version.job.title}`
      : version.resume.title;
    const safeSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fileName = `resume-${safeSlug || params.id}.pdf`;

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
