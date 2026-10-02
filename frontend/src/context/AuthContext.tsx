"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  UserResponse,
  UserSignupInput,
  UserLoginInput,
  signupUser,
  loginUser,
  getCurrentUser,
  removeAuthToken,
  getAuthToken,
} from "@/lib/api";

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: UserLoginInput) => Promise<void>;
  signup: (data: UserSignupInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      const token = getAuthToken();
      if (token) {
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.error("Failed to restore session:", err);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = async (data: UserLoginInput) => {
    setIsLoading(true);
    try {
      const res = await loginUser(data);
      setUser(res.user);
      if (typeof window !== "undefined") {
        try {
          const savedData = localStorage.getItem("niyamsetu_business_profile");
          if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.user_id !== res.user.id) {
              parsed.user_id = res.user.id;
              localStorage.setItem("niyamsetu_business_profile", JSON.stringify(parsed));
            }
          }
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: UserSignupInput) => {
    setIsLoading(true);
    try {
      const res = await signupUser(data);
      setUser(res.user);
      if (typeof window !== "undefined") {
        try {
          const savedData = localStorage.getItem("niyamsetu_business_profile");
          if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.user_id !== res.user.id) {
              parsed.user_id = res.user.id;
              localStorage.setItem("niyamsetu_business_profile", JSON.stringify(parsed));
            }
          }
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
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
