import { useEffect, useRef, useState } from 'react';

import {
  clearLocalWritingDraft,
  getLocalWritingDraft,
  setLocalWritingDraft,
} from '../storage/writing-draft-storage';

export function useWritingDraft(sessionId?: string | null, serverContent = '') {
  const [content, setContent] = useState(serverContent);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initializedSession = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const activeSessionId = sessionId;

    async function load() {
      setLoaded(false);
      setSaveError(null);
      const local = await getLocalWritingDraft(activeSessionId);
      if (cancelled) return;

      if (serverContent.trim()) {
        setContent(serverContent);
      } else if (local?.content) {
        setContent(local.content);
      } else {
        setContent(serverContent);
      }

      initializedSession.current = activeSessionId;
      setLoaded(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [serverContent, sessionId]);

  useEffect(() => {
    if (!sessionId || initializedSession.current !== sessionId || !loaded) return;

    const timeout = setTimeout(() => {
      setLocalWritingDraft(sessionId, content).catch(() => {
        setSaveError('Chua the luu ban nhap tren thiet bi.');
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [content, loaded, sessionId]);

  async function clearDraft() {
    if (sessionId) {
      await clearLocalWritingDraft(sessionId);
    }
  }

  return {
    clearDraft,
    content,
    loaded,
    saveError,
    setContent,
  };
}
