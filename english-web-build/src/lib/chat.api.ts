// services/chat.api.ts
import { getApiErrorMessage } from "./api-error";
import {
  SendMessageParams,
  SendMessageResponse,
  ChatMessage,
  PetStatus,
} from "../types/chat";
import { api } from "./axios";

export async function sendChatMessage(
  params: SendMessageParams,
): Promise<SendMessageResponse> {
  try {
    const { data } = await api.post("/chat-session/message", params);
    return (data?.data ?? data) as SendMessageResponse;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Miu đang lag xíu, thử lại sau nhé"),
    );
  }
}

export async function createChatSession(): Promise<{ id: string }> {
  try {
    const { data } = await api.post("/chat-session/sessions");
    return (data?.data ?? data) as { id: string };
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Không thể tạo phiên trò chuyện"),
    );
  }
}

export async function getChatMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  try {
    const { data } = await api.get(
      `/chat-session/sessions/${sessionId}/messages`,
    );
    return (data?.data ?? data) as ChatMessage[];
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Không thể tải lịch sử trò chuyện"),
    );
  }
}

export async function getPetStatus(): Promise<PetStatus> {
  try {
    const { data } = await api.get("/chat-session/pet");
    return (data?.data ?? data) as PetStatus;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Không thể tải thông tin linh thú"),
    );
  }
}
