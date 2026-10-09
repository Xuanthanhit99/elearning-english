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
