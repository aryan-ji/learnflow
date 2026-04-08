import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types';
import { supabase } from "@/lib/supabase";
import { clearAuthSession, getAuthSession, setAuthSession } from "@/lib/authSession";
import { clearActiveInstituteId, getActiveInstituteId, setActiveInstituteId } from "@/lib/tenant";

type InstituteChoice = { id: string; name: string; role: User["role"] };
type LoginNeedsInstitute = { needsInstitute: true; institutes: InstituteChoice[] };

interface AuthContextType {
  user: User | null;
  instituteId: string | null;
  login: (email: string, password: string, instituteId?: string) => Promise<User | LoginNeedsInstitute | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const session = getAuthSession();
  const [user, setUser] = useState<User | null>(session?.user ?? null);
  const [instituteId, setInstituteId] = useState<string | null>(
    session?.instituteId ?? getActiveInstituteId() ?? (import.meta.env.VITE_INSTITUTE_ID ?? null),
  );

  const login = async (email: string, _password: string, nextInstituteId?: string): Promise<User | LoginNeedsInstitute | null> => {
    const cleanEmail = email.trim();
    const cleanInstituteId = nextInstituteId?.trim() ?? "";
    if (!cleanEmail) return null;

    if (cleanInstituteId) {
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
      setAuthSession({ instituteId: cleanInstituteId, user: foundUser, ttlDays: 30 });
      setInstituteId(cleanInstituteId);
      setUser(foundUser);
      return foundUser;
    }

    // No institute provided: resolve by email (if unique), otherwise ask user to choose.
    const { data: matches, error: matchesError } = await supabase
      .from("users")
      .select("id,name,email,role,avatar,institute_id")
      .ilike("email", cleanEmail);

    if (matchesError) {
      console.error("Login resolve failed:", matchesError);
      return null;
    }

    const rows = (matches ?? []).filter((x: any) => x?.institute_id);
    if (rows.length === 0) return null;

    if (rows.length === 1) {
      const r: any = rows[0];
      const foundUser: User = {
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        avatar: r.avatar ?? undefined,
      };
      const iid = String(r.institute_id);
      setActiveInstituteId(iid);
      setAuthSession({ instituteId: iid, user: foundUser, ttlDays: 30 });
      setInstituteId(iid);
      setUser(foundUser);
      return foundUser;
    }

    const uniqueInstituteIds = Array.from(new Set(rows.map((r: any) => String(r.institute_id))));
    const { data: instituteRows } = await supabase
      .from("institutes")
      .select("id,name")
      .in("id", uniqueInstituteIds);

    const nameById = new Map<string, string>();
    (instituteRows ?? []).forEach((r: any) => nameById.set(String(r.id), String(r.name ?? r.id)));

    // We might still have multiple entries per institute (e.g., different roles); show institute+role choices.
    const institutes: InstituteChoice[] = rows.map((r: any) => {
      const iid = String(r.institute_id);
      return { id: iid, name: nameById.get(iid) ?? iid, role: r.role as User["role"] };
    });

    return { needsInstitute: true, institutes };
  };

  const logout = () => {
    setUser(null);
    setInstituteId(null);
    clearActiveInstituteId();
    clearAuthSession();
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
