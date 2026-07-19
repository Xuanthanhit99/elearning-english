export const DEFAULT_USER_TIMEZONE = 'Asia/Ho_Chi_Minh';

export type UserDateRange = {
  start: Date;
  end: Date;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getFormatter(timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

export function normalizeUserTimezone(timezone?: string | null) {
  if (!timezone) return DEFAULT_USER_TIMEZONE;

  try {
    getFormatter(timezone).format(new Date());
    return timezone;
  } catch {
    return DEFAULT_USER_TIMEZONE;
  }
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const parts = getFormatter(timezone).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function getOffsetMs(date: Date, timezone: string) {
  const parts = getZonedParts(date, timezone);
  const utcWallTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return utcWallTime - date.getTime();
}

export function zonedTimeToUtc(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const normalizedTimezone = normalizeUserTimezone(timezone);
  const initial = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const firstPass = new Date(
    initial.getTime() - getOffsetMs(initial, normalizedTimezone),
  );
  return new Date(
    initial.getTime() - getOffsetMs(firstPass, normalizedTimezone),
  );
}

export function dateKeyInTimezone(date: Date, timezone: string) {
  const normalizedTimezone = normalizeUserTimezone(timezone);
  const parts = getZonedParts(date, normalizedTimezone);
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

export function startOfUserDay(date: Date, timezone: string) {
  const normalizedTimezone = normalizeUserTimezone(timezone);
  const parts = getZonedParts(date, normalizedTimezone);
  return zonedTimeToUtc(
    normalizedTimezone,
    parts.year,
    parts.month,
    parts.day,
  );
}

export function addUserDays(date: Date, days: number, timezone: string) {
  const normalizedTimezone = normalizeUserTimezone(timezone);
  const parts = getZonedParts(date, normalizedTimezone);
  const localNoon = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, 12),
  );
  const target = getZonedParts(localNoon, normalizedTimezone);
  return zonedTimeToUtc(
    normalizedTimezone,
    target.year,
    target.month,
    target.day,
  );
}

export function endOfUserDay(date: Date, timezone: string) {
  return addUserDays(startOfUserDay(date, timezone), 1, timezone);
}

export function startOfUserWeek(date: Date, timezone: string) {
  const normalizedTimezone = normalizeUserTimezone(timezone);
  const start = startOfUserDay(date, normalizedTimezone);
  const localWeekday = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizedTimezone,
    weekday: 'short',
  }).format(start);
  const mondayOffset: Record<string, number> = {
    Mon: 0,
    Tue: -1,
    Wed: -2,
    Thu: -3,
    Fri: -4,
    Sat: -5,
    Sun: -6,
  };
  return addUserDays(start, mondayOffset[localWeekday] ?? 0, normalizedTimezone);
}

export function endOfUserWeek(date: Date, timezone: string) {
  return addUserDays(startOfUserWeek(date, timezone), 7, timezone);
}

export function startOfUserMonth(date: Date, timezone: string) {
  const normalizedTimezone = normalizeUserTimezone(timezone);
  const parts = getZonedParts(date, normalizedTimezone);
  return zonedTimeToUtc(normalizedTimezone, parts.year, parts.month, 1);
}

export function endOfUserMonth(date: Date, timezone: string) {
  const normalizedTimezone = normalizeUserTimezone(timezone);
  const parts = getZonedParts(date, normalizedTimezone);
  return zonedTimeToUtc(normalizedTimezone, parts.year, parts.month + 1, 1);
}

export function getUserDaySeries(
  startInclusive: Date,
  days: number,
  timezone: string,
) {
  return Array.from({ length: days }, (_, index) =>
    addUserDays(startInclusive, index, timezone),
  );
}
