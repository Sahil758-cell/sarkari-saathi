import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  clearStoredIdentifier,
  ensureStoredMemberSince,
  getStoredIdentifier,
  getStoredMemberSince,
  setStoredIdentifier,
} from "../storage/auth";

interface AuthContextValue {
  identifier: string | null;
  memberSince: string | null;
  initializing: boolean;
  login: (identifier: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  identifier: null,
  memberSince: null,
  initializing: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    getStoredIdentifier().then(async (stored) => {
      setIdentifier(stored);
      if (stored) setMemberSince(await ensureStoredMemberSince());
      else setMemberSince(await getStoredMemberSince());
      setInitializing(false);
    });
  }, []);

  async function login(newIdentifier: string) {
    await setStoredIdentifier(newIdentifier);
    setIdentifier(newIdentifier);
    setMemberSince(await ensureStoredMemberSince());
  }

  async function logout() {
    await clearStoredIdentifier();
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
