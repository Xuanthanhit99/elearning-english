# Evidence checkpoint — Mobile, AI and Payment
Source pinned to main commit 13d40d7a649196e88ddbd9f5aeed5c817af14e4d. Source inspection only, no device or runtime QA.

## Mobile routes and contracts
- app/mobile/src/app/(tabs)/index.tsx: Home hard-codes streak 12, progress 72%, daily 60%, XP 120 and lesson content; Continue button only console.log. PARTIAL.
- app/mobile/src/app/(tabs)/learn.tsx: placeholder text for Vocabulary, Grammar, Reading, Listening. PARTIAL.
- app/mobile/src/app/(tabs)/companion.tsx: placeholder text reused from Learn. PARTIAL.
- app/mobile/src/app/(tabs)/profile.tsx: placeholder text reused from Learn. PARTIAL.
- app/mobile/src/lib/api/client.ts: typed get/post/patch/delete wrapper, optional Bearer token, ApiError mapping. Foundation exists; no journey integration proven.
- app/mobile/src/config/env.ts: EXPO_PUBLIC_API_URL required; configuration only, not connectivity evidence.
- Route tree also includes community.tsx, explore.tsx, app/index.tsx and layout files; inspect before final route matrix.
- Missing proof: sign-in/session persistence, real learning sessions, voice permission, app resume, offline, billing, device screenshots, release readiness.

## AI Analytics routes
- backend/src/modules/analytics/analytics.controller.ts: JWT on controller; GET analytics/overview, skills, skills/:skill, activity, metrics, timeline, radar, weaknesses, coach, reports/weekly, monthly, range.
- analytics/coach adds ThrottlerGuard with limit 10 per 60 seconds, optional refresh flag; existence does not validate scoring calibration.
- backend/src/modules/analytics/weakness-detection.service.ts: six-skill weakness aggregation; MIN_ATTEMPTS=2, MAX_OVERALL_WEAKNESSES=5, cache. Need review attempt definition and benchmark.
- ConversationSession Prisma model has overall, fluency, grammar, vocabulary, pronunciation, confidence and naturalness scores. Need inspect scoring generation, ground truth, user consent and tests.

## Payment confirmed code gaps
- backend/src/modules/payments/payments.controller.ts: POST payments/orders/:orderId/vnpay is JWT guarded but forwards only orderId and IP, not user ID.
- payments.service.ts: createVnpayUrl loads order by ID, checks PENDING, does not check ownership.
- handleVnpayReturn verifies HMAC then marks PAID and upserts enrollment on browser-return responseCode 00; amount/currency and trusted server notification not checked in this method.
- Order update, enrollment upsert and teacher notification are separate writes, not atomic; duplicate events may duplicate notification.
- Failed return increments coupon.usedCount; review coupon semantics.
- Decision: preserve VNPay, optional Casso in Vietnam, retain any verified international-capable existing provider; no unsupported provider claims.

## Evidence required to close PR #18
1. Full API inventory from all 74 controller source files, including guards, DTO, ownership and frontend/mobile consumers.
2. Schema relationship and migration/backfill plan, with existing data validation.
3. AI scoring rubric implementation, reviewed examples and tests.
4. Complete native route/API/journey matrix, device E2E, permissions and billing policy.
5. Payment threat model and local regression tests; identify existing international provider.
6. Acceptance criteria per vertical slice and approved 1536/390 visual evidence.
No DONE or Blueprint LOCK from source inspection alone.
