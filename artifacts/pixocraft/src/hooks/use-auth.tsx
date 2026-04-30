import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  login: (username: string) => void;
  logout: () => void;
  username: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("pixocraft_isLoggedIn");
    const storedUser = localStorage.getItem("pixocraft_username");
    if (stored === "true") {
      setIsLoggedIn(true);
      setUsername(storedUser);
    }
    setIsLoading(false);
  }, []);

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

  if (isLoading) return null;

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
