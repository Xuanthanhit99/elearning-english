import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Config } from '../../../../config/document-storage.config';
import {
  DocumentStorageService,
  ObjectMetadata,
  PresignedUpload,
  StoredObject,
  UploadPrivateFileInput,
} from '../document-storage.interface';

/**
 * Cloudflare R2 (S3-compatible) private object storage. The bucket is
 * never made public — every read goes through a short-lived presigned
 * GET URL created only after the caller has already passed the access
 * policy checks (see DocumentDownloadService). Nothing here ever returns
 * the bucket name, endpoint, or credentials to a caller.
 */
@Injectable()
export class R2DocumentStorageService
  implements DocumentStorageService, OnModuleInit
{
  private readonly logger = new Logger(R2DocumentStorageService.name);
  private client: S3Client;
  private bucket: string;

  onModuleInit() {
    const config = getR2Config();
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      this.logger.warn(
        'R2 storage credentials are incomplete — document uploads/downloads will fail until R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME are set.',
      );
    }
  }

  async uploadPrivateFile(
    input: UploadPrivateFileInput,
  ): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.storageKey,
        Body: input.body,
        ContentType: input.contentType,
        // Belt-and-suspenders: bucket ACLs on R2 default to private and
        // there is no bucket policy granting public read, but we also
        // never set an ACL that could make an individual object public.
        Metadata: { sha256: input.checksum },
      }),
    );

    return {
      storageKey: input.storageKey,
      size: input.body.length,
      checksum: input.checksum,
      contentType: input.contentType,
    };
  }

  async createPresignedDownloadUrl(
    storageKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async getObjectBuffer(storageKey: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    const body = result.Body;
    if (!body) throw new Error(`Empty object body for key ${storageKey}`);
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  createPresignedUploadUrl(): Promise<PresignedUpload> {
    // Direct browser->R2 presigned uploads are intentionally NOT
    // implemented: the Document Library requires server-side content
    // inspection (magic bytes, size, zip-bomb checks) BEFORE a file is
    // persisted, which a direct presigned PUT would bypass. All uploads
    // go through DocumentUploadService -> NestJS -> uploadPrivateFile().
    return Promise.reject(
      new Error(
        'Presigned direct uploads are disabled for documents; upload through the NestJS upload endpoint instead.',
      ),
    );
  }

  async headObject(storageKey: string): Promise<ObjectMetadata | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
      return {
        size: result.ContentLength ?? 0,
        contentType: result.ContentType ?? 'application/octet-stream',
        checksum: result.Metadata?.sha256,
        lastModified: result.LastModified,
      };
    } catch (error) {
      if (error instanceof NotFound) return null;
      const name = (error as { name?: string })?.name;
      if (name === 'NotFound' || name === 'NoSuchKey') return null;
      throw error;
    }
  }

  async objectExists(storageKey: string): Promise<boolean> {
    return (await this.headObject(storageKey)) !== null;
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${encodeURIComponent(sourceKey)}`,
        Key: destinationKey,
      }),
    );
  }

  async moveObject(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyObject(sourceKey, destinationKey);
    await this.deleteObject(sourceKey);
  }
}
