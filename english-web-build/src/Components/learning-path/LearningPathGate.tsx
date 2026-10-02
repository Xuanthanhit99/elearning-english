'use client';

import { Loader2 } from 'lucide-react';
import { BeaconVieCard, BeaconVieState } from '@/src/Components/UI/BeaconVie';
import { useRouter } from 'next/navigation';
import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  getLearningPathAccess,
  LearningPathAccessData,
} from '@/src/lib/learning-path-access-api';

export default function LearningPathGate({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [access, setAccess] =
    useState<LearningPathAccessData | null>(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        setError('');

        const result =
          await getLearningPathAccess();

        setAccess(result);

        if (
          !result.allowed &&
          !redirectedRef.current
        ) {
          redirectedRef.current = true;
          router.replace(result.nextUrl);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể kiểm tra quyền truy cập lộ trình.',
        );
      }
    })();
  }, [router, retryKey]);

  if (error) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          <BeaconVieState
            title="Không thể mở lộ trình học"
            description={error}
            actionLabel="Thử lại"
            tone="error"
            onAction={() => setRetryKey((value) => value + 1)}
          />
        </div>
      </main>
    );
  }

  if (!access || !access.allowed) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-4 sm:p-6" aria-live="polite">
        <BeaconVieCard className="w-full max-w-md p-6 text-center sm:p-8">
          <Loader2 aria-hidden className="mx-auto h-9 w-9 animate-spin text-[var(--BeaconVie-primary)]" />
          <p className="mt-4 text-lg font-black text-[var(--BeaconVie-ink)]">
            Đang kiểm tra lộ trình học...
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--BeaconVie-muted)]">
            {access?.message ?? 'Đang đồng bộ quyền truy cập và tiến độ của bạn.'}
          </p>
        </BeaconVieCard>
      </main>
    );
  }

  return <>{children}</>;
}
