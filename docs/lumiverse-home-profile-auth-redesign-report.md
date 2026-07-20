# Lumiverse Home, Profile, Auth Redesign Report

Ngay cap nhat: 2026-07-21

## 1. Audit hien trang

### Public Homepage

- Route `/` da ton tai tai `english-web-build/app/page.tsx`.
- Component chinh la `english-web-build/src/Components/HomePage/HomePage.tsx`.
- Trang da co header, hero, feature/skill sections, AI/community sections va footer.
- Van de ban dau: homepage goi `/auth/me` truc tiep tren client, mot so CTA vao route hoc tap khong giu redirect an toan, user da dang nhap van co the thay landing page khi vao `/`.

### Authenticated Home

- Route home sau dang nhap hien tai la `/dashboard`, render `english-web-build/src/Components/Dashboard/DashboardPage.tsx`.
- Du lieu lay tu endpoint tong hop that `/dashboard`.
- Endpoint backend co `JwtAuthGuard`, dung cookie auth va Prisma select/limit theo tung module.
- Van de ban dau: dashboard con hien pet nhu tinh nang da san sang neu backend co pet data; empty state pet khuyen chon pet.

### Profile

- Route `/profile` da co va nam trong App Shell.
- Profile da duoc hoan thien o dot truoc: lay `/auth/me`, `/dashboard`, `/achievements/overview`, edit dung DTO, khong gui read-only field, pet chi la coming soon modal.

### Auth redirect

- Auth backend dung cookie `access_token`, `refresh_token` httpOnly va cookie hien thi `logged_in=true`.
- Frontend axios dung `withCredentials`, khong luu access token trong localStorage.
- Van de ban dau: login thanh cong chuyen ve `/`; social callback cung chuyen ve `/`; khi het session axios chuyen ve `/auth` nhung khong giu URL dich.

### Middleware / Proxy

- Ban dau khong co middleware/proxy guard frontend.
- Vi Next hien tai can convention moi, da them `english-web-build/proxy.ts` thay vi `middleware.ts`.

### Responsive, theme, i18n

- Theme initializer va language initializer da co trong root layout.
- Homepage da co responsive layout, mobile nav, theme/language switcher.
- Profile co i18n namespace o `vi/en/zh/de` tu dot truoc.
- Van de con lai: homepage/dashboard con nhieu chu hard-code tieng Anh tu code hien co; chua chuyen toan bo sang i18n namespace rieng trong pham vi lan nay.

## 2. Kien truc sau khi sua

### Route cong khai

