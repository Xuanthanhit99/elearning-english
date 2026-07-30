import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import {
  getDocumentAllowedMimeTypes,
  getDocumentMaxFileSizeMb,
} from '../../../config/document-storage.config';

export interface FileValidationResult {
  extension: string;
  mimeType: string;
  size: number;
  checksum: string;
}

const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx', 'pptx', 'txt']);

const ZIP_MAX_ENTRIES = 2000;
// Guards against a zip bomb: a tiny DOCX/PPTX whose entries decompress to
// an enormous total size. 300x the compressed size is generous headroom
// for normal Office XML (which is already fairly compressed) while still
// catching pathological ratios (real zip bombs are usually 1000x+).
const ZIP_MAX_COMPRESSION_RATIO = 300;
const ZIP_MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;

@Injectable()
export class FileValidationService {
  private readonly logger = new Logger(FileValidationService.name);

  // Must stay `async` even though every check inside is now synchronous
  // (magic-byte checks no longer need the ESM-only `file-type` package —
  // see assertOfficeOpenXml): dropping `async` turns every validation
  // failure into a SYNCHRONOUS throw instead of a rejected Promise,
  // which breaks every `await expect(this.fileValidation.validate(...))
  // .rejects.toThrow(...)` call site (the throw happens while
  // evaluating the argument, before `expect()` ever runs) — confirmed by
  // the test suite regressing when this was tried.
  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(input: {
    buffer: Buffer;
    originalName: string;
    declaredMimeType: string;
  }): Promise<FileValidationResult> {
    const { buffer, originalName, declaredMimeType } = input;

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Tệp tải lên trống.');
    }

    const maxBytes = getDocumentMaxFileSizeMb() * 1024 * 1024;
    if (buffer.length > maxBytes) {
      throw new BadRequestException(
        `Tệp vượt quá dung lượng tối đa ${getDocumentMaxFileSizeMb()}MB.`,
      );
    }

    const extension = this.extractSafeExtension(originalName);
    if (!extension || !SUPPORTED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Định dạng file không được hỗ trợ.');
    }

    const allowedMimeTypes = getDocumentAllowedMimeTypes();
    if (!allowedMimeTypes.includes(declaredMimeType)) {
      throw new BadRequestException('Loại file không được hỗ trợ.');
    }

    // Magic-byte / structural sniff — never trust the client's declared
    // MIME/extension alone. Each branch verifies the file is genuinely
    // what its extension claims, not just "some zip" or "some text".
    // (No generic magic-byte-sniffing library is used here: for
    // DOCX/PPTX specifically, off-the-shelf sniffers only resolve as far
    // as "application/zip" — checking for the format-specific manifest
    // entry below is strictly more precise.)
    if (extension === 'pdf') {
      this.assertSafePdfHeader(buffer);
    } else if (extension === 'docx') {
      this.assertOfficeOpenXml(buffer, 'word/document.xml', 'DOCX');
    } else if (extension === 'pptx') {
      this.assertOfficeOpenXml(buffer, 'ppt/presentation.xml', 'PPTX');
    } else if (extension === 'txt') {
      this.assertLooksLikeText(buffer);
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');

    return {
      extension,
      mimeType: declaredMimeType,
      size: buffer.length,
      checksum,
    };
  }

  /** Only allows a short trailing alphanumeric extension through — rejects
   * double extensions (e.g. `resume.pdf.exe`) by checking the LAST
   * segment only ever resolves to one of our known types, and rejects
   * path-traversal/null-byte tricks by stripping anything that isn't a
   * plain filename first. */
  private extractSafeExtension(originalName: string): string | null {
    const base = originalName.replace(/^.*[\\/]/, '').replace(/\0/g, '');
    const match = /\.([a-zA-Z0-9]{1,10})$/.exec(base);
    if (!match) return null;
    return match[1].toLowerCase();
  }

  private assertLooksLikeText(buffer: Buffer) {
    const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
    let suspicious = 0;
    for (const byte of sample) {
      if (byte === 0) {
        throw new BadRequestException(
          'File .txt chứa dữ liệu nhị phân không hợp lệ.',
        );
      }
      if (byte < 9 || (byte > 13 && byte < 32)) suspicious++;
    }
    if (suspicious / sample.length > 0.05) {
      throw new BadRequestException(
        'File .txt chứa dữ liệu nhị phân không hợp lệ.',
      );
    }
  }

