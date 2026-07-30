import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import mammoth from 'mammoth';
import { getDocumentMaxExtractedCharacters } from '../../../config/document-storage.config';

export interface ExtractedContent {
  text: string;
  pageCount: number | null;
  truncated: boolean;
}

@Injectable()
export class ContentExtractionService {
  private readonly logger = new Logger(ContentExtractionService.name);

  async extract(buffer: Buffer, extension: string): Promise<ExtractedContent> {
    switch (extension) {
      case 'pdf':
        return this.extractPdf(buffer);
      case 'docx':
        return this.extractDocx(buffer);
      case 'pptx':
        return this.extractPptx(buffer);
      case 'txt':
        return this.extractTxt(buffer);
      default:
        return { text: '', pageCount: null, truncated: false };
    }
  }

  private cap(text: string): { text: string; truncated: boolean } {
    const max = getDocumentMaxExtractedCharacters();
    if (text.length <= max) return { text, truncated: false };
    return { text: text.slice(0, max), truncated: true };
  }

  private async extractPdf(buffer: Buffer): Promise<ExtractedContent> {
    try {
      // Import the inner lib file directly, NOT the `pdf-parse` package
      // root. Confirmed via real E2E testing: pdf-parse@1.1.1's
      // index.js re-export runs `let isDebugMode = !module.parent;` —
      // under dynamic `import()`, `module.parent` resolves falsy even
      // though this isn't the entry module, so it incorrectly triggers
      // pdf-parse's own internal self-test (which tries to read a
      // fixture file that doesn't exist outside its repo, e.g.
      // "ENOENT ... ./test/data/05-versions-space.pdf") on every call.
      // lib/pdf-parse.js has no such debug branch.
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const result = await pdfParse(buffer);
      const { text, truncated } = this.cap(result.text ?? '');
      return { text, pageCount: result.numpages ?? null, truncated };
    } catch (error) {
      this.logger.error(
        `PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { text: '', pageCount: null, truncated: false };
    }
  }

  private async extractDocx(buffer: Buffer): Promise<ExtractedContent> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const { text, truncated } = this.cap(result.value ?? '');
      // DOCX has no reliable page count without a full layout engine —
      // approximate using a conservative chars-per-page heuristic so the
      // page-count limit check still has a signal to work with.
      const pageCount = Math.max(1, Math.ceil(text.length / 3000));
      return { text, pageCount, truncated };
    } catch (error) {
      this.logger.error(
        `DOCX extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { text: '', pageCount: null, truncated: false };
    }
  }

  // PPTX slide-text extraction is synchronous zip/XML parsing under the
  // hood, but stays `async` to match the shared `extract()` dispatch
  // signature alongside the genuinely-async PDF/DOCX branches.
  // eslint-disable-next-line @typescript-eslint/require-await
  private async extractPptx(buffer: Buffer): Promise<ExtractedContent> {
    try {
      const zip = new AdmZip(buffer);
      const slideEntries = zip
        .getEntries()
        .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .sort((a, b) => {
          const na = Number(a.entryName.match(/slide(\d+)\.xml/)?.[1] ?? 0);
          const nb = Number(b.entryName.match(/slide(\d+)\.xml/)?.[1] ?? 0);
          return na - nb;
        });

      const texts = slideEntries.map((entry) => {
        const xml = entry.getData().toString('utf-8');
        const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)];
        return matches.map((m) => m[1]).join(' ');
      });

      const { text, truncated } = this.cap(texts.join('\n\n'));
      return { text, pageCount: slideEntries.length, truncated };
    } catch (error) {
      this.logger.error(
        `PPTX extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { text: '', pageCount: null, truncated: false };
    }
  }

  private extractTxt(buffer: Buffer): ExtractedContent {
    const raw = buffer.toString('utf-8');
    const { text, truncated } = this.cap(raw);
    const pageCount = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pageCount, truncated };
  }
}
