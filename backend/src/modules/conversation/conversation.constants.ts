export const CONVERSATION_ACTIVITY_CODE = 'CONVERSATION_COMPLETED' as const;

/** Only the most recent N turns are sent back to Gemini as context — unlike
 * chat-session's HISTORY_LIMIT (which takes the OLDEST 20 rows via
 * `orderBy asc + take`, a real latent bug for long sessions), this is
 * deliberately "most recent N", fetched via `orderBy desc + take` then
 * reversed back to chronological order before being sent to the model. */
export const CONVERSATION_MEMORY_WINDOW = 16;

/** Once a session exceeds the memory window, older turns are folded into
 * `ConversationSession.summary` (a short running text summary) instead of
 * being dropped outright or sent in full — bounded context without losing
 * the thread of a long conversation. Regenerated every time the window
 * would otherwise overflow. */
export const CONVERSATION_SUMMARY_TRIGGER_TURNS = 24;

export const CONVERSATION_SCENARIO_CACHE_TTL_SECONDS = 10 * 60;
export const conversationScenarioCacheKey = () => 'conversation:scenarios';

/** Per-session Redis lock so two concurrent requests for the same session
 * (double-click send, a retried request racing the original) can't both
 * reach Gemini at once — the second waits for/rejects instead of firing a
 * duplicate expensive API call. */
export const CONVERSATION_GENERATION_LOCK_TTL_SECONDS = 45;
export const conversationGenerationLockKey = (sessionId: string) =>
  `conversation:generating:${sessionId}`;
