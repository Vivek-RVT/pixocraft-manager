import React, { createContext, useContext, useState } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  login: (username: string) => void;
  logout: () => void;
  username: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("pixocraft_isLoggedIn") === "true";
  });
  const [username, setUsername] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("pixocraft_username");
  });

  const login = (user: string) => {
    localStorage.setItem("pixocraft_isLoggedIn", "true");
    localStorage.setItem("pixocraft_username", user);
    setIsLoggedIn(true);
    setUsername(user);
  };

  const logout = () => {
    localStorage.removeItem("pixocraft_isLoggedIn");
    localStorage.removeItem("pixocraft_username");
    setIsLoggedIn(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, username }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
