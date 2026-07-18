// types/chat.ts
export type ChatRole = "USER" | "ASSISTANT";
export type QuickActionKey = "CHEER_UP" | "BANTER" | "QUICK_TIP";

export type ChatMessage = {
  id?: string;
  sessionId?: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
  action?: { path: string; label: string } | null;
};

export interface PetStatus {
  name: string;
  level: number;
  streak: number;
  hp: number;
}

export interface SendMessageParams {
  sessionId?: string | null;
  content?: string;
  quickAction?: QuickActionKey;
}

export interface SendMessageResponse {
  sessionId: string;
  reply: string;
  action?: { path: string; label: string } | null;
  petStatus: PetStatus;
}
