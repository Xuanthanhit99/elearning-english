"use client";

import { AlertCircle, Loader2, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPlacementDashboard } from "@/src/lib/placement-dashboard-api";

export default function PlacementEntry() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function routeByStatus() {
      try {
        setError("");
        const dashboard = await getPlacementDashboard();

        if (!mounted) return;

        if (dashboard.state === "FIRST_TIME") {
          router.replace("/placement/introduction");
          return;
        }

        if (dashboard.state === "IN_PROGRESS") {
          router.replace(
            dashboard.currentTest?.testUrl ?? "/placement/introduction",
          );
          return;
        }

        if (dashboard.state === "PROCESSING") {
          router.replace(
            dashboard.currentTest?.processingUrl ?? "/placement/dashboard",
          );
          return;
        }

        router.replace("/placement/dashboard");
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Khong the kiem tra trang thai Placement Test.",
        );
      }
    }

    void routeByStatus();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbff] p-6">
      <section className="w-full max-w-xl rounded-[28px] border border-violet-100 bg-white p-8 text-center shadow-[0_18px_60px_rgba(76,29,149,0.08)]">
        {error ? (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-5 text-2xl font-black text-slate-950">
              Chua the mo Placement Test
            </h1>
            <p className="mt-3 leading-7 text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-7 rounded-xl bg-violet-600 px-6 py-3 font-black text-white"
            >
              Thu lai
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Target className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-black text-slate-950">
              Dang kiem tra trang thai cua ban
            </h1>
            <p className="mt-3 leading-7 text-slate-600">
              He thong dang dua ban den dung man hinh Placement Test.
            </p>
            <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-violet-600" />
          </>
        )}
      </section>
    </main>
  );
}
