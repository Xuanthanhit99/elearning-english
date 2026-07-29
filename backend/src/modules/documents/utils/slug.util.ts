import { randomBytes } from 'node:crypto';

export function slugify(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'tai-lieu';
}

export async function generateUniqueSlug(
  title: string,
  slugExists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let attempt = 0;
  while (await slugExists(candidate)) {
    attempt += 1;
    candidate =
      attempt < 5
        ? `${base}-${attempt + 1}`
        : `${base}-${randomBytes(3).toString('hex')}`;
  }
  return candidate;
}
