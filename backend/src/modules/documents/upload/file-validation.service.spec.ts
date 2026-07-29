import { BadRequestException } from '@nestjs/common';
import { FileValidationService } from './file-validation.service';

describe('FileValidationService', () => {
  const service = new FileValidationService();

  it('rejects an empty file', async () => {
    await expect(
      service.validate({
        buffer: Buffer.alloc(0),
        originalName: 'a.pdf',
        declaredMimeType: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a file over the configured size limit', async () => {
    const oversized = Buffer.alloc(30 * 1024 * 1024, 1); // 30MB > default 25MB limit
    await expect(
      service.validate({
        buffer: oversized,
        originalName: 'a.pdf',
        declaredMimeType: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an unsupported extension', async () => {
    await expect(
      service.validate({
        buffer: Buffer.from('hi'),
        originalName: 'a.exe',
        declaredMimeType: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a double extension trying to smuggle an unsupported type (resume.pdf.exe)', async () => {
    await expect(
      service.validate({
        buffer: Buffer.from('%PDF-1.4'),
        originalName: 'resume.pdf.exe',
        declaredMimeType: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a declared MIME type outside the allowed list', async () => {
    await expect(
      service.validate({
        buffer: Buffer.from('%PDF-1.4'),
        originalName: 'a.pdf',
        declaredMimeType: 'application/x-msdownload',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a PDF-extension file whose magic bytes are not a real PDF (extension spoofing)', async () => {
    const fakeBuffer = Buffer.from(
      'this is actually just plain text, not a pdf',
    );
    await expect(
      service.validate({
        buffer: fakeBuffer,
        originalName: 'fake.pdf',
        declaredMimeType: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a real PDF whose magic bytes match its extension and declared MIME', async () => {
    // Minimal-but-valid PDF magic header is enough for file-type/our own
    // header check; full structural PDF validity is checked later by
    // PdfValidationService for GENERATED documents, not at upload time.
    const buffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(100, 0x20),
    ]);
    const result = await service.validate({
      buffer,
      originalName: 'real.pdf',
      declaredMimeType: 'application/pdf',
    });
    expect(result.extension).toBe('pdf');
    expect(result.checksum).toHaveLength(64);
  });

  it('accepts a plain .txt file', async () => {
    const buffer = Buffer.from('Hello, this is a plain text English lesson.');
    const result = await service.validate({
      buffer,
      originalName: 'lesson.txt',
      declaredMimeType: 'text/plain',
    });
    expect(result.extension).toBe('txt');
  });

  it('rejects a .txt file containing binary/null-byte data (mislabeled binary)', async () => {
    const buffer = Buffer.from([0x48, 0x65, 0x00, 0x6c, 0x6f]);
    await expect(
      service.validate({
        buffer,
        originalName: 'lesson.txt',
        declaredMimeType: 'text/plain',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('produces a deterministic sha256 checksum for identical content', async () => {
    const buffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(20, 0x20),
    ]);
    const first = await service.validate({
      buffer,
      originalName: 'a.pdf',
      declaredMimeType: 'application/pdf',
    });
    const second = await service.validate({
      buffer,
      originalName: 'b.pdf',
      declaredMimeType: 'application/pdf',
    });
    expect(first.checksum).toBe(second.checksum);
  });
});
