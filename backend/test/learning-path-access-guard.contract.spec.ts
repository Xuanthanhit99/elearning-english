/**
 * Isolated access-guard contract. This is NOT a JWT cryptographic verification
 * or full HTTP e2e test; those remain separate release gates.
 */
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { LearningPathAccessGuard } from '../src/modules/learning-path-access/learning-path-access.guard';
import { LearningPathAccessService } from '../src/modules/learning-path-access/learning-path-access.service';

describe('LearningPathAccessGuard — access contract', () => {
  const resolve = jest.fn();
  const guard = new LearningPathAccessGuard(
    { resolve } as unknown as LearningPathAccessService,
  );
  const context = (user?: Record<string, string>) => ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext);

  beforeEach(() => resolve.mockReset());

  it('denies missing authenticated identity without resolving access', async () => {
    await expect(guard.canActivate(context())).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('denies a user without Learning Path access', async () => {
    resolve.mockResolvedValue({ allowed: false, reason: 'PLACEMENT_REQUIRED' });
    await expect(guard.canActivate(context({ sub: 'qa-user-a' }))).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PLACEMENT_REQUIRED' }),
    });
    expect(resolve).toHaveBeenCalledWith('qa-user-a');
  });

  it('allows only when access resolver explicitly permits the user', async () => {
    resolve.mockResolvedValue({ allowed: true });
    await expect(guard.canActivate(context({ id: 'qa-user-b' }))).resolves.toBe(true);
    expect(resolve).toHaveBeenCalledWith('qa-user-b');
  });

  it('propagates access resolver errors instead of granting access', async () => {
    resolve.mockRejectedValue(new ForbiddenException('denied'));
    await expect(guard.canActivate(context({ userId: 'qa-user-c' })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
