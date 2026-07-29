// Provider-neutral private file storage abstraction for the Document
// Library. Production uses Cloudflare R2 (S3-compatible, see
// R2DocumentStorageService); local development can use a filesystem
// adapter. Nothing in the rest of the documents module should import an
// S3 SDK type or a provider class directly — only this interface and the
// DOCUMENT_STORAGE_SERVICE token from document-storage.module.ts.

export interface StoredObject {
  storageKey: string;
  size: number;
  checksum: string;
  contentType: string;
}

export interface ObjectMetadata {
  size: number;
  contentType: string;
  checksum?: string;
  lastModified?: Date;
}

export interface UploadPrivateFileInput {
  storageKey: string;
  body: Buffer;
  contentType: string;
  /** SHA-256 hex checksum of `body`, computed by the caller so every
   * provider stores/returns the same value regardless of how the
   * underlying service computes (or doesn't compute) its own ETag. */
  checksum: string;
}

export interface PresignedUpload {
  url: string;
  storageKey: string;
  expiresInSeconds: number;
  /** Extra fields/headers the client must send with the PUT/POST, if any. */
  fields?: Record<string, string>;
}

export interface CreatePresignedUploadInput {
  storageKey: string;
  contentType: string;
  expiresInSeconds?: number;
}

/**
 * DocumentStorageService — implemented by R2DocumentStorageService
 * (production) and LocalDocumentStorageService (dev fallback when R2
 * credentials are not configured). Every method operates on a
 * `storageKey` (never a public URL) — callers must never expose a
 * storageKey, bucket name, endpoint, or credential to a client response.
 */
export interface DocumentStorageService {
  uploadPrivateFile(input: UploadPrivateFileInput): Promise<StoredObject>;
  /** Server-side-only raw read (BullMQ processors: file scanning, text
   * extraction, PDF rendering input). NEVER call this from a controller
   * response path — client-facing reads always go through
   * createPresignedDownloadUrl(). */
  getObjectBuffer(storageKey: string): Promise<Buffer>;
  createPresignedDownloadUrl(
    storageKey: string,
    expiresInSeconds: number,
  ): Promise<string>;
  createPresignedUploadUrl?(
    input: CreatePresignedUploadInput,
  ): Promise<PresignedUpload>;
  headObject(storageKey: string): Promise<ObjectMetadata | null>;
  deleteObject(storageKey: string): Promise<void>;
  copyObject(sourceKey: string, destinationKey: string): Promise<void>;
  moveObject(sourceKey: string, destinationKey: string): Promise<void>;
  objectExists(storageKey: string): Promise<boolean>;
}

export const DOCUMENT_STORAGE_SERVICE = Symbol('DOCUMENT_STORAGE_SERVICE');
