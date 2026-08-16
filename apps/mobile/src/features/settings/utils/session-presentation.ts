import type { DeviceSession } from '../types/settings';

export function resolveSessionPresentation(session: DeviceSession) {
  const title =
    session.deviceName ||
    [session.browser, session.os].filter(Boolean).join(' on ') ||
    'Unknown device';
  const details = [session.browser, session.os, session.ipAddress].filter(Boolean).join(' | ');
  const lastActive = session.lastActiveAt
    ? new Date(session.lastActiveAt).toLocaleString()
    : null;

  return {
    title,
    details,
    lastActive,
  };
}
