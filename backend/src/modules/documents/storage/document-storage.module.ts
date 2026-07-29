import { Module } from '@nestjs/common';
import { getDocumentStorageProvider } from '../../../config/document-storage.config';
import { DOCUMENT_STORAGE_SERVICE } from './document-storage.interface';
import { R2DocumentStorageService } from './providers/r2-document-storage.service';
import { LocalDocumentStorageService } from './providers/local-document-storage.service';

@Module({
  providers: [
    R2DocumentStorageService,
    LocalDocumentStorageService,
    {
      provide: DOCUMENT_STORAGE_SERVICE,
      useFactory: (
        r2: R2DocumentStorageService,
        local: LocalDocumentStorageService,
      ) => (getDocumentStorageProvider() === 'local' ? local : r2),
      inject: [R2DocumentStorageService, LocalDocumentStorageService],
    },
  ],
  exports: [DOCUMENT_STORAGE_SERVICE, LocalDocumentStorageService],
})
export class DocumentStorageModule {}
