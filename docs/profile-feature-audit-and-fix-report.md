# Profile Feature Audit And Fix Report

Ngay cap nhat: 2026-07-20

## 1. Hien Trang Ban Dau

### Da co va dung

- Frontend co App Shell, header, sidebar, mobile navigation, theme light/dark va i18n: `english-web-build/src/Components/Layout/AppShell.tsx`, `AppHeader.tsx`, `AppSidebar.tsx`, `MobileNavigation.tsx`.
- API client dung cookie auth qua `withCredentials: true`, co refresh/logout interceptor chung va khong luu access token trong `localStorage`: `english-web-build/src/lib/axios.ts`.
- Auth store co `user` va `setUser`, header/doc menu doc avatar/name tu store: `english-web-build/src/store/authStore.ts`, `english-web-build/src/Components/Layout/AppHeader.tsx`.
- Backend co `GET /auth/me`, `PATCH /auth/me/profile`, `PATCH /auth/me/avatar`, dung `JwtAuthGuard`, lay user id tu request da xac thuc va dung `UpdateProfileDto`: `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.service.ts`, `backend/src/modules/auth/dto/update-profile.dto.ts`.
- Backend dashboard co endpoint tong hop du lieu that cho XP, streak, skill progress, recent sessions, achievements va learning path: `backend/src/modules/dashboard/dashboard.service.ts`.
- Backend achievements co module that: `backend/src/modules/achievements/achievements.controller.ts`, `backend/src/modules/achievements/achievements.service.ts`.
- Backend pet khong nen xoa vi nhieu module van phu thuoc `PetProfile`/`PetReward`: progress, learning path, vocabulary, writing, leaderboard rewards, achievements.

### Da co nhung chua hoan chinh

- `english-web-build/src/Components/Profile/ProfilePage.tsx` cu goi nhieu endpoint rieng le va fallback sang so lieu gia nhu level 18, XP 850, streak 18, 2458 tu, 128 bai, 128 gio hoc, achievement/vat pham/ban be gia.
- Profile cu dung layout rieng trong khi app da co App Shell, gay trung sidebar/topbar va lech he thong giao dien.
- Profile cu goi `/pets/me`, viec nay co the tao pet pending khi chi xem Profile.
- Edit Profile cu chi cho sua `fullname`, chua dung het cac field backend dang ho tro nhu `username`, `bio`, `goal`, `phone`, `englishLevel`, `learningGoal`.
- Modal edit Profile cu tu viet overlay, thieu focus trap/Escape/outside click theo dialog system chung.
- Loading/error/empty state cua Profile cu chua ro rang; API fail thi UI van hien so gia.
- i18n da co san nhung Profile cu hard-code text.

### Chua co

- Chua co endpoint `/profile/me` rieng. Hien tai co the dung `/auth/me` va `/dashboard` ma khong can tao backend contract moi.
- Chua co frontend upload avatar hoan chinh gom preview, validate file type/size, loading va rollback. Backend da co `PATCH /auth/me/avatar`, nhung frontend Profile chua trien khai de tranh tao upload gia.
- Chua co test frontend Profile chuyen biet trong project; `package.json` frontend hien khong co script test.

### Luong modal/chon thu cung cu

- `PetSelectionPrompt` ton tai o `english-web-build/src/Components/Pets/PetSelectionPrompt.tsx`.
- App Shell truoc do import `PetSelectionPrompt`, goi `/pets/me` sau `/auth/me`, neu `mustChoosePet` thi tat welcome modal va mo prompt chon thu cung.
- App Shell cung render `FloatingPetCompanion`, component nay goi `/pets/me` tren moi man hinh chinh va hien bong nhac "chon linh thu" neu pet chua duoc chon.
- `/pets/me` backend dung `getOrCreatePet`, nen viec frontend chi doc trang cung co the tao `PetProfile` pending.
- Viec bo trigger modal/prompt khong lam hong auth, onboarding hay placement vi cac luong do khong can pet de xac thuc hay lam bai.

## 2. Nhung Thay Doi Da Thuc Hien

### `english-web-build/src/Components/Layout/AppShell.tsx`

