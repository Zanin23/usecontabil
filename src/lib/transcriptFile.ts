/** Extracts plain text from an uploaded transcript/notes file.
 *  Supports .txt, .md (read as text) and .pdf (parsed via pdfjs-dist, lazy-loaded). */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return await extractPdfText(file);
  }
  // txt / md / anything text-shaped
  return await file.text();
}

async function extractPdfText(file: File): Promise<string> {
  // Dynamic import so pdfjs only loads on the create page.
  const pdfjs = await import("pdfjs-dist");
  // Vite-friendly worker URL
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default as string;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    parts.push(text);
  }
  return parts.join("\n\n").trim();
}