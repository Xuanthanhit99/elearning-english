import { join, resolve, sep } from 'path';

/*
 * Stage 6D.3: nguồn cấu hình DUY NHẤT cho "thư mục static root" của
 * backend. Trước đây `ServeStaticModule.forRoot()` (app.module.ts)
 * hard-code `join(process.cwd(), 'public')` trong khi
 * `listening-tts.service.ts` đọc audio dir từ một env riêng
 * (`LISTENING_AUDIO_STORAGE_DIR`) không liên quan gì tới static root
 * — nếu 2 nơi đó lệch nhau, file ghi ra không nằm trong phạm vi static
 * server phục vụ, gây 404. File này đảm bảo cả 2 phía luôn tính từ
 * cùng 1 giá trị.
 *
 * Mặc định giữ nguyên hành vi cũ (`public/` dưới `process.cwd()`), nên
 * không đổi behavior nếu không set env mới.
 */

const DEFAULT_STATIC_ROOT_SUBDIR = 'public';
const DEFAULT_LISTENING_AUDIO_SUBDIR = 'listening-audio';

/**
 * Thư mục static root thật sự được `ServeStaticModule` phục vụ tại "/".
 * Override bằng `STATIC_ROOT_DIR` (đường dẫn tuyệt đối hoặc tương đối
 * so với cwd). Mặc định: `<cwd>/public` — đúng hành vi cũ.
 */
export function getStaticRootDir(): string {
  const configured = process.env.STATIC_ROOT_DIR?.trim();

  if (configured) {
    return resolve(process.cwd(), configured);
  }

  return join(process.cwd(), DEFAULT_STATIC_ROOT_SUBDIR);
}

/**
 * Chuẩn hoá subdir do env cấu hình: loại bỏ path traversal (`..`),
 * loại bỏ ký tự dẫn tới path tuyệt đối (`/`, `\\`, ổ đĩa Windows
 * `C:`...). Nếu giá trị không an toàn, rơi về default thay vì throw —
 * ưu tiên "an toàn, không crash app" hơn "chặn cứng".
 */
function sanitizeSubdir(
  rawValue: string | undefined,
  fallback: string,
): string {
  const value = rawValue?.trim();

  if (!value) {
    return fallback;
  }

  const hasTraversal = value
    .split(/[/\\]+/)
    .some((segment) => segment === '..');
  const looksAbsolute = /^([a-zA-Z]:)?[/\\]/.test(value);

  if (hasTraversal || looksAbsolute) {
    return fallback;
  }

  return value;
}

/**
 * Thư mục vật lý để ghi audio Listening — LUÔN là subdir bên trong
 * static root ở trên (không còn override toàn bộ đường dẫn tuyệt đối
 * như `LISTENING_AUDIO_STORAGE_DIR` cũ, để không thể lệch khỏi phạm vi
 * `ServeStaticModule` phục vụ). Override tên subdir bằng
 * `LISTENING_AUDIO_SUBDIR` (chỉ tên thư mục con, không phải path đầy
 * đủ). Mặc định: `listening-audio`.
 */
export function getListeningAudioDir(): string {
  const staticRoot = getStaticRootDir();
  const subdir = sanitizeSubdir(
    process.env.LISTENING_AUDIO_SUBDIR,
    DEFAULT_LISTENING_AUDIO_SUBDIR,
  );

  const resolvedDir = resolve(staticRoot, subdir);
  const resolvedRoot = resolve(staticRoot);

  /*
   * Double-check phòng thủ: nếu vì lý do nào đó (bug tương lai trong
   * sanitizeSubdir, hoặc thay đổi logic) resolvedDir thoát ra ngoài
   * staticRoot, rơi về default an toàn thay vì trả path không kiểm
   * soát được.
   */
  const isInsideRoot =
    resolvedDir === resolvedRoot || resolvedDir.startsWith(resolvedRoot + sep);

  if (!isInsideRoot) {
    return join(resolvedRoot, DEFAULT_LISTENING_AUDIO_SUBDIR);
  }

  return resolvedDir;
}

/**
 * Prefix URL public tương ứng với `getListeningAudioDir()` — luôn là
 * `/<subdir>` vì `ServeStaticModule` serve `staticRoot` tại `serveRoot:
 * '/'`, nên `staticRoot/<subdir>/file` luôn lộ ra ở `/<subdir>/file`.
 * Không bao giờ trả absolute filesystem path ra URL.
 */
export function getListeningAudioUrlPrefix(): string {
  const subdir = sanitizeSubdir(
    process.env.LISTENING_AUDIO_SUBDIR,
    DEFAULT_LISTENING_AUDIO_SUBDIR,
  );

  return `/${subdir}`;
}
