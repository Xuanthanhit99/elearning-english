# API Audit Batch 01 — Auth, Courses, Learning Path

Source: main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d. Controller-level static inspection only; 8 controller files, 47 route declarations. Endpoint paths are controller-relative; global prefix not confirmed. JWT/role guards are present where observed; method-level effective authorization, DTO validation, service-level ownership, web/mobile consumers and runtime tests remain unverified.

| Controller | Routes (method path) | DTO references | Guards/ownership evidence |
|---|---|---|---|
| auth/auth.controller.ts (auth) | POST bootstrap-admin,register,login,refresh,logout,forgot-password,reset-password,change-password,verify-email,resend-verification,export-report-email,jobs/generate-weekly-pool; GET me,teacher-test,google,google/callback,facebook,facebook/callback,check-username; PATCH me/profile,me/avatar | RegisterDto,LoginDto,ForgotPasswordDto,ResetPasswordDto,ChangePasswordDto,VerifyEmailDto,UpdateProfileDto | JwtAuthGuard, ThrottlerGuard, RolesGuard, OAuth guards; req.user.id forwarded for profile and selected methods. Inspect bootstrap-admin and job privileges. |
| auth/two-factor.controller.ts (auth/2fa) | POST setup,confirm,disable | ConfirmTwoFactorDto,DisableTwoFactorDto | JwtAuthGuard,ThrottlerGuard; @CurrentUser('id') forwarded to AuthTwoFactorService. |
| courses/courses.controller.ts (courses) | POST root; GET my-courses,:id,public/list,public/:slug,admin/pending; PATCH :id,:id/submit,:id/approve,:id/reject; DELETE :id | CreateCourseDto (other inline types need inspection) | JwtAuthGuard+RolesGuard for protected methods, ADMIN/TEACHER roles; req.user forwarded to CoursesService; ownership within service unverified. |
| enrollments/enrollments.controller.ts (enrollments) | POST free/:courseId; GET my-courses,check/:courseId | no DTO class found | JwtAuthGuard; req.user.id forwarded to EnrollmentsService. |
| learning-path/learning-path.controller.ts (learning-path) | GET root,lessons/:lessonId/resume; POST visual-fixture,lessons/:lessonId/start,lessons/:lessonId/complete | no DTO class found | JwtAuthGuard,LearningPathAccessGuard; user ID resolved from id/userId/sub; visual-fixture requires environment/role audit. |
| learning-path-access/learning-path-access.controller.ts (learning-path) | GET access | no DTO class found | JwtAuthGuard; resolves authenticated user ID. |
| learning/learning.controller.ts (learning) | GET lessons/:lessonId | no DTO class found | JwtAuthGuard; forwards req.user.id to LearningService. |
| lessons/lessons.controller.ts (root) | POST sections/:sectionId/lessons; PATCH lessons/:id; DELETE lessons/:id | CreateLessonDto,UpdateLessonDto | JwtAuthGuard+RolesGuard, ADMIN/TEACHER; req.user forwarded to LessonsService. |

## Risk / acceptance follow-up
1. Validate production access to bootstrap-admin and visual-fixture, with tests for non-admin and anonymous users.
2. Verify Course/Lesson mutation ownership inside services, not just role guard.
3. Verify Learning Path completion idempotency, enrollment entitlement and XP reward uniqueness.
4. Confirm refresh token rotation, 2FA abuse controls and session invalidation.
5. Map all DTO schemas, service calls, exact route prefix and Web/Expo consumers.
6. Run local API authz tests (401/403/owner/outsider), preserve DB state; no GitHub Actions rerun.

Progress: 16 of 74 controller files have route declarations reviewed across prior and current batches. 58 controller files remain. No production QA claims.
