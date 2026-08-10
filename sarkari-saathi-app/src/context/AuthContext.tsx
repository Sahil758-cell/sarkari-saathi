import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { registerPushToken, setSessionToken, syncProfiles, unregisterPushToken } from "../api/client";
import { requestPushToken } from "../notifications/push";
import { listProfiles } from "../storage/profiles";
import {
  clearStoredIdentifier,
  clearStoredSessionToken,
  ensureStoredMemberSince,
  getStoredIdentifier,
  getStoredMemberSince,
  getStoredSessionToken,
  setStoredIdentifier,
  setStoredSessionToken,
} from "../storage/auth";

interface AuthContextValue {
  identifier: string | null;
  memberSince: string | null;
  initializing: boolean;
  login: (identifier: string, sessionToken: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  identifier: null,
  memberSince: null,
  initializing: true,
  login: async () => {},
  logout: async () => {},
});

// Best-effort: push setup / profile sync failures shouldn't block login —
// the app is fully usable without notifications.
async function setUpPushAndSync() {
  try {
    const token = await requestPushToken();
    if (token) await registerPushToken(token, Platform.OS);
    const saved = await listProfiles();
    await syncProfiles(saved.map((p) => p.profile));
  } catch {
    // ignore — notifications are a nice-to-have, not a login blocker
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    getStoredIdentifier().then(async (stored) => {
      setIdentifier(stored);
      if (stored) {
        setMemberSince(await ensureStoredMemberSince());
        const token = await getStoredSessionToken();
        setSessionToken(token);
      } else {
        setMemberSince(await getStoredMemberSince());
      }
      setInitializing(false);
    });
  }, []);

  async function login(newIdentifier: string, sessionToken: string | null) {
    await setStoredIdentifier(newIdentifier);
    setIdentifier(newIdentifier);
    setMemberSince(await ensureStoredMemberSince());
    if (sessionToken) {
      await setStoredSessionToken(sessionToken);
      setSessionToken(sessionToken);
      setUpPushAndSync();
    }
  }

  async function logout() {
    try {
      await unregisterPushToken();
    } catch {
      // best-effort — still log out locally even if this fails
    }
    await clearStoredIdentifier();
    await clearStoredSessionToken();
    setSessionToken(null);
    setIdentifier(null);
  }

  return (
    <AuthContext.Provider value={{ identifier, memberSince, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
