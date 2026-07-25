import { api, refreshSession } from "@/src/lib/axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export type ConversationMode =
  | "FREE"
  | "TOPIC"
  | "SCENARIO"
  | "ROLEPLAY"
  | "INTERVIEW"
  | "TRAVEL"
  | "BUSINESS"
  | "DAILY_ENGLISH"
  | "DEBATE"
  | "STORY";

export type ConversationStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type ConversationRole = "USER" | "ASSISTANT";

export type ConversationScenario = {
  id: string;
  code: string;
  title: string;
  description: string;
  mode: ConversationMode;
  difficulty: CefrLevel;
  icon: string;
  requiredVocabulary: string[];
  grammarFocus: string[];
  goals: string[];
};

export type ConversationMessage = {
  id: string;
  sessionId: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
};

export type ConversationSession = {
  id: string;
  userId: string;
  scenarioId: string | null;
  mode: ConversationMode;
  difficulty: CefrLevel;
  status: ConversationStatus;
  turnCount: number;
  startedAt: string;
  lastMessageAt: string;
  completedAt: string | null;
  overallScore: number | null;
  fluencyScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  pronunciationScore: number | null;
  confidenceScore: number | null;
  naturalnessScore: number | null;
  feedback: string | null;
  recommendedVocabulary: string[];
  recommendedGrammar: string[];
  scenario: ConversationScenario | null;
  messages: ConversationMessage[];
};

export type ConversationFinishResult = ConversationSession & {
  grammarCorrections: Array<{ original: string; corrected: string; explanation: string }>;
  vocabularySuggestions: string[];
};

type ApiResponse<T> = { success: boolean; data: T };

export async function getConversationScenarios() {
  const response = await api.get<ApiResponse<ConversationScenario[]>>(
    "/conversation/scenarios",
  );
  return response.data.data;
}

export async function startConversation(payload: {
  scenarioCode?: string;
  mode?: ConversationMode;
  difficulty?: CefrLevel;
}) {
  const response = await api.post<
    ApiResponse<{ session: ConversationSession; systemPrompt: string }>
  >("/conversation/sessions", payload);
  return response.data.data;
}

export async function listConversations(
  params: { status?: ConversationStatus; limit?: number } = {},
) {
  const response = await api.get<ApiResponse<ConversationSession[]>>(
    "/conversation/sessions",
    { params },
  );
  return response.data.data;
}

export async function getConversation(sessionId: string) {
  const response = await api.get<ApiResponse<ConversationSession>>(
    `/conversation/sessions/${sessionId}`,
  );
  return response.data.data;
}

export async function finishConversation(sessionId: string) {
  const response = await api.post<ApiResponse<ConversationFinishResult>>(
    `/conversation/sessions/${sessionId}/finish`,
  );
  return response.data.data;
}

/**
 * Streams the AI reply as plain-text chunks via `fetch(...).body.getReader()`
 * against the backend's chunked POST response (see ConversationController —
 * deliberately not EventSource/SSE, which is GET-only and awkward for a
 * message body). Not built on the shared `api` axios instance because axios
 * doesn't expose a streaming response body reader the way raw `fetch` does.
 *
 * Mirrors axios.ts's own 401-then-refresh-then-retry-once behavior (the
 * interceptor there only covers axios calls, not this raw fetch), so an
 * expired access token doesn't need a full page reload to recover from —
 * one retry after a session refresh, same as every other authenticated call.
 */
export async function streamConversationMessage(
  sessionId: string,
  content: string,
  options: { signal?: AbortSignal; onChunk: (chunk: string) => void },
): Promise<void> {
  const doFetch = () =>
    fetch(`${API_BASE_URL}/conversation/sessions/${sessionId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: options.signal,
    });

  let response = await doFetch();

  if (response.status === 401) {
    try {
      await refreshSession();
      response = await doFetch();
    } catch {
      // fall through — the error below will surface as a normal failure
    }
  }

  if (!response.ok || !response.body) {
    let message = "Could not reach the conversation partner. Please try again.";
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === "string") message = errorBody.message;
    } catch {
      // response wasn't JSON (e.g. a network-level failure) — keep the default message
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) options.onChunk(text);
  }
}
