# Initial repository inventory (NOT full audit)
Repository: `Xuanthanhit99/elearning-english`; default branch `main`. Directly inspected `backend/prisma/schema.prisma` on 2026-10-10. This is a **schema-level reconnaissance**, not a verified runtime inventory.

| Capability | Existing schema evidence | Implementation status |
|---|---|---|
| User/auth/roles | User, UserRole, UserSettings, UserDeviceSession | UNVERIFIED |
| Courses/enrollment | Course, Lesson, Enrollment, LessonProgress | UNVERIFIED |
| Checkout/commerce | Order, Coupon, WithdrawRequest, CourseLanding | PARTIAL DATA MODEL; flows UNVERIFIED |
| Placement/progress | PlacementResult, UserPlacement, UserSkillLevel | UNVERIFIED |
| Skills | ReadingSession, ListeningSession, SpeakingSession, WritingSession and related models | UNVERIFIED |
| AI coaching/chat | ChatSession, ChatMessage, AiUsageLog | UNVERIFIED |
| Language DNA | LearningDnaSnapshot | UNVERIFIED |
| Conversation practice | ConversationScenario, ConversationSession, ConversationMessage | UNVERIFIED |
| Community/gamification | Community*, Arena*, Mission*, Leaderboard* | UNVERIFIED |
| Resources | LearningDocument, LearningDocumentVersion, DocumentRating, DocumentDownload | UNVERIFIED |
| Multi-language catalog/enrollments | Existing enum Language is present; target-language course model semantics not validated | GAP TO INVESTIGATE |
| Subscription/entitlement | No models named Subscription/Entitlement in inspected schema | MISSING AS NAMED MODELS; alternate logic unknown |
| Affiliate/commission | No models named Referral/Commission/Affiliate in inspected schema | MISSING AS NAMED MODELS; alternate logic unknown |
| Mobile/PWA/SEO | Not inferable from Prisma schema | NOT AUDITED |

### Existing schema cautions
- `User.isPro`, `Order`, `Coupon` and `WithdrawRequest` already exist; do NOT blindly add parallel paid-user/order/payout models.
- `Language` enum exists; inspect semantics before assuming multilingual curriculum support.
- `LearningDnaSnapshot` and conversation entities exist; inspect actual services and UI before implementing duplicates.
- The top-level README currently describes a placement screen and should not be treated as a full project architecture spec.
- Open PR #17 concerns a Handlebars dependency security fix; isolate from docs and future feature work.

### Required next audit evidence
Pin exact commit SHA; list all backend modules/controllers/routes, frontend app routes, Expo app, PWA config, admin, tests, deployment workflows and migrations. Inspect auth, payments, AI and data isolation; execute local test matrix. Only then assign DONE/PARTIAL/MISSING/BROKEN.


## Source-level audit checkpoint — main @ 13d40d7a649196e88ddbd9f5aeed5c817af14e4d
Git tree: 2,200 entries, not truncated. Backend modules observed include auth, analytics, chat-session, conversation, courses, orders, payments, coupons, wallet, documents, placement, all six skills, admin-dashboard, teacher-dashboard, community, arena, missions and learning-path. Presence of source is not proof of production correctness.

| Capability | Concrete evidence | Classification | Required follow-up |
|---|---|---|---|
| AI Coach | `backend/src/modules/analytics/ai-coach.service.ts` uses goal, 7-day analytics, skill radar, weakness detection, Gemini, per-user/day cache and deterministic fallback | PARTIAL | memory consent, error taxonomy, benchmark and adaptive closed loop |
| Conversation | `backend/src/modules/conversation/conversation.controller.ts` has scenarios, sessions, streaming message endpoint, finish and throttling | PARTIAL | voice recording/replay, scoring, retry, mobile and E2E |
| Orders | `backend/src/modules/orders/orders.controller.ts` creates course orders and lists own orders behind JWT | PARTIAL | full service auth and paid flow |
| VNPay | `backend/src/modules/payments/payments.controller.ts` creates VNPay URL and handles return redirects | PARTIAL | inspect signature validation, ownership, idempotency, server-to-server confirmation, refunds |
| SEO | `english-web-build/app/sitemap.ts`, `robots.ts`, `layout.tsx` define public pages, protected disallow, metadata | PARTIAL | verify deployed HTTP/indexing, canonical, structured data, GSC, content quality |
| Analytics | `english-web-build/app/layout.tsx` loads GA4 tag `G-3JDRS4SY66` | PARTIAL | verify event funnel, consent and actual collection |
| PWA | `english-web-build/public/manifest.json` defines standalone app and icons | PARTIAL | service worker, installability, offline/sync tests |
| Native | `app/mobile/package.json` Expo 57, React Native 0.86, Expo Router; `app/mobile/app.json` has generic app name/slug/scheme `mobile` | PARTIAL | actual screens/API integration, native QA, branding, EAS and stores |
| Learning DNA | `LearningDnaSnapshot` in schema; `analytics/skill-radar.service.ts` and `weakness-detection.service.ts` exist | PARTIAL | evidence provenance and accuracy |
| Affiliate | No named Affiliate/Referral/Commission model in schema | MISSING AS NAMED MODEL | inspect alternate implementation before additive schema |
| Subscription | No named Subscription/Entitlement model; `User.isPro` and `Order` exist | PARTIAL LEGACY | define single authoritative entitlement state and migration |
| Multilingual | `Language` enum exists, but current SEO copy and AI Coach goal mappings are English-specific | PARTIAL FOUNDATION | inspect enum semantics and all content/scoring isolation |

### Specific review flags (not confirmed vulnerabilities)
- VNPay URL creation receives orderId from route; inspect service for user ownership and amount verification.
- VNPay return handler must not alone grant paid entitlements without validated trusted provider event.
- Existing GA4 script is present; its presence does not prove activation events or consent handling.
- Expo native config currently has generic branding and no evidence of store readiness.

No builds, test executions, browser screenshots or runtime smoke were performed during this read-only audit.
