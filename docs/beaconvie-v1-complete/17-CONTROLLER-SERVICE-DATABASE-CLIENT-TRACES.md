# Deep Trace 01 — Controller → Service → Database → Client

Pinned source: main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d. Source-only findings; no runtime tests or security exploit asserted.

## Payment / order / enrollment
- Backend POST orders/courses/:courseId (orders.controller.ts lines 18–24) passes req.user.id to OrdersService.createOrder; orders.service.ts lines 17,30,39,68 checks enrollment and creates free enrollment or paid Order. GET orders/my passes req.user.id and filters userId (orders.service.ts lines 87–90).
- POST payments/orders/:orderId/vnpay (payments.controller.ts lines 19–27) has JWT guard, **but only orderId and IP forwarded**, not req.user.id. PaymentsService.createVnpayUrl(orderId,ipAddr) (line 28) reads Order (line 29). Owner verification cannot be inferred from this call; owner/outsider test is mandatory.
- GET payments/vnpay-return (controller lines 30–32) invokes PaymentsService.handleVnpayReturn (line 86), processes secure hash (lines 89–92) and response code (line 110). On success, separate Prisma order.update (line 121) and enrollment.upsert (line 128), plus notification (line 147); coupon.update (line 163) and failed order.update (line 175) appear in other branches. No atomic transaction observed in this path. Verify amount/currency/merchant match, trusted server callback, replay protection and failed/coupon semantics.
- PaymentsService spec inspected: only a service-defined smoke test (describe at line 4, it should be defined at line 15). No payment security E2E evidence in that file.
- Tree search for provider-named payment files identified only payments module; **does not establish absence** of other providers or international gateway; config, dependencies, DB and historical records still need review.

## Analytics / AI Coach
- analytics.controller.ts class JwtAuthGuard (lines 33–34), GET analytics/overview etc. getUserId(req) passed to AnalyticsService (line 50), skills (line 61), activity (line 87), metrics (line 98), timeline (line 109), reports (lines 153,163,176). GET analytics/coach has ThrottlerGuard 10/min (lines 134–136).
- AiCoachService getCoachAdvice (line 87) gathers user-specific overview, radar, weaknesses and dashboard (lines 109–115), calls Gemini.generateJson (line 138), and has fallback/cache paths. WeaknessDetectionService queries per-user across six skills with MIN_ATTEMPTS=2. No calibration benchmark confirmed.
- Web consumer: english-web-build/src/lib/analytics-api.ts calls /analytics/overview (line 101), /analytics/activity (line 118), /analytics/metrics (line 164), /analytics/timeline (line 191), /analytics/radar (line 215), /analytics/weaknesses (line 237), /analytics/coach (lines 263,271). Source comment warns about concurrent coach calls and duplicate Gemini cost (line 256); verify actual in-flight deduplication.

## Learning Path / Web
- Backend learning-path controller forwards authenticated user ID into LearningPathService for start/resume/complete; LearningPathAccessGuard observed.
- Web consumer english-web-build/src/lib/learning-path-api.ts calls GET /learning-path (line 152), POST /learning-path/lessons/:lessonId/start (line 161), GET /learning-path/lessons/:lessonId/resume (line 172), POST /learning-path/lessons/:lessonId/complete (line 180). Need inspect service DB mutations and idempotency for XP/progress.

## Expo Mobile
- app/mobile/src/lib/api/client.ts has fetch-based API wrapper (line 15), exported apiClient (line 94), but no route-consumer proof in examined Home.
- app/mobile/src/app/(tabs)/index.tsx contains static 12, 72% and 120 progress/XP display (lines 31,58,91), and console.log('Continue learning') (line 64). Learn tab placeholder exists. Live journey and device QA BLOCKED.

## Acceptance gate status
| Gate | Source trace | Remaining proof |
|---|---|---|
| Order ownership | BLOCKED: no userId forwarded into createVnpayUrl | owner/outsider negative test and service fix design |
| Settlement atomicity | BLOCKED: separate Prisma mutations | signed provider confirmation, amount/currency, idempotency, DB rollback test |
| AI scoring | PARTIAL: per-user metrics and Gemini/fallback | rubric benchmark, confidence, multi-language data isolation, AI cost controls |
| Web analytics | PARTIAL: Web consumer paths verified | browser/session and error-state tests |
| Web learning path | PARTIAL: client route matches controller | completion and XP replay test |
| Mobile | BLOCKED: placeholder/static Home | live API integration, auth refresh, Android/iOS and 1536/390 parity |
| API overall | 74/74 controllers route declarations inventoried | method guards, DTO validators, service ownership and complete consumer matrix |

**Decision:** PR #18 Draft, Technical Blueprint not LOCKED. No functional code/schema/UI change, GitHub Actions run, merge or deploy.