  private assertSafePdfHeader(buffer: Buffer) {
    const header = buffer.subarray(0, 5).toString('latin1');
    if (header !== '%PDF-') {
      throw new BadRequestException(
        'File PDF không hợp lệ (thiếu magic bytes %PDF-).',
      );
    }
  }

  /** DOCX/PPTX are zip containers — guard against zip bombs and
   * over-large archives before anything downstream ever extracts them.
   * Returns the parsed entries so callers can additionally check for a
   * format-specific manifest entry (see assertOfficeOpenXml). */
  private assertSafeZipContainer(buffer: Buffer) {
    // ZIP local-file-header magic bytes ("PK\x03\x04"). DOCX/PPTX are
    // always standard zip archives — this is the real first-line check,
    // ahead of ever asking AdmZip to parse untrusted bytes.
    if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
      throw new BadRequestException(
        'File DOCX/PPTX không hợp lệ (thiếu magic bytes ZIP).',
      );
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      throw new BadRequestException(
        'File DOCX/PPTX bị hỏng hoặc không hợp lệ.',
      );
    }

    const entries = zip.getEntries();
    if (entries.length === 0) {
      throw new BadRequestException('File DOCX/PPTX không có nội dung.');
    }
    if (entries.length > ZIP_MAX_ENTRIES) {
      throw new BadRequestException(
        'File DOCX/PPTX có quá nhiều thành phần bên trong.',
      );
    }

    let totalUncompressed = 0;
    for (const entry of entries) {
      const name = entry.entryName;
      if (
        name.includes('..') ||
        name.startsWith('/') ||
        name.startsWith('\\')
      ) {
        throw new BadRequestException(
          'File DOCX/PPTX chứa đường dẫn không an toàn.',
        );
      }
      totalUncompressed += entry.header.size;
    }

    if (totalUncompressed > ZIP_MAX_UNCOMPRESSED_BYTES) {
      throw new BadRequestException(
        'File DOCX/PPTX giải nén vượt quá giới hạn an toàn.',
      );
    }

    const ratio = buffer.length > 0 ? totalUncompressed / buffer.length : 0;
    if (ratio > ZIP_MAX_COMPRESSION_RATIO) {
      this.logger.warn(
        `Rejected DOCX/PPTX upload: suspicious compression ratio ${ratio.toFixed(1)}x`,
      );
      throw new BadRequestException(
        'File DOCX/PPTX có tỉ lệ nén bất thường (nghi ngờ zip bomb).',
      );
    }

    // DOCX/PPTX don't execute macros on their own — real risk is VBA
    // macro-enabled variants (.docm/.pptm, rejected by extension already)
    // or embedded OLE objects. Flag (don't silently strip) any embedded
    // OLE package so the moderation stage can weigh it; we never execute
    // or auto-open embedded content ourselves.
    const hasEmbeddedOle = entries.some(
      (entry) =>
        entry.entryName.startsWith('word/embeddings/') ||
        entry.entryName.startsWith('ppt/embeddings/'),
    );
    if (hasEmbeddedOle) {
      this.logger.warn(
        'DOCX/PPTX upload contains embedded OLE objects — flagged for review.',
      );
    }

    return entries;
  }

  /** DOCX and PPTX are both zip containers, distinguished only by which
   * manifest entry they contain — requiring the format-specific entry
   * catches a plain-zip-renamed-to-.docx trick that magic bytes alone
   * (identical for any zip) can't. */
  private assertOfficeOpenXml(
    buffer: Buffer,
    requiredEntry: string,
    label: 'DOCX' | 'PPTX',
  ) {
    const entries = this.assertSafeZipContainer(buffer);
    const hasRequiredEntry = entries.some(
      (entry) => entry.entryName === requiredEntry,
    );
    if (!hasRequiredEntry) {
      throw new BadRequestException(
        `Nội dung file không khớp với định dạng ${label} (thiếu ${requiredEntry}).`,
      );
    }
  }
}
