import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintDocument } from "@/components/print/print-document";

export const dynamic = "force-dynamic";

/** Print-friendly view of a cover letter (auth enforced by middleware). */
export default async function PrintCoverLetterPage({
  params,
}: {
  params: { id: string };
}) {
  const letter = await prisma.coverLetter.findUnique({
    where: { id: params.id },
  });
  if (!letter) notFound();
  return <PrintDocument markdown={letter.content} />;
}
