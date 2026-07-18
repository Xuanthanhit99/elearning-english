# Phase 1 - Stage 3: Dashboard and Learning Path

## Scope

Chặng này chỉ hoàn thiện Dashboard và Learning Path để có thể dùng cho người dùng thật trong Phase 1.

Không xử lý reward Mission V2, XP, Coins, Pet, Leaderboard event, Vocabulary, Grammar, Reading, Writing, Speaking, Listening, Notification hoặc Achievement ngoài việc đọc dữ liệu có sẵn cho dashboard.

## Backend

### Dashboard

- `GET /dashboard` vẫn giữ API cũ để không phá frontend hiện tại.
- Dashboard lấy user từ cookie-auth guard qua `req.user`, không yêu cầu frontend truyền `userId`.
- Bổ sung `notificationUnreadCount`.
- Bổ sung alias `missions` từ Mission V2 hiện có để frontend mới có thể map dần mà không phá `todayMissions`.
- Learning Path widget đọc từ `LearningPathService` thay vì tự dựng riêng nếu user đã có placement READY.
- Current lesson ưu tiên bài đang học hoặc bài tiếp theo trong Learning Path.
- Loại bỏ progress giả cho Speaking/Reading đang dở trong Dashboard. Khi chưa có progress thật, trả `0`.

### Learning Path

- `GET /learning-path` vẫn trả các field cũ: placement, phases, priorities, recommendedCourses, skills.
- Bổ sung dữ liệu mới:
  - `id`
  - `title`
  - `progressPercent`
  - `completedLessons`
  - `totalLessons`
  - `currentLesson`
  - `nextLesson`
  - `courses[]`
  - `courses[].lessons[]`
- Lessons được tính trạng thái thật theo `LessonProgress`:
  - `LOCKED`
  - `AVAILABLE`
  - `IN_PROGRESS`
  - `COMPLETED`
- Chỉ mở khóa bài tiếp theo khi bài trước đã hoàn thành.
- Thêm API hành động:
  - `POST /learning-path/lessons/:lessonId/start`
  - `GET /learning-path/lessons/:lessonId/resume`
  - `POST /learning-path/lessons/:lessonId/complete`
- Các action xác thực lesson thuộc Learning Path hiện tại của user.
- `complete` idempotent: bài đã hoàn thành gọi lại không tạo thêm reward.
- Chặng này không gọi Pet reward, Mission reward hoặc XP reward để tránh đụng logic của Stage 4.

## Frontend

### Learning Path Page

- `LearningPathScreen` map contract mới từ backend.
- Hiển thị overview placement, progress, completed lessons, total lessons.
- Hiển thị current lesson CTA.
- Hiển thị courses và lesson list theo trạng thái thật.
- Button start/continue gọi `POST /learning-path/lessons/:lessonId/start`.
- Lesson locked không bấm được.
- Course chưa link được với `Course` thật sẽ hiện empty warning thay vì giả bài.

### Learning Path Lesson Page

- Thêm route:
  - `/learning-path/lessons/[lessonId]`
  - `/learning-path/lesson/[lessonId]` redirect tương thích link cũ.
- Màn lesson gọi:
  - `GET /learning-path/lessons/:lessonId/resume`
  - `POST /learning-path/lessons/:lessonId/start`
  - `POST /learning-path/lessons/:lessonId/complete`
- Sau khi complete, progress và next lesson được đồng bộ từ backend.

### Dashboard Page

- Không tạo Dashboard mới.
- Page hiện tại tiếp tục dùng `GET /dashboard`.
- Learning Path/current lesson tự nhận dữ liệu mới qua payload cũ, không cần frontend truyền `userId`.

## Files Changed

- `backend/src/modules/learning-path/learning-path.service.ts`
- `backend/src/modules/learning-path/learning-path.controller.ts`
- `backend/src/modules/dashboard/dashboard.module.ts`
- `backend/src/modules/dashboard/dashboard.service.ts`
- `backend/src/modules/learning-path-access/learning-path-access.controller.ts`
- `backend/src/modules/learning-path-access/learning-path-access.service.ts`
- `backend/src/modules/learning-path/*.spec.ts`
- `backend/src/modules/learning-path-access/*.spec.ts`
- `english-web-build/src/lib/learning-path-api.ts`
- `english-web-build/src/Components/learning-path/LearningPathScreen.tsx`
- `english-web-build/src/Components/learning-path/LearningPathLessonPage.tsx`
- `english-web-build/app/(main)/learning-path/lessons/[lessonId]/page.tsx`
- `english-web-build/app/(main)/learning-path/lesson/[lessonId]/page.tsx`

## Verification

- `npx prisma validate` passed.
- `npx prisma generate` passed.
- `npm run build` in backend passed.
- `npm run build` in frontend passed.
- Learning Path related tests passed:
  - `learning-path.controller.spec.ts`
  - `learning-path.service.spec.ts`
  - `learning-path-access.controller.spec.ts`
  - `learning-path-access.service.spec.ts`

## Remaining For Later Stages

- Stage 4 should connect complete lesson events to Mission V2, XP, Coins, Streak, Pet and Leaderboard.
- Actual lesson content rendering should reuse the module-specific lesson pages when those contracts are finalized.
- Dashboard widgets for Mission reward animation, Notification realtime, Achievement unlock animation and Analytics charts remain in their later stages.
