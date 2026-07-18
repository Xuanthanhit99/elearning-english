import { join, resolve } from 'path';
import {
  getListeningAudioDir,
  getListeningAudioUrlPrefix,
  getStaticRootDir,
} from './static-assets.config';

/*
 * UNVERIFIED (chưa chạy được `npm test` trong sandbox — xem
 * docs/phase1-stage6d3-listening-local-fix-verification-report.md).
 * Test không phụ thuộc Nest/DB/network, chỉ đọc process.env + path,
 * nên rủi ro runtime thấp — nhưng vẫn cần chạy thật để xác nhận.
 */
describe('static-assets.config (Stage 6D.3 audio storage fix)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('default: static root là <cwd>/public (giữ nguyên hành vi cũ)', () => {
    delete process.env.STATIC_ROOT_DIR;
    expect(getStaticRootDir()).toBe(join(process.cwd(), 'public'));
  });

  it('default: listening audio dir là <cwd>/public/listening-audio', () => {
    delete process.env.STATIC_ROOT_DIR;
    delete process.env.LISTENING_AUDIO_SUBDIR;
    expect(getListeningAudioDir()).toBe(
      join(process.cwd(), 'public', 'listening-audio'),
    );
  });

  it('default: URL prefix là /listening-audio', () => {
    delete process.env.LISTENING_AUDIO_SUBDIR;
    expect(getListeningAudioUrlPrefix()).toBe('/listening-audio');
  });

  it('STATIC_ROOT_DIR custom: writer dir và static root luôn khớp nhau', () => {
    process.env.STATIC_ROOT_DIR = 'custom-static';
    delete process.env.LISTENING_AUDIO_SUBDIR;

    const staticRoot = getStaticRootDir();
    const audioDir = getListeningAudioDir();

    expect(staticRoot).toBe(resolve(process.cwd(), 'custom-static'));
    // Bất biến quan trọng nhất: audioDir luôn nằm trong staticRoot.
    expect(audioDir.startsWith(staticRoot)).toBe(true);
    expect(audioDir).toBe(join(staticRoot, 'listening-audio'));
  });

  it('LISTENING_AUDIO_SUBDIR custom: URL prefix đổi theo đúng subdir', () => {
    process.env.LISTENING_AUDIO_SUBDIR = 'audio-v2';
    expect(getListeningAudioUrlPrefix()).toBe('/audio-v2');
    expect(getListeningAudioDir().endsWith(join('public', 'audio-v2'))).toBe(
      true,
    );
  });

  it('reject path traversal trong LISTENING_AUDIO_SUBDIR, rơi về default an toàn', () => {
    process.env.LISTENING_AUDIO_SUBDIR = '../../etc';
    const audioDir = getListeningAudioDir();
    const staticRoot = getStaticRootDir();

    expect(audioDir.startsWith(staticRoot)).toBe(true);
    expect(audioDir).toBe(join(staticRoot, 'listening-audio'));
  });

  it('reject absolute path trong LISTENING_AUDIO_SUBDIR, rơi về default an toàn', () => {
    process.env.LISTENING_AUDIO_SUBDIR = '/etc/passwd';
    const audioDir = getListeningAudioDir();
    const staticRoot = getStaticRootDir();

    expect(audioDir.startsWith(staticRoot)).toBe(true);
    expect(audioDir).toBe(join(staticRoot, 'listening-audio'));
  });

  it('URL trả về không bao giờ chứa physical path (chỉ prefix + filename)', () => {
    process.env.STATIC_ROOT_DIR = 'some/deep/custom/path';
    const prefix = getListeningAudioUrlPrefix();

    expect(prefix).not.toContain(process.cwd());
    expect(prefix).not.toContain('some/deep/custom/path');
  });
});