- Bo import va render `PetSelectionPrompt`.
- Bo call `/pets/me` trong luong `getMe`.
- Bo state `showPetPrompt` va `petDaysLeft`.
- Bo render `FloatingPetCompanion` trong App Shell.
- Ly do: khong tu dong mo modal/chon thu cung sau dang nhap, dang ky, vao dashboard hoac app shell; khong tao pet pending chi vi user vao app.

### `english-web-build/src/Components/Profile/ProfilePage.tsx`

- Thay Profile cu bang man hinh Profile dung App Shell san co.
- Dung du lieu that tu `GET /auth/me`, `GET /dashboard`, `GET /achievements/overview`.
- Khong goi `/pets/me`, khong goi API chon/cham pet, khong hien so lieu pet gia.
- Them loading skeleton, error state co nut thu lai, empty state cho learning stats/achievements.
- Them edit Profile dung DTO gon gom `fullname`, `username`, `bio`, `goal`, `phone`, `englishLevel`, `learningGoal`; khong gui `id`, `userId`, `role`, `status`, `createdAt`, `updatedAt`.
- Dong bo Auth store sau khi luu thanh cong.
- Dung `LumiverseDialog` chung cho edit modal va companion modal, co focus management, Escape va outside click theo dialog hien co.
- Khu "Ban dong hanh hoc tap" chuyen sang card "Sap ra mat"; chi mo modal thong bao khi nguoi dung bam.
- Ly do: Profile khong con demo/fake data, khong phu thuoc pet selection va phu hop design token Lumiverse.

### `english-web-build/src/i18n/types.ts`

- Them namespace `profile` vao dictionary type.
- Ly do: Profile moi khong hard-code text ngoai component.

### `english-web-build/src/i18n/locales/vi.ts`
### `english-web-build/src/i18n/locales/en.ts`
### `english-web-build/src/i18n/locales/zh.ts`
### `english-web-build/src/i18n/locales/de.ts`

- Them day du key `profile` va `profile.companion` cho tat ca locale.
- Xoa block `profile` cu bi trung key.
- Ly do: cac locale co cung cau truc key va khong hien key thieu tren UI.

## 3. Tinh Nang Profile Sau Khi Hoan Thanh

- Hoan thanh: Profile render bang du lieu backend that tu `/auth/me`, `/dashboard`, `/achievements/overview`.
- Hoan thanh: Loading skeleton, error state co retry, empty state trung thuc.
- Hoan thanh: Edit Profile gui DTO rieng, khong gui field chi doc.
- Hoan thanh: Auth store duoc cap nhat sau khi luu thanh cong.
- Hoan thanh: Khu thu cung trong Profile la "Sap ra mat" va chi mo modal thong bao khi bam.
- Hoan thanh: Khong auto open pet modal/prompt trong App Shell.
- Hoan thanh mot phan: Avatar hien thi avatar that/fallback initials, nhung upload avatar frontend chua trien khai.
- Hoan thanh mot phan: Achievement hien thi du lieu that neu endpoint co du lieu; neu chua co thi hien empty state.
- Bi chan boi dependency: Frontend test Profile chua co vi project frontend chua co test runner/script test.
- Chua trien khai: Endpoint `/profile/me` rieng, vi `/auth/me` + `/dashboard` hien da du va tranh doi backend contract.

## 4. Phan Thu Cung

- Modal chon thu cung khong con duoc App Shell tu mo sau dang ky/dang nhap.
- Modal chon thu cung khong con tu mo khi vao dashboard hoac cac man hinh trong App Shell.
- User khong bi chan vi chua chon thu cung.
- App Shell khong con goi `/pets/me`, nen khong con tao pet pending tu viec vao app.
- Profile khong con goi `/pets/me`.
- Khu thu cung trong Profile hien `Sap ra mat`.
- Bam vao khu thu cung trong Profile mo modal thong bao "Tinh nang dang duoc phat trien".
- UI Profile moi khong goi API chon thu cung, khong luu thay doi thu cung.
- Backend Pet model/API duoc giu nguyen vi con dependency tu progress, learning-path, achievements, leaderboard va module hoc tap.

## 5. Ket Qua Kiem Tra

- Frontend lint rieng cac file da sua: PASS.
  - Lenh: `npx eslint src/Components/Profile/ProfilePage.tsx src/Components/Layout/AppShell.tsx src/i18n/types.ts src/i18n/locales/vi.ts src/i18n/locales/en.ts src/i18n/locales/zh.ts src/i18n/locales/de.ts`
