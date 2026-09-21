import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api, Me, setAuthToken } from "@/api/client";

const TOKEN_KEY = "clean-request-homeowner-token";

type AuthContextValue = {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        setAuthToken(stored);
        try {
          const me = await api.me();
          setUser(me);
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          setAuthToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function afterAuth(token: string, me: Me) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(me);
  }

  async function login(email: string, password: string) {
    const { token, user: me } = await api.login({ email, password });
    await afterAuth(token, me);
  }

  async function register(input: { email: string; password: string; name: string; phone?: string }) {
    const { token, user: me } = await api.register({ ...input, role: "HOMEOWNER" });
    await afterAuth(token, me);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  }

  async function refreshMe() {
    const me = await api.me();
    setUser(me);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
