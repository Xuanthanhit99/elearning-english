import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { getDocumentLocalStorageDir } from '../../../../config/document-storage.config';
import {
  DocumentStorageService,
  ObjectMetadata,
  PresignedUpload,
  StoredObject,
  UploadPrivateFileInput,
} from '../document-storage.interface';

/**
 * Local-development-only storage adapter. Writes under a directory that
 * is deliberately NOT inside `ServeStaticModule`'s served root (see
 * static-assets.config.ts) — files here are never served by
 * `express.static`, only through DocumentDownloadController's
 * authenticated streaming endpoint. Production must use R2
 * (DOCUMENT_STORAGE_PROVIDER=r2, the default) — see
 * document-storage.module.ts for the provider switch.
 */
@Injectable()
export class LocalDocumentStorageService implements DocumentStorageService {
  private readonly logger = new Logger(LocalDocumentStorageService.name);
  private readonly root = resolve(process.cwd(), getDocumentLocalStorageDir());

  constructor() {
    this.logger.warn(
      `Using LOCAL filesystem document storage at ${this.root} — this is a dev-only fallback and must not be used in production.`,
    );
  }

  private resolvePath(storageKey: string): string {
    const resolved = resolve(this.root, storageKey);
    const isInsideRoot =
      resolved === this.root || resolved.startsWith(this.root + sep);
    if (!isInsideRoot) {
      throw new Error(
        `Refusing to access storage key outside root: ${storageKey}`,
      );
    }
    return resolved;
  }

  async uploadPrivateFile(
    input: UploadPrivateFileInput,
  ): Promise<StoredObject> {
    const filePath = this.resolvePath(input.storageKey);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);
    return {
      storageKey: input.storageKey,
      size: input.body.length,
      checksum: input.checksum,
      contentType: input.contentType,
    };
  }

  async getObjectBuffer(storageKey: string): Promise<Buffer> {
    return readFile(this.resolvePath(storageKey));
  }

  createPresignedDownloadUrl(
    storageKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    // No real signer for local disk — encode an expiring token the
    // DocumentDownloadController can validate itself in dev mode. No
    // `await` inside, so this deliberately isn't declared `async` —
    // Promise.resolve still satisfies the interface's Promise<string>.
    const token = randomBytes(16).toString('hex');
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    return Promise.resolve(
      `local-signed://${encodeURIComponent(storageKey)}?token=${token}&expires=${expiresAt}`,
    );
  }

  createPresignedUploadUrl(): Promise<PresignedUpload> {
    return Promise.reject(
      new Error('Presigned direct uploads are not supported by local storage.'),
    );
  }

  async headObject(storageKey: string): Promise<ObjectMetadata | null> {
    try {
      const filePath = this.resolvePath(storageKey);
      const info = await stat(filePath);
      return {
        size: info.size,
        contentType: 'application/octet-stream',
        lastModified: info.mtime,
      };
    } catch {
      return null;
    }
  }

  objectExists(storageKey: string): Promise<boolean> {
    return Promise.resolve(existsSync(this.resolvePath(storageKey)));
  }

  async deleteObject(storageKey: string): Promise<void> {
    const filePath = this.resolvePath(storageKey);
    await rm(filePath, { force: true });
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    const source = this.resolvePath(sourceKey);
    const destination = this.resolvePath(destinationKey);
    await mkdir(dirname(destination), { recursive: true });
    const content = await readFile(source);
    await writeFile(destination, content);
  }

  async moveObject(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyObject(sourceKey, destinationKey);
    await this.deleteObject(sourceKey);
  }
}
