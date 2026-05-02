import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const TOKEN_KEY = "pixocraft_client_jwt";
const CUSTOMER_KEY = "pixocraft_client_customer";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export type ClientCustomer = {
  id: number;
  name: string;
  businessName: string | null;
  phone: string | null;
  email: string | null;
};

interface ClientAuthContextType {
  isLoggedIn: boolean;
  isChecking: boolean;
  customer: ClientCustomer | null;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  getToken: () => string | null;
}

const ClientAuthContext = createContext<ClientAuthContextType | null>(null);

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [customer, setCustomer] = useState<ClientCustomer | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedCustomer = localStorage.getItem(CUSTOMER_KEY);
    if (!token) { setIsChecking(false); return; }
    fetch(`${BASE}/api/auth/client-verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setIsLoggedIn(true);
          setCustomer(storedCustomer ? JSON.parse(storedCustomer) : null);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(CUSTOMER_KEY);
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CUSTOMER_KEY);
      })
      .finally(() => setIsChecking(false));
  }, []);

  const login = useCallback(async (password: string) => {
    try {
      const res = await fetch(`${BASE}/api/auth/client-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data.customer));
        setIsLoggedIn(true);
        setCustomer(data.customer);
        return { ok: true };
      }
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as { error?: string }).error ?? "Invalid password" };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    setIsLoggedIn(false);
    setCustomer(null);
  }, []);

  const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), []);

  return (
    <ClientAuthContext.Provider value={{ isLoggedIn, isChecking, customer, login, logout, getToken }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error("useClientAuth must be used within ClientAuthProvider");
  return ctx;
}
