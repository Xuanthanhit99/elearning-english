'use client';

import { Loader2 } from 'lucide-react';
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
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <p className="font-black text-slate-900">
            Không thể mở lộ trình học
          </p>
          <p className="mt-3 text-sm leading-6 text-red-600">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!access || !access.allowed) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-4 font-black text-slate-900">
            Đang kiểm tra lộ trình học...
          </p>
          {access?.message ? (
            <p className="mt-2 text-sm text-slate-500">
              {access.message}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
