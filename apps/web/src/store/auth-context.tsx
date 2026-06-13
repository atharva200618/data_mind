"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load auth details from localStorage on mount
    const savedToken = localStorage.getItem("datamind_token");
    const savedUser = localStorage.getItem("datamind_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user", e);
        localStorage.removeItem("datamind_token");
        localStorage.removeItem("datamind_user");
      }
    }
    setLoading(false);

    // Setup global fetch interceptor to append authorization token if present
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async function (input, init) {
        const currentToken = localStorage.getItem("datamind_token");
        
        // Check if request is targeting our FastAPI backend
        const isTargetingBackend = 
          (typeof input === "string" && (input.startsWith(API) || input.startsWith("http://localhost:8000") || input.startsWith("/api/v1")));

        if (currentToken && isTargetingBackend) {
          init = init || {};
          const headers = new Headers(init.headers);
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${currentToken}`);
          }
          init.headers = headers;
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        return { success: false, error: errData.detail || "Invalid email or password" };
      }

      const data = await res.json();
      localStorage.setItem("datamind_token", data.access_token);
      localStorage.setItem("datamind_user", JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      
      router.push("/dashboard");
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Connection to authentication server failed" };
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const res = await fetch(`${API}/api/v1/auth/signup`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        return { success: false, error: errData.detail || "Failed to register account" };
      }

      const data = await res.json();
      localStorage.setItem("datamind_token", data.access_token);
      localStorage.setItem("datamind_user", JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);

      router.push("/dashboard");
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Connection to authentication server failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("datamind_token");
    localStorage.removeItem("datamind_user");
    setToken(null);
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
