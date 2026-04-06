import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types';
import { supabase } from "@/lib/supabase";
import { clearActiveInstituteId, getActiveInstituteId, setActiveInstituteId } from "@/lib/tenant";

interface AuthContextType {
  user: User | null;
  instituteId: string | null;
  login: (email: string, password: string, instituteId: string) => Promise<User | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [instituteId, setInstituteId] = useState<string | null>(
    getActiveInstituteId() ?? (import.meta.env.VITE_INSTITUTE_ID ?? null),
  );

  const login = async (email: string, _password: string, nextInstituteId: string): Promise<User | null> => {
    const cleanEmail = email.trim();
    const cleanInstituteId = nextInstituteId.trim();
    if (!cleanEmail || !cleanInstituteId) return null;

    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,avatar")
      .eq("institute_id", cleanInstituteId)
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (error) {
      console.error("Login failed:", error);
      return null;
    }
    if (!data) return null;

    const foundUser: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar ?? undefined,
    };

    setActiveInstituteId(cleanInstituteId);
    setInstituteId(cleanInstituteId);
    setUser(foundUser);
    return foundUser;
  };

  const logout = () => {
    setUser(null);
    setInstituteId(null);
    clearActiveInstituteId();
  };

  return (
    <AuthContext.Provider value={{ user, instituteId, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
