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
      // pdf-parse ships a CJS default export; dynamic import keeps this
      // module tree-shakeable and avoids pulling its debug test-harness
      // (which reads a local fixture path on require) into every request.
      const pdfParse = (await import('pdf-parse')).default;
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
