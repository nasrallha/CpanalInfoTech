"use client";
import { createContext, useContext } from "react";
import { can } from "@/lib/permissions";

// الموظف الحالي في الواجهة: const { user, can } = useAuth()
const AuthContext = createContext({ user: null });

export function AuthProvider({ user, children }) {
  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const { user } = useContext(AuthContext);
  return { user, can: (permission) => can(user, permission) };
}
