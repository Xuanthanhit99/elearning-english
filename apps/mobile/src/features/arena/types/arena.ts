export type ArenaMode = 'RANKED' | 'FRIEND_CHALLENGE';
export type ArenaTeamFormat = 'SOLO_1V1' | 'TEAM_2V2' | 'TEAM_3V3';
export type ArenaSkill = 'Vocabulary' | 'Grammar' | 'Listening' | 'Pronunciation' | 'Mixed';
export type ArenaDifficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'Mixed';
export type ArenaTopic =
  | 'Animals'
  | 'Business'
  | 'Travel'
  | 'IELTS'
  | 'TOEIC'
  | 'Conversation'
  | 'Daily life';

export type ArenaQueueInput = {
  mode: ArenaMode;
  teamFormat: ArenaTeamFormat;
  skill: ArenaSkill;
  difficulty: ArenaDifficulty;
  topic: ArenaTopic;
};

export type ArenaRoomParticipant = {
  id: string;
  userId: string;
  ready?: boolean;
  score?: number;
  correct?: number;
  wrong?: number;
  user?: {
    id: string;
    fullname?: string | null;
    username?: string | null;
    avatar?: string | null;
  } | null;
};

export type ArenaQuestion = {
  id: string;
  order?: number;
  prompt?: string | null;
  question?: string | null;
  options?: string[] | null;
  answer?: string | null;
  explanation?: string | null;
};

export type ArenaAnswer = {
  id?: string;
  questionId: string;
  userId: string;
  answer?: string | null;
  isCorrect?: boolean | null;
  correct?: boolean | null;
};

export type ArenaMatchResult = {
  winnerId?: string | null;
  winnerUserId?: string | null;
  status?: string;
  reason?: string | null;
  progression?: Record<string, unknown> | null;
};

export type ArenaMatch = {
  id: string;
  status?: string;
  revision?: number;
  activeQuestionOrder?: number | null;
  questionDeadlineAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  questions?: ArenaQuestion[];
  answers?: ArenaAnswer[];
  result?: ArenaMatchResult | null;
  progression?: Record<string, unknown> | null;
};

export type ArenaRoom = {
  id: string;
  name: string;
  status: 'WAITING' | 'PREPARING' | 'PLAYING' | 'FINISHED' | string;
  visibility?: 'PUBLIC' | 'PRIVATE' | string;
  gameMode?: string;
  mode?: string | null;
  teamFormat?: string | null;
  skill?: string;
  difficulty?: string;
  topic?: string;
  maxPlayers?: number;
  participants: ArenaRoomParticipant[];
  activeMatch?: ArenaMatch | null;
  matches?: ArenaMatch[];
};

export type ArenaProfile = {
  mmr?: number;
  tier?: string;
  winRate?: number;
  wins?: number;
  losses?: number;
  ratedMatchCount?: number;
  placementStatus?: string;
};

export type ArenaLobby = {
  profile?: ArenaProfile | null;
  rooms: ArenaRoom[];
  myActiveRoom?: ArenaRoom | null;
};

export type ArenaSeason = {
  id: string;
  name?: string;
  status?: string;
  startsAt?: string;
  endsAt?: string;
  profile?: ArenaProfile | null;
};

export type ArenaQueueResponse = {
  queued?: boolean;
  status?: string;
  room?: ArenaRoom | null;
  match?: ArenaRoom | null;
  roomId?: string;
};

export type SubmitArenaAnswerResponse = {
  answer?: ArenaAnswer;
  score?: number;
  correct?: number;
  wrong?: number;
  late?: boolean;
};
