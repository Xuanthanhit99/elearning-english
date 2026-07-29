import {
  assertDocumentTransition,
  assertVersionTransition,
  canTransitionDocumentStatus,
  canTransitionVersionStatus,
} from './document-status.state-machine';

describe('document status state machine', () => {
  it('allows DRAFT -> PROCESSING -> PENDING_ADMIN_REVIEW -> PUBLISHED', () => {
    expect(canTransitionDocumentStatus('DRAFT', 'PROCESSING')).toBe(true);
    expect(
      canTransitionDocumentStatus('PROCESSING', 'PENDING_ADMIN_REVIEW'),
    ).toBe(true);
    expect(
      canTransitionDocumentStatus('PENDING_ADMIN_REVIEW', 'APPROVED'),
    ).toBe(true);
    expect(canTransitionDocumentStatus('APPROVED', 'PUBLISHED')).toBe(true);
  });

  it('rejects skipping straight to PUBLISHED from DRAFT', () => {
    expect(canTransitionDocumentStatus('DRAFT', 'PUBLISHED')).toBe(false);
    expect(() => assertDocumentTransition('DRAFT', 'PUBLISHED')).toThrow();
  });

  it('rejects FAILED -> PUBLISHED', () => {
    expect(canTransitionDocumentStatus('FAILED', 'PUBLISHED')).toBe(false);
  });

  it('rejects GENERATING -> PUBLISHED for versions (spec §31)', () => {
    expect(canTransitionVersionStatus('GENERATING', 'PUBLISHED')).toBe(false);
    expect(() => assertVersionTransition('GENERATING', 'PUBLISHED')).toThrow();
  });

  it('only allows version PUBLISHED from APPROVED', () => {
    expect(canTransitionVersionStatus('APPROVED', 'PUBLISHED')).toBe(true);
    expect(canTransitionVersionStatus('READY_FOR_REVIEW', 'PUBLISHED')).toBe(
      false,
    );
    expect(canTransitionVersionStatus('VALIDATING', 'PUBLISHED')).toBe(false);
    expect(canTransitionVersionStatus('FAILED', 'PUBLISHED')).toBe(false);
  });

  it('allows a published version to move to ARCHIVED when superseded', () => {
    expect(canTransitionVersionStatus('PUBLISHED', 'ARCHIVED')).toBe(true);
  });

  it('treats same-status transitions as no-ops (idempotent)', () => {
    expect(canTransitionDocumentStatus('PUBLISHED', 'PUBLISHED')).toBe(true);
    expect(canTransitionVersionStatus('PUBLISHED', 'PUBLISHED')).toBe(true);
  });

  it('does not allow REMOVED to transition anywhere', () => {
    expect(canTransitionDocumentStatus('REMOVED', 'PUBLISHED')).toBe(false);
    expect(canTransitionDocumentStatus('REMOVED', 'DRAFT')).toBe(false);
  });
});
