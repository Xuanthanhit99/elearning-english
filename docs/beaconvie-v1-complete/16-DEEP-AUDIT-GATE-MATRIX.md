# Deep Audit — Payment, AI Scoring, Mobile and Acceptance Gates

Source pinned main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d; static source inspection. **Findings indicate implementation risk, not confirmed production exploit or successful E2E.**

| Gate | Source evidence | Current status | Acceptance test required |
|---|---|---|---|
| Payment order ownership | payments.service.ts createVnpayUrl(orderId, ipAddr) at line 28 has no userId argument; payments.controller.ts JWT guard but only orderId forwarded | BLOCKED / source risk | owner can initiate own pending order; other user cannot initiate, including with known orderId |
| Trusted payment completion | payments.service.ts handleVnpayReturn at line 86, HMAC parsing lines 89–92, response code line 110; updates order line 121 and enrollment upsert line 128 | BLOCKED / review | verify signed provider-to-server confirmation, order amount/currency/merchant/transaction, replay and duplicate callbacks |
| Atomic entitlements | separate order.update and enrollment.upsert at lines 121 and 128; no transaction observed in inspected path | BLOCKED / review | simulate DB failure between steps; no PAID-without-entitlement; idempotent replay |
| Coupon/refund | coupon.update at line 163 and failed order update at line 175 | REVIEW | confirm coupon usedCount rules, failed/expired/paid/refund/chargeback reversals |
| Provider continuity | VNPay service verified; international legacy gateway not yet located; Casso optional Vietnam-only per approved decision | UNVERIFIED | provider inventory, country/currency support, webhook contract, historical payment compatibility |
| AI Coach | analytics/ai-coach.service.ts metrics sourced per user (overview, radar, weaknesses, dashboard), Redis cache, Gemini fallback on failure | PARTIAL / source present | fixed fixture output, cache invalidation, prompt safety, hallucination controls, cost/rate limits |
| Weakness scoring | analytics/weakness-detection.service.ts MIN_ATTEMPTS=2; aggregates Vocabulary, Grammar, Reading, Listening, Speaking, Writing; userId query filters | PARTIAL / source present | score normalization, small sample warnings, CEFR calibration, language isolation, missing/invalid data |
| Mobile Home | app/mobile/src/app/(tabs)/index.tsx static lesson title and console.log('Continue learning') at line 64 | BLOCKED / incomplete UX | authenticated live API dashboard, real continue-lesson navigation, progress consistency |
| Mobile Learn | app/mobile/src/app/(tabs)/learn.tsx placeholder copy | BLOCKED / incomplete UX | real six-skill routes, native audio/mic permissions, device QA and resume |
| Release readiness | 74/74 controller route declarations audited, but service ownership, DTO validators, consumer matrix and E2E not fully verified | NOT LOCKED | owner/outsider 401/403, payment idempotency, AI benchmarks, Android/iOS smoke, 1536/390 fidelity |

## Implementation order — no source modifications in this audit PR
1. Verify payment ownership, amount/currency and trusted confirmation; design atomic idempotent settlement and historical data compatibility.
2. Identify international provider and optional Casso contract; review mobile digital-goods billing policy.
3. Map AI scoring services/rubrics/tests and benchmark fixed samples with confidence and fallback rules.
4. Build Expo route-to-API matrix and device acceptance suite; preserve approved V4.3 UI.
5. Confirm all DTO validation, service-level ownership, web/mobile consumers and exact global prefix; run local tests before declaring Technical Blueprint LOCK.

**PR #18 remains Draft; no merge, deploy, functional PR, schema or UI changes, and no GitHub Actions rerun.**
