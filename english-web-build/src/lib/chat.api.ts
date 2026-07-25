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
      getApiErrorMessage(error, "Beacon Ä‘ang lag xÃ­u, Thử lại sau nhÃ©"),
    );
  }
}

export async function createChatSession(): Promise<{ id: string }> {
  try {
    const { data } = await api.post("/chat-session/sessions");
    return (data?.data ?? data) as { id: string };
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "KhÃ´ng thá»ƒ táº¡o phiÃªn trÃ² chuyá»‡n"),
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
      getApiErrorMessage(error, "KhÃ´ng thá»ƒ táº£i lá»‹ch sá»­ trÃ² chuyá»‡n"),
    );
  }
}

export async function getPetStatus(): Promise<PetStatus> {
  try {
    const { data } = await api.get("/chat-session/pet");
    return (data?.data ?? data) as PetStatus;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "KhÃ´ng thá»ƒ táº£i thÃ´ng tin linh thÃº"),
    );
  }
}
