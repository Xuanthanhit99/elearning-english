import { ForbiddenException } from '@nestjs/common';
import { DocumentVersionStatus, LearningDocumentStatus } from '@prisma/client';

/**
 * Single source of truth for valid LearningDocument.status transitions
 * (spec §31). No service should write `status` via a raw Prisma
 * `update({ data: { status: X } })` — always go through
 * `assertDocumentTransition` first so an invalid jump (e.g.
 * DRAFT -> PUBLISHED, skipping every validation step) fails loudly
 * instead of silently corrupting state.
 */
const DOCUMENT_TRANSITIONS: Record<
  LearningDocumentStatus,
  LearningDocumentStatus[]
> = {
  DRAFT: ['UPLOADING', 'PROCESSING', 'REMOVED'],
  UPLOADING: ['PROCESSING', 'FAILED', 'REMOVED'],
  PROCESSING: ['AI_REVIEWING', 'PENDING_ADMIN_REVIEW', 'FAILED', 'REMOVED'],
  AI_REVIEWING: ['PENDING_ADMIN_REVIEW', 'REJECTED', 'FAILED'],
  PENDING_ADMIN_REVIEW: [
    'APPROVED',
    'REJECTED',
    'CHANGES_REQUESTED',
    'HIDDEN',
    'REMOVED',
  ],
  CHANGES_REQUESTED: ['PROCESSING', 'UPLOADING', 'REMOVED'],
  APPROVED: ['PUBLISHED', 'REJECTED', 'REMOVED'],
  PUBLISHED: ['HIDDEN', 'REMOVED', 'PROCESSING'],
  REJECTED: ['PROCESSING', 'UPLOADING', 'REMOVED'],
  HIDDEN: ['PUBLISHED', 'REMOVED'],
  REMOVED: [],
  FAILED: ['PROCESSING', 'UPLOADING', 'REMOVED'],
};

export function canTransitionDocumentStatus(
  from: LearningDocumentStatus,
  to: LearningDocumentStatus,
): boolean {
  if (from === to) return true;
  return DOCUMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertDocumentTransition(
  from: LearningDocumentStatus,
  to: LearningDocumentStatus,
): void {
  if (!canTransitionDocumentStatus(from, to)) {
    throw new ForbiddenException(
      `Invalid document status transition: ${from} -> ${to}`,
    );
  }
}

/**
 * LearningDocumentVersion.status transitions (spec §31). PUBLISHED is
 * only reachable from APPROVED — never directly from GENERATING/
 * PROCESSING/VALIDATING/FAILED/DRAFT — which is what guarantees a
 * version can't go live until it has passed content validation, PDF
 * validation (if applicable), and admin approval.
 */
const VERSION_TRANSITIONS: Record<
  DocumentVersionStatus,
  DocumentVersionStatus[]
> = {
  DRAFT: ['GENERATING', 'PROCESSING', 'FAILED', 'ARCHIVED'],
  GENERATING: ['VALIDATING', 'PROCESSING', 'FAILED'],
  PROCESSING: ['VALIDATING', 'GENERATING', 'FAILED'],
  VALIDATING: ['READY_FOR_REVIEW', 'FAILED'],
  READY_FOR_REVIEW: ['APPROVED', 'REJECTED', 'FAILED'],
  APPROVED: ['PUBLISHED', 'REJECTED'],
  PUBLISHED: ['ARCHIVED'],
  REJECTED: ['GENERATING', 'PROCESSING', 'ARCHIVED'],
  FAILED: ['GENERATING', 'PROCESSING', 'ARCHIVED'],
  ARCHIVED: [],
};

export function canTransitionVersionStatus(
  from: DocumentVersionStatus,
  to: DocumentVersionStatus,
): boolean {
  if (from === to) return true;
  return VERSION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertVersionTransition(
  from: DocumentVersionStatus,
  to: DocumentVersionStatus,
): void {
  if (!canTransitionVersionStatus(from, to)) {
    throw new ForbiddenException(
      `Invalid document version status transition: ${from} -> ${to}`,
    );
  }
}

/** Statuses under which a document is visible/servable to the public. */
export const PUBLIC_VISIBLE_DOCUMENT_STATUSES: LearningDocumentStatus[] = [
  'PUBLISHED',
];

/** Statuses under which a document's active version file may be
 * downloaded — deliberately narrower than "visible", since a document
 * can be PUBLISHED with allowDownload=false. */
export const DOWNLOADABLE_VERSION_STATUSES: DocumentVersionStatus[] = [
  'PUBLISHED',
];
