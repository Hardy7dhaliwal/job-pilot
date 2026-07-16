import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintDocument } from "@/components/print/print-document";

export const dynamic = "force-dynamic";

/** Print-friendly view of a tailored resume (auth enforced by middleware). */
export default async function PrintResumeVersionPage({
  params,
}: {
  params: { id: string };
}) {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: params.id },
  });
  if (!version) notFound();
  return <PrintDocument markdown={version.content} />;
}
