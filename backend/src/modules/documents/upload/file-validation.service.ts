import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
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

// Extension -> the set of MIME types `file-type` (magic-byte sniffing) is
// allowed to report for that extension. DOCX/PPTX/XLSX all share the
// generic "application/zip" magic signature, so file-type resolves them
// by inspecting the zip's internal manifest — we still cross-check its
// verdict against the extension the user claimed.
const EXTENSION_MIME_MAP: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
  pptx: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
  ],
  txt: ['text/plain'],
};

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
    if (!extension || !(extension in EXTENSION_MIME_MAP)) {
      throw new BadRequestException('Định dạng file không được hỗ trợ.');
    }

    const allowedMimeTypes = getDocumentAllowedMimeTypes();
    if (!allowedMimeTypes.includes(declaredMimeType)) {
      throw new BadRequestException('Loại file không được hỗ trợ.');
    }

    // Magic-byte sniff — never trust the client's declared MIME/extension
    // alone. `txt` has no reliable magic signature, so we fall back to a
    // printable-text heuristic instead of rejecting every .txt upload.
    if (extension === 'txt') {
      this.assertLooksLikeText(buffer);
    } else {
      const sniffed = await fileTypeFromBuffer(buffer);
      if (!sniffed) {
        throw new BadRequestException(
          'Không thể xác định định dạng thực của file (magic bytes không hợp lệ).',
        );
      }
      const allowedForExtension = EXTENSION_MIME_MAP[extension];
      if (!allowedForExtension.includes(sniffed.mime)) {
        throw new BadRequestException(
          `Nội dung file không khớp với phần mở rộng .${extension} (phát hiện: ${sniffed.mime}).`,
        );
      }
    }

    if (extension === 'docx' || extension === 'pptx') {
      this.assertSafeZipContainer(buffer);
    }

    if (extension === 'pdf') {
      this.assertSafePdfHeader(buffer);
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
   * over-large archives before anything downstream ever extracts them. */
  private assertSafeZipContainer(buffer: Buffer) {
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
  }
}
