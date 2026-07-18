import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    /*
     * Stage 6D.1: user.role có thể undefined nếu guard này vô tình
     * được dùng mà không có JwtAuthGuard đứng trước (request.user chưa
     * được set) — trước đây `user.role` sẽ throw TypeError (500) thay
     * vì từ chối rõ ràng (403). Dùng optional chaining để luôn trả
     * false an toàn thay vì crash.
     */
    return Boolean(user?.role) && requiredRoles.includes(user.role);
  }
}
