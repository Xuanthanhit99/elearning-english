import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPANION_SESSION_ID_KEY = 'beaconvie.companion.sessionId';

export async function getStoredCompanionSessionId() {
  return AsyncStorage.getItem(COMPANION_SESSION_ID_KEY);
}

export async function setStoredCompanionSessionId(sessionId: string) {
  await AsyncStorage.setItem(COMPANION_SESSION_ID_KEY, sessionId);
}
