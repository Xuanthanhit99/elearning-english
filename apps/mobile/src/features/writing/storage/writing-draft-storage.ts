import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalWritingDraft = {
  sessionId: string;
  content: string;
  updatedAt: string;
};

function key(sessionId: string) {
  return `beaconvie:writing-draft:${sessionId}`;
}

export async function getLocalWritingDraft(sessionId: string) {
  const raw = await AsyncStorage.getItem(key(sessionId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalWritingDraft;
  } catch {
    await AsyncStorage.removeItem(key(sessionId));
    return null;
  }
}

export async function setLocalWritingDraft(sessionId: string, content: string) {
  const draft: LocalWritingDraft = {
    sessionId,
    content,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(key(sessionId), JSON.stringify(draft));
  return draft;
}

export async function clearLocalWritingDraft(sessionId: string) {
  await AsyncStorage.removeItem(key(sessionId));
}
