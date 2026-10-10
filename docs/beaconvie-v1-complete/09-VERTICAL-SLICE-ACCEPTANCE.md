# V1 Complete — Vertical Slice Acceptance Criteria (proposed)

Evidence standard: code location + exact-head test + real runtime/client verification. No module is DONE merely because a route exists.

| Slice | Acceptance evidence |
|---|---|
| Reading | JWT, article/start/answer/submit/result/history; scoring accuracy, repeat submission and owner isolation tests; 1536/390 UI |
| Listening | start/answer/skip/flag/finish/result/rating/retry/continue; real audio HTTP/playback, scoring and retry tests |
| Speaking | start/generate-question/answers/finish/history; real microphone and playback, feedback provenance, calibration and permissions |
| Writing | check/start/save/review/submit/status/result/retry/rewrite; asynchronous processing, idempotency and AI scoring benchmark |
| Pronunciation | generate/analyze/history; consent, valid audio, rate limit, accuracy calibration, privacy retention |
| AI Coach | JWT, throttling, cache, fallback; explainable recommendations, consent and cost budgets, no unsupported scoring precision |
| Conversation Missions | scenario/session/messages/finish; ownership, stream abort/retry, content filtering and scoring rubric review |
| Multilingual | course and progress isolation by target language; English backward compatibility; CEFR and non-CEFR frameworks |
| Native | authenticated session, live API, complete learning journey, audio/mic, offline/resume, Android/iOS screenshots |
| Payments | order owner check, signed trusted confirmation, amount/currency reconciliation, idempotent atomic entitlement and refund |
| Casso optional | Vietnam-only supported bank-transfer option, provider validation, matching reference and reconciliation |
| International checkout | verified existing international provider, supported countries/currencies, sandbox end-to-end evidence |
| Premium | server-authoritative entitlements, expiry, refunds and usage limits |
| Affiliate | settled qualifying payment, attribution, commission hold/reversal, fraud and payout ledger |
| SEO/PWA | no-JS public SSR, sitemap/robots/canonical, install/offline supported content and sync |
| Release | regression/security tests, local-first build, 1536/390 visual comparison, rollback, observability |

Gate: no production release and no functional PR before the approved audit/architecture dependency gates. GitHub Actions budget capped at $10/month account-wide; prefer local testing.
