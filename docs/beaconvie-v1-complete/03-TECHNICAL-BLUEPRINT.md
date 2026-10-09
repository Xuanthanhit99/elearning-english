# V1 Complete — Technical Blueprint (proposed; migration NOT approved)
## Architecture
Preserve modular NestJS API + Prisma/Postgres + Redis/queues and Next.js frontend; Expo native client where existing. Use shared OpenAPI/types and contracts; avoid unnecessary microservices.

## Domains and boundaries
1. Identity: user, session, roles, consent, organization memberships, privacy controls.
2. Language Catalog: language, source language, target language, framework, capability registry, course version, content QA.
3. Learning: enrollment, session, activity, attempts, scoring rubric, progress, spaced repetition, adaptive missions.
4. Coach: AI session, learner memory opt-in, error taxonomy, recommendations, inference cost and safety.
5. Evidence: Language DNA, assessments, confidence, artifacts, retention and deletion.
6. Commerce: catalog offer, order, payment attempt, provider event, subscription, entitlement, refund, ledger.
7. Affiliate: partner identity, referral code/link, attribution window, qualified event, commission ledger, hold/reversal/payout.
8. Partners: tutor verification, approved listings, organization pilot, restricted learner access.
9. Growth: public SEO content, events, acquisition attribution and privacy-safe reporting.
10. Mobile sync: offline content manifest, local mutation queue, conflict handling and recovery.

## Candidate data additions (subject to schema review)
- LanguageCatalogEntry, CourseLanguageMapping, CourseVersion, LearnerLanguageProfile, LanguageCapability, AssessmentFramework.
- LearningEvidence, LearnerMemoryPreference, TutorFeedback, AdaptiveMissionPlan.
- Plan, Subscription, Entitlement, PaymentAttempt, PaymentProviderEvent, Refund, FinancialLedgerEntry.
- AffiliatePartner, ReferralCode, ReferralAttribution, QualifiedConversion, CommissionEntry, PayoutBatch.
- PartnerProfile, PartnerVerification, Organization, OrganizationMembership.
These are **conceptual** names; existing Order/Course/User.isPro/LearningDnaSnapshot/ConversationSession/etc must be mapped first, and unnecessary models removed.

## API contract candidates
- GET /languages; GET /courses?targetLanguage=...; POST /enrollments; GET /me/language-profiles.
- POST /coach/sessions; POST /coach/feedback; GET/DELETE /me/learning-memory.
- POST /missions/sessions; POST /missions/:id/attempts; GET /me/language-dna; GET /me/progress-evidence.
- GET /plans; POST /checkout; GET /me/entitlements; POST /payments/webhooks/:provider.
- POST /referrals/links; GET /affiliate/dashboard; GET /affiliate/commissions.
- GET /partners; POST /partners/apply; GET /organizations/:id/report (scoped).
Paths are proposals only: audit existing endpoints to prevent collisions.

## Correctness/security invariants
- Enrollment/progress/memory scoped by learner + target language + course; cross-language leakage tests.
- AI assessment returns rubric, evidence, confidence and fallback; benchmark with reviewed samples per language.
- Raw audio and photos require consent, deletion policy and strict access controls.
- Payment webhook verified, replay-safe/idempotent; server owns entitlement transitions; refund revokes according to policy.
- Commission only on qualified settled payment; refunds/chargebacks reverse, never trust click count alone.
- No cross-role leakage (student, tutor, partner, affiliate, admin); financial audit logs.
- Offline sync is idempotent with explicit conflict rules; AI-dependent actions remain online.
- Observability: p95 latency, AI cost/session, scoring disagreement, payment reconciliation, activation/retention.

## Migration process
Schema diff → ownership/relations mapping → data backfill plan → reversible additive migration → shadow validation → dual-read/write only if needed → local tests → gated rollout. Preserve English user data and production backups.
