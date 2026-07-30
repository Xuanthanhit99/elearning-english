// `pdf-parse` (v1.1.1) ships no types for its inner `lib/pdf-parse.js`
// file — only the package root has a (buggy, see content-extraction
// .service.ts) index.js. We import this inner file directly to avoid
// that bug, which otherwise leaves the import typed `any`.
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }

  function pdfParse(
    buffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;

  export default pdfParse;
}
