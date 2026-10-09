# V1 Complete — Controlled PR Delivery Plan
Goal: one coherent V1 release, small dependency-aware PRs, not one massive change. Estimated 8–12 weeks only with adequate parallel staffing and clean audit; do not promise this before effort estimation.

| PR track | Dependency | Deliverable / gate |
|---|---|---|
| D0 Documentation baseline | none | This PR, no app/schema changes |
| A1 Exact-head repository audit | D0 | Inventory DONE/PARTIAL/MISSING/BROKEN with files, endpoints, tests, mobile, admin |
| A2 Architecture & data contract lock | A1 | Existing→proposed schema map, API contract, migration/rollback plan |
| G1 SEO & analytics | A1 | sitemap, robots, metadata, SSR, canonical, structured data, funnel event QA |
| L1 English reliability | A1 | reading/listening/speaking/writing E2E and progress integrity |
| L2 Multilingual foundation | A2,L1 | language/course/enrollment isolation and English backcompat |
| AI1 Coach memory & Repair Studio | A2,L1 | consent, correction cycle, AI budget, benchmark |
| AI2 Real-Life Missions | AI1,L2 | scenario/retry/rubric, recordings and privacy |
| AI3 Adaptive + DNA + Evidence | AI1,AI2 | 10–15m sessions, mastery, portfolio, confidence |
| C1 Premium & entitlements | A2 | payment reconciliation, server-side access, refund/replay |
| C2 Affiliate & referrals | C1 | fraud-safe attribution, ledger, hold/reversal and dashboard |
| C3 Store + partner pilot | C1,C2 | licensed resources, verified partners, scoped B2B pilot |
| M1 PWA & offline | L1,A2 | install, secure cache, sync/error UX |
| M2 Android/iOS | L2,AI2,C1 | native E2E, device QA, store/billing policy check |
| N1 Mandarin beta | L2,AI2 | vetted Pinyin/tones/Hanzi/HSK-aligned foundation |
| R1 Final release | all required tracks | privacy/security, E2E, payment/AI load, 1536/390 visual fidelity, rollback and staged release |

Parallelize only after shared contracts are locked. Do not run expensive CI for every docs commit. Each feature PR must contain API+data+client+tests for one vertical slice.

## Acceptance gate
No fake content, no unvalidated pronunciation scores, no accidental new indexable private pages, no unapproved redesign, no broken existing English learning flow, no incomplete payment state handling, no unsupported offline claims. V1 COMPLETE means Web/PWA/Android/iOS and agreed public features pass their evidence gates; conditional marketplace operations remain gated until compliance and operational readiness.
