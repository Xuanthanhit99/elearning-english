# Existing → Target Schema Mapping — Audit Checkpoint
Pinned source: `main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d`. Proposed mapping, **not migration approval**.

| Existing | Observed fields/behavior | V1 target | Decision |
|---|---|---|---|
| User | `isPro Boolean`, `englishLevel`, `learningGoal`, role | subscription-aware entitlements; learner locale/profile | KEEP; avoid interpreting isPro as authoritative paid state after migration |
| Course | `level String`, `price Int`, status, teacherId | language-scoped, versioned course with assessment framework | EXTEND via additive relations after content audit |
| Enrollment | unique(userId,courseId) | retain per-course ownership; derive target language through course | KEEP; verify existing progress isolation |
| Order | userId/courseId/amount/status/coupon | preserve course purchase; add verified payment attempt, provider reference and entitlement mapping | KEEP + EXTEND |
| OrderStatus | PENDING/PAID/FAILED/REFUNDED | payment transition state machine + idempotent events | KEEP initially |
| Coupon | coupon usage/count | validated redemption tied to settled order | AUDIT before reuse |
| WithdrawRequest | teacher withdrawal workflow | separate affiliate payouts only if semantics differ | AUDIT before reuse |
| LearningDnaSnapshot | per-user skill and consistency metrics | evidence provenance, target language, confidence, time windows | EXTEND; avoid duplicating DNA model |
| ConversationSession | user, scenario, CEFR, feedback and speaking scores | target language, mission evidence, calibrated rubrics | EXTEND |
| AiUsageLog | module/success/latency/token counts/user | per-session costs, model, tenant and budget controls | EXTEND |
| Language enum | VI, EN, ZH, DE | full language catalog incl. JA, KO, FR, ES and variants | DO NOT repurpose enum blindly; inspect references |
| CefrLevel enum | A1–C2 | independent HSK/JLPT/TOPIK frameworks | KEEP for CEFR; new framework mapping |
| Course/teacher roles | teacherId, UserRole | verified partner and academy organizations | EXTEND with RBAC |

## Candidate additive entities only after owner/relationship review
`LanguageCatalog`, `AssessmentFramework`, `CourseLanguage`, `CourseVersion`, `LearnerLanguageProfile`, `LearningEvidence`, `LearnerMemoryPreference`, `PaymentAttempt`, `PaymentEvent`, `Subscription`, `Entitlement`, `AffiliatePartner`, `ReferralAttribution`, `CommissionLedger`, `PartnerVerification`, `OrganizationMembership`.

## Mandatory migration gates
1. Inspect all references to Language enum, Course, Enrollment, Order, User.isPro and DNA.
2. Map current payment/webhook and teacher payout flows.
3. Preserve existing English rows with deterministic default target language; never assume all Course rows are English without data validation.
4. Additive migration + backup + reversible plan + backfill and cross-language access tests.
5. Do not introduce duplicate Order, Course or DNA tables.
