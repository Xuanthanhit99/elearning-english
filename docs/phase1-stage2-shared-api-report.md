# Phase 1 Stage 2 - Shared API, Loading, Error Handling

Date: 2026-07-18

Scope:

- Shared backend error response.
- Shared frontend API error normalization.
- Refresh retry safety.
- Root-level Next.js loading and error fallback.
- No Dashboard, Learning Path, Mission, Vocabulary or AI module implementation in this stage.

## 1. Phát hiện

### Đã có

- Backend already had global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`.
- Frontend already used a shared Axios instance with `withCredentials: true`.
- Several P0 screens already had local loading/error/empty states, especially Dashboard, Placement, Grammar, Community and learning result screens.
- Next.js build already had all route groups wired.

### Bị lỗi hoặc thiếu

- Backend had no global exception filter, so non-HTTP errors could leak inconsistent response shapes.
- Frontend API error parsing was duplicated across modules and sometimes pulled helpers from unrelated feature folders.
- Shared Axios refresh queue only resolved waiting requests. If refresh failed while multiple requests were waiting, queued requests could hang or retry with an invalid cookie.
- One API wrapper for chat imported error helper from Listening helpers.
- Root `app/error.tsx` and `app/loading.tsx` were missing.

### Nguyên nhân gốc

- Error handling grew feature-by-feature instead of through a shared frontend/backend layer.
- Refresh retry logic handled the simple single-request case but not concurrent failure.
- App-level fallback UI had not been added yet.

## 2. File đã thay đổi

| File | Thay đổi | Lý do |
| --- | --- | --- |
| `backend/src/common/filters/http-exception.filter.ts` | Added global exception filter | Normalize backend errors without exposing stack traces in production. |
| `backend/src/main.ts` | Registered global exception filter | Apply consistent error shape to all HTTP routes. |
| `english-web-build/src/lib/api-error.ts` | Added shared API error normalization helpers | Let API modules show safe, consistent messages. |
| `english-web-build/src/lib/axios.ts` | Fixed concurrent refresh queue reject path, added normalized error attachment and login redirect on refresh failure | Prevent hanging requests and centralize auth failure behavior. |
| `english-web-build/src/lib/chat.api.ts` | Switched to shared API error helper | Remove cross-feature helper dependency. |
| `english-web-build/app/error.tsx` | Added root error boundary UI | Avoid blank crash screen for route errors. |
| `english-web-build/app/loading.tsx` | Added root loading fallback UI | Provide app-level skeleton during route loading. |

## 3. Database

- Schema changed: No.
- Migration added: No.
- Data impact: No.
- Rollback: revert files listed above; no database rollback required.

## 4. API Contract

### Endpoint thêm mới

- None.

### Endpoint sửa

- None.

### Endpoint giữ nguyên

- All existing endpoints remain unchanged.

### Response shape

Error responses now consistently include:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Readable message",
  "error": "Bad Request",
  "path": "/example",
  "method": "GET",
  "timestamp": "2026-07-18T00:00:00.000Z",
  "requestId": "optional"
}
```

The top-level `message` field is preserved for compatibility with current frontend code.

## 5. Kiểm thử

| Command | Kết quả |
| --- | --- |
| `npm run build` in `backend` | Passed. |
| `npm run build` in `english-web-build` | Passed. |

Not run in this stage:

- Backend lint.
- Backend tests.
- Frontend lint.
- Manual browser regression.

## 6. Việc còn lại

### Blocker còn tồn tại

- Many feature components still manually parse `error.response?.data?.message`. This is compatible but should gradually move to `getApiErrorMessage`.
- Stage 3 must verify Dashboard and Learning Path data with real API behavior.

### Rủi ro

- Global exception filter changes error response shape for routes that previously returned Nest defaults. It preserves `message`, but clients depending on exact default Nest fields should be checked during regression.
- Automatic redirect to `/auth` on refresh failure is client-side only and intentionally skipped during SSR.

### Chặng tiếp theo

- Stage 3: Dashboard and Learning Path.

