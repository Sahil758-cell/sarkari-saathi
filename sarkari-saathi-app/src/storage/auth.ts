import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sarkari-saathi:auth-identifier";
const MEMBER_SINCE_KEY = "sarkari-saathi:auth-member-since";
const SESSION_TOKEN_KEY = "sarkari-saathi:auth-session-token";

export async function getStoredIdentifier(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setStoredIdentifier(identifier: string): Promise<void> {
  await AsyncStorage.setItem(KEY, identifier);
}

export async function clearStoredIdentifier(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function getStoredSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_TOKEN_KEY);
}

export async function setStoredSessionToken(token: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
}

export async function clearStoredSessionToken(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
}

export async function getStoredMemberSince(): Promise<string | null> {
  return AsyncStorage.getItem(MEMBER_SINCE_KEY);
}

//  Only ever set once — first login date persists across logout/login so
// "member since" reflects account age, not just the current session.
export async function ensureStoredMemberSince(): Promise<string> {
  const existing = await AsyncStorage.getItem(MEMBER_SINCE_KEY);
  if (existing) return existing;
  const now = new Date().toISOString();
  await AsyncStorage.setItem(MEMBER_SINCE_KEY, now);
  return now;
}
