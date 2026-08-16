export type CompanionRole = 'USER' | 'ASSISTANT';
export type CompanionQuickAction = 'CHEER_UP' | 'BANTER' | 'QUICK_TIP';

export type CompanionMessage = {
  id: string;
  sessionId: string;
  role: CompanionRole;
  content: string;
  createdAt: string;
};

export type CompanionPetStatus = {
  name: string;
  level: number;
  streak: number;
  hp: number;
};

export type SendCompanionMessageInput = {
  sessionId?: string | null;
  content?: string;
  quickAction?: CompanionQuickAction;
};

export type SendCompanionMessageResponse = {
  sessionId: string;
  reply: string;
  action?: { path: string; label: string } | null;
  petStatus: CompanionPetStatus;
};

export type CompanionDraftMessage = {
  id: string;
  role: CompanionRole;
  content: string;
  createdAt: string;
  pending?: boolean;
};

export type CompanionDisplayMessage = CompanionMessage | CompanionDraftMessage;
