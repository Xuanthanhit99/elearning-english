import { randomUUID } from 'node:crypto';

// Central storage-key builder — the ONLY place that should construct a
// document storage key, so the key layout stays consistent and every
// caller stays "inside the box" (no manual string concatenation that
// could drift into path traversal). Keys never contain the original
// filename verbatim — see sanitizeFileExtension.

const SAFE_EXTENSION = /^[a-z0-9]{1,10}$/i;

/** Only allow a short, alphanumeric extension through — strips anything
 * that looks like a double extension, path separator, or null byte. */
export function sanitizeFileExtension(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === originalName.length - 1) return '';
  const ext = originalName.slice(lastDot + 1).replace(/[^a-zA-Z0-9]/g, '');
  return SAFE_EXTENSION.test(ext) ? ext.toLowerCase() : '';
}

export const DocumentStorageKeys = {
  communitySource(documentId: string, versionNumber: number, ext: string) {
    return `documents/community/${documentId}/versions/${versionNumber}/source/${randomUUID()}${ext ? `.${ext}` : ''}`;
  },
  communityPreview(documentId: string, versionNumber: number) {
    return `documents/community/${documentId}/versions/${versionNumber}/preview/${randomUUID()}.pdf`;
  },
  communityExtracted(documentId: string, versionNumber: number) {
    return `documents/community/${documentId}/versions/${versionNumber}/extracted/content.json`;
  },
  communityCover(documentId: string, versionNumber: number, ext: string) {
    return `documents/community/${documentId}/versions/${versionNumber}/cover/${randomUUID()}${ext ? `.${ext}` : ''}`;
  },
  beaconvieSource(documentId: string, versionNumber: number) {
    return `documents/beaconvie/${documentId}/versions/${versionNumber}/source/content.json`;
  },
  beaconvieRender(documentId: string, versionNumber: number) {
    return `documents/beaconvie/${documentId}/versions/${versionNumber}/render/document.pdf`;
  },
  beaconviePreview(documentId: string, versionNumber: number) {
    return `documents/beaconvie/${documentId}/versions/${versionNumber}/preview/preview.pdf`;
  },
  beaconvieCover(documentId: string, versionNumber: number, ext: string) {
    return `documents/beaconvie/${documentId}/versions/${versionNumber}/cover/${randomUUID()}${ext ? `.${ext}` : ''}`;
  },
  temporaryUpload(userId: string, uploadId: string, ext: string) {
    return `documents/temporary/uploads/${userId}/${uploadId}/${randomUUID()}${ext ? `.${ext}` : ''}`;
  },
  temporaryGeneration(documentId: string, versionId: string, name: string) {
    return `documents/temporary/generations/${documentId}/${versionId}/${name}`;
  },
  temporaryRender(jobId: string, name: string) {
    return `documents/temporary/renders/${jobId}/${name}`;
  },
  archived(documentId: string, versionNumber: number, storageKey: string) {
    const fileName = storageKey.split('/').pop() ?? randomUUID();
    return `documents/archived/${documentId}/versions/${versionNumber}/${fileName}`;
  },
};
