import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLE_KEY } from '../decorators/roles.decorator';
import { ListeningJobController } from '../../modules/listening-job/listening-job.controller';

/*
 * UNVERIFIED (Stage 6D.1): không chạy được `npm test` trong sandbox này
 * (môi trường hết dung lượng đĩa, xem
 * docs/phase1-stage6d1-listening-verification-report.md). Test không
 * phụ thuộc DB/HTTP thật — chỉ dùng Reflector thật + metadata thật đọc
 * trực tiếp từ ListeningJobController — nhưng vẫn cần chạy thật để xác
 * nhận PASS trước khi coi là đã verify.
 *
 * Mục tiêu: xác minh CHỨC NĂNG THẬT của guard (không chỉ việc decorator
 * @Roles(UserRole.ADMIN) có tồn tại trong source), theo đúng yêu cầu
 * "Không chỉ kiểm tra annotation tồn tại; phải kiểm tra guard thật sự
 * hoạt động" của Chặng 6D.1.
 */
describe('RolesGuard trên ListeningJobController (fix bảo mật admin endpoint)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function buildContext(role: UserRole | undefined): ExecutionContext {
    return {
      getHandler: () => ListeningJobController.prototype.generate,
      getClass: () => ListeningJobController,
      switchToHttp: () => ({
        getRequest: () => (role ? { user: { role } } : { user: undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  it('metadata @Roles thật sự đọc được từ ListeningJobController và đúng là ADMIN', () => {
    const roles = reflector.getAllAndOverride<UserRole[]>(ROLE_KEY, [
      ListeningJobController.prototype.generate,
      ListeningJobController,
    ]);

    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it('user STUDENT bị từ chối (canActivate = false -> Nest trả 403)', () => {
    expect(guard.canActivate(buildContext(UserRole.STUDENT))).toBe(false);
  });

  it('user TEACHER bị từ chối (canActivate = false -> Nest trả 403)', () => {
    expect(guard.canActivate(buildContext(UserRole.TEACHER))).toBe(false);
  });

  it('user ADMIN được phép (canActivate = true)', () => {
    expect(guard.canActivate(buildContext(UserRole.ADMIN))).toBe(true);
  });

  it('request không có user (trường hợp JwtAuthGuard lẽ ra phải chặn trước) không throw, trả false an toàn', () => {
    expect(() => guard.canActivate(buildContext(undefined))).not.toThrow();
    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });

  it('route KHÔNG có @Roles vẫn cho qua (hành vi mặc định của RolesGuard, không đổi)', () => {
    const context = {
      getHandler: () => function noRolesHandler() {},
      getClass: () => class NoRolesController {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.STUDENT } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
