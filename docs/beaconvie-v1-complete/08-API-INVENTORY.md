# API Inventory — Evidence-backed first pass
Source: NestJS controllers at `main@13d40d7a649196e88ddbd9f5aeed5c817af14e4d`. This is **not an exhaustive OpenAPI inventory**.

| Method/path (controller-relative) | Evidence | Status / contract gap |
|---|---|---|
| POST /orders/courses/:courseId | orders.controller.ts | Exists; JWT, coupon, free enrollment or pending paid order |
| GET /orders/my | orders.controller.ts | Exists; JWT scoped to current user |
| POST /payments/orders/:orderId/vnpay | payments.controller.ts | Exists; JWT, but service does not take userId for ownership verification |
| GET /payments/vnpay-return | payments.controller.ts | Exists; signed browser return processed as payment state transition |
| GET /conversation/scenarios | conversation.controller.ts | Exists; JWT, scenario catalog |
| POST /conversation/sessions | conversation.controller.ts | Exists; JWT, throttled |
| GET /conversation/sessions | conversation.controller.ts | Exists; JWT, user-scoped |
| GET /conversation/sessions/:id | conversation.controller.ts | Exists; JWT, user-scoped |
| POST /conversation/sessions/:id/messages | conversation.controller.ts | Exists; JWT, streamed response, throttled |
| POST /conversation/sessions/:id/finish | conversation.controller.ts | Exists; JWT, session completion |

## Payment critical findings
- `PaymentsService.createVnpayUrl(orderId, ipAddr)` loads by ID and checks PENDING, but does not verify the authenticated order owner. Controller has req.user but does not forward its ID.
- `handleVnpayReturn` verifies HMAC signature, then on responseCode 00 directly marks PAID and upserts enrollment; no amount/currency reconciliation was observed in this method.
- PAID update, enrollment and teacher notification are separate writes, not a single transaction; duplicate callbacks can duplicate side effects.
- Failed-payment branch increments coupon.usedCount, requiring business-rule review.
- Confirm trusted VNPay IPN/webhook flow and gateway docs before changing payment state machine; no live attack or exploit performed.

## Required exhaustive inventory
Parse every controller's decorators, method, guard, DTO and ownership checks; compare frontend API clients and native calls; check global prefix/versioning; produce OpenAPI diff and auth matrix; test response contracts locally. No endpoints were invoked in production during this audit.
