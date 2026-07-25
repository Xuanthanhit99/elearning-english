// hooks/useMiuChat.ts
import { useCallback, useState } from "react";
import { ChatMessage, PetStatus, QuickActionKey } from "../types/chat";
import { sendChatMessage } from "../lib/chat.api";

export function useMiuChat(initialPet: PetStatus) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pet, setPet] = useState<PetStatus>(initialPet);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ASSISTANT",
      content: `Xin chÃ o, mÃ¬nh lÃ  ${initialPet.name}. HÃ´m nay mÃ¬nh sáº½ Ä‘i theo cá»• vÅ© báº¡n há»c tiáº¿ng Anh.`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (payload: { content?: string; quickAction?: QuickActionKey }) => {
      if (payload.content) {
        setMessages((prev) => [
          ...prev,
          { role: "USER", content: payload.content! },
        ]);
      }
      console.log("content", payload);
      setLoading(true);
      setError(null);
      try {
        const data = await sendChatMessage({ sessionId, ...payload });
        setSessionId(data.sessionId);
        setPet(data.petStatus);
        setMessages((prev) => [
          ...prev,
          { role: "ASSISTANT", content: data.reply },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "CÃ³ lá»—i xáº£y ra";
        setError(message);
        setMessages((prev) => [
          ...prev,
          { role: "ASSISTANT", content: "Beacon Ä‘ang hÆ¡i lag ðŸ±ðŸ’¤ Thử lại nhÃ©!" },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  return { messages, pet, loading, error, send };
}