- `/`
- `/auth`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/about`
- `/privacy`
- `/terms`

### Route duoc bao ve

Proxy guard bao ve cac nhom route:

- `/dashboard`, `/profile`, `/learning-path`, `/learn`, `/courses`
- `/vocabulary`, `/grammar`, `/reading`, `/listening`, `/speaking`, `/writing`
- `/community`, `/arena`, `/leaderboard`, `/notifications`, `/settings`
- `/progress`, `/history`, `/achievements`, `/analytics`, `/reports`, `/missions`
- `/search`, `/placement`, `/lesson-builder`, `/study-rooms`, `/admin`

### Redirect flow

- Chua dang nhap vao protected route: redirect sang `/auth?redirect=<internal-path>`.
- Redirect chi chap nhan internal relative path an toan.
- Dang nhap thanh cong: quay ve `redirect` hop le, neu khong co thi ve `/dashboard`.
- Dang nhap social thanh cong: doc `auth_redirect` trong `sessionStorage`, sanitize lai, roi ve dich hop le.
- Da dang nhap vao `/`, `/auth`, `/login`, `/register`: proxy chuyen ve `/dashboard` hoac redirect hop le.

### Auth loading flow

- `authStore` co `status: idle | loading | authenticated | unauthenticated`.
- `AuthInitializer` mount tai root layout, doc cookie `logged_in` roi goi `/auth/me` khi can.
- `AppShell` co skeleton full layout trong luc check `/auth/me`, tranh dashboard flash sai UI.

### Public layout

- Public homepage khong dung App Shell/sidebar.
- Header co logo, nav, language switcher, theme switcher, sign in, CTA.
- CTA vao tinh nang hoc tap dung `buildLoginUrl(destination)`.

### App layout

- App Shell tiep tuc gom sidebar, header, mobile navigation.
- Pet prompt/floating pet khong duoc render trong App Shell.

### Dashboard/Home data flow

- Frontend goi `GET /dashboard` qua `getDashboard()`.
- Backend tra summary that: user, streak/xp, missions, learning path, skills, recent sessions, achievements, notifications.
- Khong tao endpoint moi vi endpoint hien tai du tot va da tong hop nhieu module.

### Profile data flow

- Profile goi `/auth/me`, `/dashboard`, `/achievements/overview`.
- Edit profile goi `PATCH /auth/me/profile` voi payload DTO gioi han.

## 3. Danh sach file da sua

- `english-web-build/proxy.ts`: them cookie-presence guard, protected route redirect, auth route redirect, safe redirect validation. Khong doi backend API.
- `english-web-build/src/lib/auth-redirect.ts`: them helper dung chung `buildLoginUrl`, `normalizeRedirectPath`, `isSafeRedirectPath`. Khong doi API.
- `english-web-build/src/lib/axios.ts`: giu redirect URL khi session het han. Khong doi API.
- `english-web-build/src/store/authStore.ts`: them `AuthStatus`. Khong doi API.
- `english-web-build/src/Components/Auth/AuthInitializer.tsx`: set loading/authenticated/unauthenticated status theo cookie va `/auth/me`. Khong doi API.
- `english-web-build/app/layout.tsx`: mount `AuthInitializer` o root. Khong doi API.
- `english-web-build/app/(auth)/login/page.tsx`: them alias `/login`. Khong doi API.
- `english-web-build/app/(auth)/register/page.tsx`: them alias `/register`. Khong doi API.
- `english-web-build/src/Components/Auth/Auth.tsx`: login dung redirect an toan, social login luu redirect tam thoi, bo `any` trong catch. Khong doi API.
- `english-web-build/app/(auth)/auth/callback/page.tsx`: social callback ve redirect hop le hoac `/dashboard`. Khong doi API.
- `english-web-build/src/Components/HomePage/HomePage.tsx`: bo call `/auth/me` rieng tren landing, them theme/language controls, CTA protected route sang login co redirect, pet chi la coming soon. Khong doi API.
- `english-web-build/src/Components/Dashboard/DashboardPage.tsx`: pet/companion hien coming soon, khong khuyen chon pet, khong render pet status nhu tinh nang active. Khong doi API.
- `english-web-build/src/Components/Layout/AppShell.tsx`: them auth checking skeleton, giu App Shell khong render pet prompt/floating pet. Khong doi API.
- `english-web-build/src/Components/Profile/ProfilePage.tsx`: dot truoc da hoan thien profile dung real backend va coming soon modal cho companion. Khong doi API.
- `english-web-build/src/i18n/types.ts`, `english-web-build/src/i18n/locales/*.ts`: dot truoc da them namespace profile. Khong doi API.

Ghi chu: backend `npm run lint` co script tu dong `--fix`, nen co the da format mot so file backend ngoai pham vi redesign. Cac thay doi chuc nang cua dot nay nam chu yeu o frontend/proxy/auth/profile/home/dashboard.

## 4. Nhung section da hoan thanh

- Public header: Hoan thanh trong pham vi route/CTA/theme/language.
- Hero: Da co va CTA duoc redirect an toan.
- Features: Da co va CTA vao module hoc tap duoc guard.
- Skills: Da co 6 skill va route duoc guard.
- Learning Path intro: Da co.
- AI intro: Da co, chi neu cac luong hien co nhu speaking/writing feedback.
- Gamification: Da co missions/leaderboard/achievements, khong fake so lieu.
- Community: Da co CTA vao module community qua login redirect.
- Footer: Da co link module va login.
- Authenticated Home: `/dashboard` rieng voi data backend that.
- Continue Learning: Lay tu `/dashboard`.
- Daily Plan: Dung missions/today summary tu `/dashboard`.
- Skill Overview: Dung `skillProgress` tu `/dashboard`.
- Journey: Dung learning path tu `/dashboard`.
- Weekly Progress: Dung weekly activity tu `/dashboard`.
- Highlights: Achievements/notifications tu `/dashboard`.
- Profile hero: Hoan thanh dot truoc.
- Profile stats: Hoan thanh dot truoc, dung dashboard/profile data.
- Edit Profile: Hoan thanh dot truoc, dung DTO va sync auth store.
- Pet coming-soon modal/card: Hoan thanh trong Profile; Dashboard/Home cung da ha ve coming soon.

## 5. Ket qua test

- Frontend targeted lint cho cac file vua sua: PASS.
- Frontend typecheck `npx tsc --noEmit --pretty false`: PASS.
- Frontend build `npm run build`: PASS.
- Frontend full lint `npm run lint -- --max-warnings=0`: FAIL. Co 448 van de ton tai trong toan repo, chu yeu `any`, React compiler rules, unused vars, `img` warning o Arena/Reading/Leaderboard/lib... Khong phai do cac file targeted vua sua.
- Frontend test: Chua co lenh test rieng chay thanh cong trong pham vi nay; build/typecheck la kiem tra chinh.
- Backend build `npm run build`: PASS.
- Backend test `npm run test -- --runInBand`: FAIL. 62 failed, 46 passed, 108 total. Nguyen nhan chinh la test module thieu provider/mock nhu `PrismaService`, `AchievementsService`, `SpeakingService`, `PlacementProcessingService`, `PlacementDashboardService`, Redis lock/socket lien quan.
- Backend lint `npm run lint -- --max-warnings=0`: FAIL. Script backend chay `eslint ... --fix`; con 3581 errors va 311 warnings, chu yeu unsafe any/no-unsafe-* trong nhieu module cu.
- Prisma validate: PASS.
- Prisma generate: PASS.
- Prisma migrate status: PASS, database schema up to date voi 81 migrations.
- Desktop/tablet/mobile: Chua chay Playwright visual QA trong pham vi nay.
- Light/dark mode: Theme initializer/build PASS; chua co screenshot QA.
- i18n: Profile namespace co du locale; homepage/dashboard con hard-code tu hien trang cu.
- Auth redirect: Typecheck/build PASS voi proxy + redirect helper.
- Refresh/hydration: App Shell co loading skeleton trong luc `/auth/me`; chua co browser automation de xac minh flash thuc te.

## 6. Van de con lai

### 1. Full frontend lint fail

- File: Nhieu file, vi du `src/Components/Arena/ArenaPage.tsx`, `src/Components/reading/*`, `src/lib/api-error.ts`, `src/lib/leaderboard-api.ts`.
- Mo ta: Repo co san nhieu loi `any`, setState trong effect, impure render `Date.now`, unused vars va image warning.
- Muc do: Trung binh den cao neu dat CI bat buoc lint full.
- Dependency: Can mot dot cleanup rieng theo tung module de tranh pham vi qua lon.
- Huong xu ly: Tach phase lint-hardening cho Arena, Reading, shared libs truoc; sau do bat `--max-warnings=0`.

### 2. Backend unit tests fail do thieu provider/mock

- File: Nhieu spec, vi du `backend/src/modules/placement-dashboard/placement-dashboard.controller.spec.ts`, `backend/src/modules/vocabulary/vocabulary.controller.spec.ts`, `backend/src/modules/placement/placement-question-pool/placement-question-pool.service.spec.ts`.
- Mo ta: TestingModule khai bao service/controller nhung thieu provider nhu `PrismaService`, `AchievementsService`, `SpeakingService`.
- Muc do: Cao neu CI yeu cau test pass.
- Dependency: Can chuan hoa testing module factory/mock provider cho Nest modules.
- Huong xu ly: Tao shared test helper cho PrismaService/settings/achievements; sua tung spec theo dependency that.

### 3. Backend lint fail tren dien rong

- File: Nhieu file backend, vi du `backend/src/common/*`, `backend/src/modules/writing/*`.
- Mo ta: `no-unsafe-*` va `any` ton tai rong, khong lien quan truc tiep home/profile/auth.
- Muc do: Trung binh den cao.
- Dependency: Can typing lai DTO/service responses va test globals.
- Huong xu ly: Tach phase backend lint cleanup; bat dau tu common guards/decorators va writing service vi co mat do loi cao.

### 4. Homepage/Dashboard chua i18n hoa hoan toan

- File: `english-web-build/src/Components/HomePage/HomePage.tsx`, `english-web-build/src/Components/Dashboard/DashboardPage.tsx`.
- Mo ta: Con text hard-code tieng Anh/Viet tu hien trang cu.
- Muc do: Trung binh.
- Dependency: Can them namespace `landing` va mo rong `dashboard` trong 4 locale.
- Huong xu ly: Dot i18n rieng de khong lam vo locale hien co va de reviewer de doc.

### 5. Chua co visual/browser QA

- File: Public homepage, Dashboard, Profile.
- Mo ta: Chua chay automation tai 375/430/768/1024/1280/1440px.
- Muc do: Trung binh.
- Dependency: Can dev server hoac preview server on dinh.
- Huong xu ly: Chay Playwright smoke/visual cho `/`, `/auth`, protected redirect, `/dashboard`, `/profile` voi cookie test hoac mock session.

### 6. Route `/pet` van ton tai

- File: `english-web-build/app/(main)/pet/page.tsx`.
- Mo ta: Prompt yeu cau khong bat user chon pet va khong goi pet API trong Home/Profile/AppShell. Route pet rieng van ton tai trong project.
- Muc do: Thap den trung binh.
- Dependency: Can quyet dinh san pham: giu route noi bo hay an khoi navigation hoan toan.
- Huong xu ly: Neu muon tam an tuyet doi, redirect `/pet` ve `/dashboard` hoac render coming soon page.
