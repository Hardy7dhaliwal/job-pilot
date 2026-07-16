import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_RESUME_UPLOAD_BYTES } from "@/lib/constants";

// pdf-parse needs the Node runtime (not Edge).
export const runtime = "nodejs";

/**
 * POST /api/resumes/upload — create a resume from an uploaded file.
 * Accepts multipart/form-data with fields:
 *   file:  .pdf, .md, .markdown, or .txt
 *   title: optional; defaults to the file name without extension
 *
 * PDFs are converted to plain text via pdf-parse v2. We use a dynamic
 * import to avoid the bundler relocating pdf-parse's worker files.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_RESUME_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 413 }
    );
  }

  const name = file.name || "resume";
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";

  let content: string;
  let format: "markdown" | "text";

  if (ext === "pdf") {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      content = await extractPdfText(buffer);
    } catch (err) {
      console.error("PDF parse failed:", err);
      return NextResponse.json(
        { error: "Could not extract text from this PDF. If it is a scanned image, paste the text instead." },
        { status: 422 }
      );
    }
    format = "text";
  } else if (ext === "md" || ext === "markdown") {
    content = (await file.text()).trim();
    format = "markdown";
  } else if (ext === "txt" || ext === "") {
    content = (await file.text()).trim();
    format = "text";
  } else {
    return NextResponse.json(
      { error: `Unsupported file type ".${ext}". Use PDF, Markdown, or plain text.` },
      { status: 415 }
    );
  }

  if (!content) {
    return NextResponse.json(
      { error: "No text could be extracted from the file" },
      { status: 422 }
    );
  }

  const titleField = form.get("title");
  const title =
    (typeof titleField === "string" && titleField.trim()) ||
    name.replace(/\.[^.]+$/, "");

  // First resume ever becomes the master automatically.
  const existingCount = await prisma.resume.count();
  const resume = await prisma.resume.create({
    data: { title, content, format, isMaster: existingCount === 0 },
  });

  return NextResponse.json(resume, { status: 201 });
}

/**
 * Extract plain text from a PDF buffer using pdf-parse v2.
 *
 * Uses a child process to avoid Next.js's webpack bundler breaking
 * pdfjs-dist's worker resolution. The extraction script runs in raw
 * Node.js where require() resolves normally.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { spawn } = await import("child_process");
  const path = await import("path");

  const scriptPath = path.join(process.cwd(), "lib", "pdf-extract.cjs");

  return new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    child.stdout.on("data", (d: Buffer) => chunks.push(d));
    child.stderr.on("data", (d: Buffer) => errChunks.push(d));

    child.on("close", (code) => {
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (code !== 0 || !text) {
        const errMsg = Buffer.concat(errChunks).toString("utf8").trim();
        reject(new Error(errMsg || "PDF extraction failed"));
        return;
      }
      resolve(text);
    });

    child.on("error", reject);

    // Send base64-encoded PDF via stdin.
    child.stdin.write(buffer.toString("base64"));
    child.stdin.end();

    // Safety timeout.
    setTimeout(() => {
      child.kill();
      reject(new Error("PDF extraction timed out"));
    }, 30_000);
  });
}
