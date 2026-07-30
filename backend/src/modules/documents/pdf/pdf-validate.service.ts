import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';

export interface PdfValidationResult {
  valid: boolean;
  issues: string[];
  pageCount: number;
  checksum: string;
}

const PLACEHOLDER_MARKERS = [
  'TODO',
  'TBD',
  '[placeholder]',
  'sẽ bổ sung',
  'nội dung đang cập nhật',
];

@Injectable()
export class PdfValidationService {
  private readonly logger = new Logger(PdfValidationService.name);

  async validate(
    buffer: Buffer,
    options: { expectedTitle: string; requireAnswerKey: boolean },
  ): Promise<PdfValidationResult> {
    const issues: string[] = [];

    if (!buffer || buffer.length === 0) {
      return {
        valid: false,
        issues: ['File PDF rỗng.'],
        pageCount: 0,
        checksum: '',
      };
    }

    const header = buffer.subarray(0, 5).toString('latin1');
    if (header !== '%PDF-') {
      issues.push(
        'File không có magic bytes %PDF- hợp lệ (có thể là HTML đổi tên).',
      );
    }

    let text = '';
    let pageCount = 0;
    try {
      // See content-extraction.service.ts for why this imports the inner
      // lib file directly rather than the `pdf-parse` package root.
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const parsed = await pdfParse(buffer);
      text = parsed.text ?? '';
      pageCount = parsed.numpages ?? 0;
    } catch (error) {
      issues.push(
        `Không thể parse PDF: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (pageCount <= 0) issues.push('Số trang PDF không hợp lệ (<= 0).');
    if (pageCount > 1000) issues.push('Số trang PDF bất thường (quá lớn).');

    if (!text.trim()) {
      issues.push('Không trích xuất được text từ PDF.');
    } else {
      const normalizedTitle = options.expectedTitle.trim().toLowerCase();
      if (
        normalizedTitle &&
        !text.toLowerCase().includes(normalizedTitle.slice(0, 30))
      ) {
        issues.push('Nội dung PDF không chứa tiêu đề mong đợi.');
      }
      for (const marker of PLACEHOLDER_MARKERS) {
        if (text.toLowerCase().includes(marker.toLowerCase())) {
          issues.push(`PDF chứa placeholder: "${marker}"`);
        }
      }
      if (options.requireAnswerKey && !/đáp án|answer key/i.test(text)) {
        issues.push('PDF thiếu phần đáp án dù cấu hình yêu cầu có đáp án.');
      }
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');

    return { valid: issues.length === 0, issues, pageCount, checksum };
  }
}
