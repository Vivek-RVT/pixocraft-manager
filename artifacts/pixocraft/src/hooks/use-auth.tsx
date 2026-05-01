import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const TOKEN_KEY = "pixocraft_jwt_token";
const USERNAME_KEY = "pixocraft_username";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

async function apiPost(path: string, body: Record<string, string>) {
  return fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

interface AuthContextType {
  isLoggedIn: boolean;
  isChecking: boolean;
  username: string | null;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setIsChecking(false); return; }
    fetch(`${BASE}/api/auth/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setIsLoggedIn(true);
          setUsername(data.username ?? localStorage.getItem(USERNAME_KEY));
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USERNAME_KEY);
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
      })
      .finally(() => setIsChecking(false));
  }, []);

  const login = useCallback(async (password: string) => {
    try {
      const res = await apiPost("/auth/login", { password });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USERNAME_KEY, data.username);
        setIsLoggedIn(true);
        setUsername(data.username);
        return { ok: true };
      }
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as any).error ?? "Invalid credentials" };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setIsLoggedIn(false);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isChecking, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
