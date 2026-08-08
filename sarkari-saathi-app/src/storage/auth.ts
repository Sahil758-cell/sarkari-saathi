import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sarkari-saathi:auth-identifier";
const MEMBER_SINCE_KEY = "sarkari-saathi:auth-member-since";

export async function getStoredIdentifier(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setStoredIdentifier(identifier: string): Promise<void> {
  await AsyncStorage.setItem(KEY, identifier);
}

export async function clearStoredIdentifier(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function getStoredMemberSince(): Promise<string | null> {
  return AsyncStorage.getItem(MEMBER_SINCE_KEY);
}

// Only ever set once — first login date persists across logout/login so
// "member since" reflects account age, not just the current session.
export async function ensureStoredMemberSince(): Promise<string> {
  const existing = await AsyncStorage.getItem(MEMBER_SINCE_KEY);
  if (existing) return existing;
  const now = new Date().toISOString();
  await AsyncStorage.setItem(MEMBER_SINCE_KEY, now);
  return now;
}
