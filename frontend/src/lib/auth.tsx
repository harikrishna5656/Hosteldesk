import { createContext, useContext, useState, useCallback } from "react";

interface AuthUser {
  name: string;
  email: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<{ isAuthenticated: boolean; user: AuthUser | null }>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hosteldesk_auth") || localStorage.getItem("hostelhub_auth");
        if (stored) {
          return { isAuthenticated: true, user: JSON.parse(stored) };
        }
      } catch {}
    }
    return { isAuthenticated: false, user: null };
  });

  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) return false;
    const user = { name: email.split("@")[0] || "PG Owner", email: email.trim() };
    if (typeof window !== "undefined") {
      localStorage.setItem("hosteldesk_auth", JSON.stringify(user));
    }
    setAuth({ isAuthenticated: true, user });
    return true;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim() || !email.trim() || !password.trim()) return false;
    const user = { name: name.trim(), email: email.trim() };
    if (typeof window !== "undefined") {
      localStorage.setItem("hosteldesk_auth", JSON.stringify(user));
    }
    setAuth({ isAuthenticated: true, user });
    return true;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("hosteldesk_auth");
      localStorage.removeItem("hostelhub_auth");
    }
    setAuth({ isAuthenticated: false, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