- Frontend typecheck: PASS sau khi build regen `.next`.
  - Lenh: `npx tsc --noEmit --pretty false`
- Frontend build: PASS.
  - Lenh: `npm run build`
- Frontend lint toan repo: FAIL do loi ton tai san o nhieu module khong lien quan Profile, vi du `ArenaPage.tsx`, reading components, hooks va lib co `any`, rule React purity/set-state-in-effect.
- Backend build: PASS.
  - Lenh: `npm run build`
- Backend test: FAIL do spec ton tai san thieu provider/mock va Redis lock test, khong lien quan thay doi Profile.
  - Vi du: `vocabulary.controller.spec.ts` thieu `AchievementsService`; nhieu service spec thieu `PrismaService`; listening spec log `ECONNREFUSED`.
- Backend lint: TIMEOUT sau 120s khi chay `npx eslint "src/**/*.ts" --max-warnings=0`.
- Prisma validate: PASS.
  - Lenh: `npx prisma validate`
- Prisma migrate status: PASS, database schema up to date.
  - Lenh: `npx prisma migrate status`
- Responsive desktop/tablet/mobile: duoc bao phu bang CSS grid responsive va build thanh cong; chua thuc hien visual QA bang browser screenshot trong phien nay.
- Light/dark mode: Profile dung `lumiverse-*` token va `Lumiverse` components; chua thuc hien visual QA bang screenshot trong phien nay.

## 6. Van De Con Lai

### Frontend upload avatar chua hoan thien

- Mo ta: Backend co `PATCH /auth/me/avatar`, nhung Profile frontend chua co validate file type/size, preview, upload loading va error rollback.
- File lien quan: `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.service.ts`, `english-web-build/src/Components/Profile/ProfilePage.tsx`.
- Muc do anh huong: Trung binh. User van xem avatar/fallback duoc, nhung chua doi avatar trong Profile.
- Huong xu ly: Them UI upload avatar rieng, validate image MIME/size o frontend, goi endpoint avatar that, cap nhat Auth store sau upload.

### Chua co test frontend Profile

- Mo ta: Project frontend chua co script test/test runner cho component Profile.
- File lien quan: `english-web-build/package.json`, `english-web-build/src/Components/Profile/ProfilePage.tsx`.
- Muc do anh huong: Trung binh. Build/typecheck da qua nhung chua co test tu dong cho modal/edit/empty state.
- Huong xu ly: Them test runner theo stack hien co neu team dong y, hoac bo sung Playwright/e2e cho `/profile`.

### Backend test suite dang fail vi spec cu

- Mo ta: `npm run test -- --runInBand` fail 62 suites, chu yeu do test module thieu provider/mock (`PrismaService`, service dependencies) va Redis lock test.
- File lien quan: nhieu file `backend/src/modules/**/*.spec.ts`, vi du `vocabulary.controller.spec.ts`, `placement-dashboard.controller.spec.ts`, `lessons.service.spec.ts`.
- Muc do anh huong: Cao cho CI backend chung, thap cho thay doi Profile nay vi khong sua backend contract.
- Huong xu ly: Cap nhat test modules de mock providers day du, tach integration tests can Redis/DB, hoac cau hinh test env rieng.

### Backend lint toan repo chua xac nhan

- Mo ta: `npx eslint "src/**/*.ts" --max-warnings=0` bi timeout sau 120s.
- File lien quan: `backend/eslint.config.mjs`, toan bo `backend/src`.
- Muc do anh huong: Thap voi thay doi Profile nay, nhung can cho CI tong.
- Huong xu ly: Chay lint backend voi timeout dai hon hoac theo tung module de tach loi.

### Text locale cu trong repo co dau hieu tung bi mojibake

- Mo ta: Mot so file locale/attachment hien thi text tieng Viet bi loi ma hoa trong output tool. Profile keys moi duoc them bang ASCII cho `vi` de tranh lam nang tinh trang nay.
- File lien quan: `english-web-build/src/i18n/locales/vi.ts`, `en.ts`, `zh.ts`, `de.ts`.
- Muc do anh huong: Thap voi logic, trung binh voi chat luong hien thi neu cac key cu van duoc render.
- Huong xu ly: Chuan hoa encoding UTF-8 cho locale files va sua dan cac chuoi mojibake cu.
