"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/src/store/authStore";
import { getCommunityUploadAccess } from "@/src/lib/documents-api";

/**
 * Drives whether the community-upload CTA/form is shown. This is UX
 * only — CommunityDocumentUploadGuard on the backend is the real
 * enforcement, so a `false`/`null` result here should hide/disable the
 * entry point, never silently trust a stale `true`.
 */
export function useCommunityUploadAccess() {
  const user = useAuthStore((s) => s.user);
  const [canUpload, setCanUpload] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setCanUpload(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCommunityUploadAccess()
      .then((res) => {
        if (!cancelled) setCanUpload(res.canUploadCommunityDocuments);
      })
      .catch(() => {
        if (!cancelled) setCanUpload(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { canUpload, loading };
}
