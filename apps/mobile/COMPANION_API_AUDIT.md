# BeaconVie Companion API Audit

## Conversation

1. Conversation history is loaded with `GET /chat-session/sessions/:id/messages` in `backend/src/modules/chat-session/chat-session.controller.ts`, implemented by `ChatSessionService.getMessages`.
2. Companion uses multiple `ChatSession` rows, but there is no list-sessions endpoint. The web floating companion keeps the active session in local component state.
3. Conversations are created by `POST /chat-session/sessions` or implicitly by `POST /chat-session/message` when `sessionId` is omitted.
4. Messages are returned as the complete message list for the session; there is no pagination.
5. Pagination is not cursor-based for Companion.
6. Assistant messages are persisted in `ChatSessionService.sendMessage` after Gemini/backend response generation.
7. Partial generations are not persisted because Companion generation is synchronous, message-level HTTP, not streaming.

## Generation

8. User messages are submitted with `POST /chat-session/message`, body `{ sessionId?, content? }` or `{ sessionId?, quickAction? }`.
9. AI generation is synchronous from the client perspective: the request returns after the backend has generated and persisted the assistant reply.
10. Streaming is not used for Companion. The separate `/conversation` speaking-practice module streams plain text chunks over POST, but that is not the Miu/pet Companion UI consumed by `english-web-build/src/lib/chat.api.ts`.
11. Companion exposes no generation status enum. Mobile can only show local sending/generating state while the request is pending.
12. Completion is detected when `POST /chat-session/message` returns `{ sessionId, reply, action?, petStatus }`.
13. Cancel generation is not supported for Companion.
14. Retry/regenerate is not supported as a backend operation. Send is non-idempotent and can incur AI cost, so mobile must not auto-retry.
15. Stop/resume does not exist for Companion.
16. Duplicate generation is protected only by UI disabling while a send is pending and backend throttling; no Companion generation lock exists.
17. `QuestionGenerationLockService` and conversation module Redis locks exist elsewhere, but not in `chat-session`.
18. Generation requests are not idempotent; no client request ID is accepted.

## Provider / cost

19. Companion currently uses `GeminiChatService` directly with `@google/generative-ai`.
20. Provider choice is hidden from the web/mobile client; the client only sees text and optional navigation action.
21. No Companion-specific daily/monthly cost-control service was found.
22. Cost-limit response is unsupported for Companion because no cost-control contract exists on `chat-session`.
23. `POST /chat-session/message` has Nest throttling: 15 messages per 60 seconds per guarded route context.
24. No fallback provider behavior exists in `GeminiChatService`.
25. No mock-provider production restriction exists for Companion; missing `GEMINI_API_KEY` fails service construction.

## Memory

26. Companion memory retrieval is not implemented in `chat-session`.
27. No memory references are returned.
28. Explainability is not exposed.
29. Users cannot inspect why a memory was used through Companion because memory use is unsupported.
30. Suggestions exist only as fixed quick actions: `CHEER_UP`, `BANTER`, `QUICK_TIP`.
31. Forget/delete memory is not available.
32. Memory consent is not part of the Companion contract.
33. Memory disable controls are not part of the Companion contract.
34. When memory is unavailable, Companion still works because it does not depend on memory.

## Socket.IO

35. Companion uses no Socket.IO namespace.
36. No Companion socket events exist.
37. Mobile handshake token support is not required for Companion.
38. No backend socket auth change is required.

## Relevant Source Files

- Backend controller: `backend/src/modules/chat-session/chat-session.controller.ts`
- Backend service: `backend/src/modules/chat-session/chat-session.service.ts`
- DTO: `backend/src/modules/chat-session/dto/create-message.dto.ts`
- Backend AI adapter: `backend/src/modules/chat-session/gemini-chat.service.ts`
- Safety filter: `backend/src/modules/chat-session/content-filter.service.ts`
- Tool/action mapping: `backend/src/modules/chat-session/chat-tools.ts`
- Prisma models: `ChatSession`, `ChatMessage`, `ChatRole`, `QuickAction`, `UserPet` in `backend/prisma/schema.prisma`
- Web API consumer: `english-web-build/src/lib/chat.api.ts`
- Web UI consumers: `english-web-build/src/Components/Pets/FloatingPetCompanion.tsx`, `english-web-build/src/Components/MiuChatModal/MiuChatModal.tsx`
- Separate speaking-practice streamer: `backend/src/modules/conversation/*`, `english-web-build/src/lib/conversation-api.ts`
