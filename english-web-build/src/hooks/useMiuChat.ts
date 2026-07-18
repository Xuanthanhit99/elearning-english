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
      content: `Xin chào, mình là ${initialPet.name}. Hôm nay mình sẽ đi theo cổ vũ bạn học tiếng Anh.`,
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
        const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(message);
        setMessages((prev) => [
          ...prev,
          { role: "ASSISTANT", content: "Miu đang hơi lag 🐱💤 Thử lại nhé!" },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  return { messages, pet, loading, error, send };
}
