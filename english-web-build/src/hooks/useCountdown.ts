'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

export function useCountdown(endAt?: string) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now()),
      1000,
    );

    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    if (!endAt) {
      return {
        expired: false,
        label: '--',
      };
    }

    const remaining = Math.max(
      0,
      new Date(endAt).getTime() - now,
    );

    const days = Math.floor(
      remaining / 86400000,
    );
    const hours = Math.floor(
      (remaining % 86400000) / 3600000,
    );
    const minutes = Math.floor(
      (remaining % 3600000) / 60000,
    );

    return {
      expired: remaining === 0,
      label:
        days > 0
          ? `${days} ngày ${hours} giờ`
          : `${hours} giờ ${minutes} phút`,
    };
  }, [endAt, now]);
}
