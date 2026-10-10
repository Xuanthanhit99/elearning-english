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


## Payment provider decision — preserve existing methods; optional Casso for Vietnam (revised 2026-10-10)
**Supersedes the earlier Casso replacement decision.** Keep the existing payment integrations and all historical orders. Do not remove or disable VNPay or any existing international payment method. The repository audit currently confirms VNPay code only; the specific international provider(s) and their live readiness must be verified, not assumed.

### Routing policy (proposal pending provider verification)
- Vietnam: retain existing supported checkout method(s); optionally offer Casso bank-transfer reconciliation as an additional method only after integration/security tests pass.
- International: retain the previous supported international payment experience, subject to actual provider and currency/country verification.
- Do not infer payer country solely from IP address. Show eligible methods based on billing context, currency, provider capabilities and user choice.
- Native app purchases of digital subscriptions must be reviewed against Android/iOS store billing requirements before offering external checkout.

### Unified architecture
Existing Order/Enrollment/Coupon remain the canonical records. Add a provider-agnostic payment adapter only if current code mapping confirms the need. Separate payment attempt/provider transaction, verified settlement, entitlement and commission records as necessary; avoid duplicate models.
Use authenticated order-owner authorization; verify provider-specific signatures/webhook authenticity, amount/currency, transaction uniqueness, order expiry, refunds and replay-safe idempotency. Make order settlement plus entitlement/enrollment atomic, and dispatch notifications via an outbox. Never grant paid access from an untrusted client redirect alone.

### Release dependencies
P0: harden existing VNPay and audit any existing international provider, then test current flows without regression.
P1: introduce provider abstraction and country/currency/payment-method eligibility with compatibility tests.
P2: integrate Casso as **optional Vietnam-only** method after inspecting Mệnh Vi's actual implementation and provider contract.
P3: Premium/Subscription after settlement/entitlement correctness is proven.
P4: Affiliate/commission after settled transaction and refund/reversal ledger is proven.
All P0–P4 are V1 delivery tracks; none is marked implemented by this document.

### Required payment tests
Owner vs outsider, valid and invalid callback signature, amount/currency mismatch, duplicate/out-of-order events, concurrent settlement, free-course enrollment, coupon redemption, payment expiry, refund/reversal, cross-provider collision, regional method selection and existing historical orders.## Payment provider decision — preserve existing methods, optional Casso in Vietnam (supersedes Casso-only proposal)

- **Vietnam:** keep the existing VNPay checkout; optionally add Casso bank transfer after contract/security verification.
- **International:** preserve previously implemented international-capable provider(s) **if verified in source**. Do not assume VNPay itself supports international checkout. Confirm provider, country/currency availability and existing configuration first.
- **Mobile:** independently verify Apple/Google policies for in-app digital purchases before enabling external checkout.
- Do not replace, disable or migrate historical providers by default. Keep existing Order, Enrollment, Coupon, and payment history. One Order/Payment/Entitlement core with separate provider adapters; server-side authoritative settlement.
- Payment method availability must depend on supported country, currency, product and verified provider capabilities; never use IP location as the sole decision.

### P0 security and data-integrity gates
1. Check authenticated order ownership before payment initiation.
2. Verify trusted provider notifications and signature/authentication; reconcile reference, amount, currency, order status and transaction uniqueness.
3. Do not grant course enrollment or Premium entitlement solely from a browser return.
4. Idempotent settlement with database transaction/outbox for order, enrollment or entitlement, and notification.
5. Handle retries, concurrency, refund, coupon usage, chargebacks, manual reconciliation and audit logs.
6. Only calculate affiliate commissions on qualified settled orders, with reversal.

### Sequence and non-goals
Complete exact-head source audit and regression evidence; harden existing VNPay; verify actual international payment integration; optionally add Casso for Vietnam behind a feature flag; then Premium/Entitlement and Affiliate. Parallel audit learning modules, AI scoring and all Expo Mobile journeys to lock multilingual contracts. No application code, schema migration, UI change, deploy or feature PR is authorized by this document. PR #18 remains Draft until evidence gates pass.
