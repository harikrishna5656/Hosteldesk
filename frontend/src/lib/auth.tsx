import { createContext, useContext, useState, useCallback } from "react";

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  token?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

interface StoredRegisteredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const USERS_STORAGE_KEY = "hosteldesk_registered_users";
const SESSION_STORAGE_KEY = "hosteldesk_auth";
const SALT = "hosteldesk_salt_2026";

// Cryptographic SHA-256 hash
async function hashPassword(password: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(`${password}_${SALT}`);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Basic deterministic fallback
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return "h_" + Math.abs(hash).toString(16);
}

function getStoredUsers(): StoredRegisteredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredRegisteredUser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save users to localStorage:", e);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<{ isAuthenticated: boolean; user: AuthUser | null }>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem("hostelhub_auth");
        if (stored) {
          return { isAuthenticated: true, user: JSON.parse(stored) };
        }
      } catch {}
    }
    return { isAuthenticated: false, user: null };
  });

  const signup = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      return { success: false, error: "Please fill in all required fields." };
    }

    if (cleanPass.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    // Attempt backend API first if configured
    const apiUrl = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3001" : "");
    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cleanName, email: cleanEmail, password: cleanPass }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.user) {
          const sessionUser: AuthUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            token: data.token,
          };
          if (typeof window !== "undefined") {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
            // Ensure brand new signup starts completely empty (no previous hostels or rooms)
            localStorage.removeItem("hostelpms_hostels");
            localStorage.removeItem("hostelpms_rooms");
            localStorage.removeItem("hostelpms_tenants");
            localStorage.removeItem("hostelpms_payments");
            localStorage.removeItem("hostelpms_expenses");
            localStorage.removeItem("hostelpms_active_hostel_id");
          }
          setAuth({ isAuthenticated: true, user: sessionUser });
          return { success: true };
        } else if (res.status === 409 || res.status === 400) {
          return { success: false, error: data.error || "Signup failed." };
        }
      } catch {
        // Fall back to client persistent storage
      }
    }

    // Local persistent registration
    const users = getStoredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        success: false,
        error: "An account with this email already exists. Please sign in instead.",
      };
    }

    const passwordHash = await hashPassword(cleanPass);
    const newUser: StoredRegisteredUser = {
      id: "usr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveStoredUsers(users);

    const sessionUser: AuthUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    }
    setAuth({ isAuthenticated: true, user: sessionUser });
    return { success: true };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: "Please enter both email and password." };
    }

    // Attempt backend API first if configured
    const apiUrl = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3001" : "");
    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.user) {
          const sessionUser: AuthUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            token: data.token,
          };
          if (typeof window !== "undefined") {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
            // Ensure brand new signup starts completely empty (no previous hostels or rooms)
            localStorage.removeItem("hostelpms_hostels");
            localStorage.removeItem("hostelpms_rooms");
            localStorage.removeItem("hostelpms_tenants");
            localStorage.removeItem("hostelpms_payments");
            localStorage.removeItem("hostelpms_expenses");
            localStorage.removeItem("hostelpms_active_hostel_id");
          }
          setAuth({ isAuthenticated: true, user: sessionUser });
          return { success: true };
        } else if (res.status === 401 || res.status === 404 || res.status === 400) {
          return { success: false, error: data.error || "Authentication failed." };
        }
      } catch {
        // Fall back to client persistent storage
      }
    }

    // Local persistent authentication verification
    const users = getStoredUsers();
    const userRecord = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!userRecord) {
      return {
        success: false,
        error: "No account found with this email. Please check your email or sign up.",
      };
    }

    const inputHash = await hashPassword(cleanPass);
    if (inputHash !== userRecord.passwordHash) {
      return {
        success: false,
        error: "Incorrect password. Please verify your password and try again.",
      };
    }

    const sessionUser: AuthUser = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    }
    setAuth({ isAuthenticated: true, user: sessionUser });
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem("hostelhub_auth");
      localStorage.removeItem("hostelpms_hostels");
      localStorage.removeItem("hostelpms_rooms");
      localStorage.removeItem("hostelpms_tenants");
      localStorage.removeItem("hostelpms_payments");
      localStorage.removeItem("hostelpms_expenses");
      localStorage.removeItem("hostelpms_active_hostel_id");
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
