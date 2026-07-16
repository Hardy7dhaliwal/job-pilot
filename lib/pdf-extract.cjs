#!/usr/bin/env node
/**
 * Standalone PDF text extraction script.
 *
 * Reads base64-encoded PDF data from stdin, extracts text via pdf-parse v2,
 * and writes the plain text to stdout. Called by the /api/resumes/upload
 * route as a child process to avoid Next.js bundler issues with pdfjs-dist
 * worker resolution.
 *
 * Usage: echo <base64> | node lib/pdf-extract.cjs
 */

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const base64 = Buffer.concat(chunks).toString("utf8").trim();
  if (!base64) {
    process.stderr.write("No input received\n");
    process.exit(1);
  }

  const data = Buffer.from(base64, "base64");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  await parser.destroy();

  // Strip the trailing page separator pdf-parse adds ("-- N of M --")
  const text = result.text.replace(/\n*-- \d+ of \d+ --\n*/g, "\n").trim();
  process.stdout.write(text);
}

main().catch((err) => {
  process.stderr.write(err.message + "\n");
  process.exit(1);
});
