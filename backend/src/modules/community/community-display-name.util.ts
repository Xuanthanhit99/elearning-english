type UserLikeWithSettings = {
  fullname?: string | null;
  settings?: {
    communityNickname?: string | null;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !(value instanceof Date)
  );
}

function applyDisplayNameToRecord(record: Record<string, unknown>) {
  const maybeUser = record as UserLikeWithSettings;
  const nickname = maybeUser.settings?.communityNickname?.trim();

  if (nickname) {
    maybeUser.fullname = nickname;
  }

  if ('settings' in record) {
    delete record.settings;
  }
}

export function applyCommunityDisplayNames<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => applyCommunityDisplayNames(item)) as T;
  }

  if (!isRecord(value)) {
    return value;
  }

  const clone: Record<string, unknown> = { ...value };
  applyDisplayNameToRecord(clone);

  for (const [key, child] of Object.entries(clone)) {
    clone[key] = applyCommunityDisplayNames(child);
  }

  return clone as T;
}
