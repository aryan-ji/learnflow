import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { clearActiveInstituteId, setActiveInstituteId } from "@/lib/tenant";
import { toast } from "sonner";

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutHandle: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(() => reject(new Error(label)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
  }
};

type AuthContextType = {
  user: User | null;
  instituteId: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchAppUserByAuthUserId = async (
  authUserId: string,
): Promise<{ user: User; instituteId: string } | null> => {
  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,role,avatar,institute_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load app user:", error);
    return null;
  }
  if (!data) return null;

  if (!data.institute_id) {
    console.error("Missing institute_id for user:", data.id);
    return null;
  }

  return {
    instituteId: String(data.institute_id),
    user: {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar ?? undefined,
    },
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncFromSession = async (providedSession?: any) => {
      if (providedSession === undefined) {
        setIsAuthLoading(true);
      }
      
      try {
        let session = providedSession;
        
        if (session === undefined) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        }

        if (!session?.user?.id) {
          if (!cancelled) {
            setUser(null);
            setInstituteId(null);
          }
          return;
        }

        const profile = await fetchAppUserByAuthUserId(session.user.id);
        if (!cancelled) {
          if (profile) {
            setActiveInstituteId(profile.instituteId);
            setInstituteId(profile.instituteId);
            setUser(profile.user);
          } else {
            // Auth user exists, but no linked app user row.
            toast.error("Account Not Linked", {
              description: "You logged in, but there is no matching public.users profile. Please update the user's auth_user_id in Supabase or run the seeder.",
              duration: 10000,
            });
            await supabase.auth.signOut();
            setInstituteId(null);
            setUser(null);
          }
        }
      } catch (err) {
        const rawError = (err as any)?.message || String(err);
        console.error("Auth bootstrap failed:", rawError);
        if (!cancelled) {
          toast.error("Connection Failed", {
            description: `Exact Error: ${rawError}`,
            duration: 10000,
          });
          setUser(null);
          setInstituteId(null);
        }
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    syncFromSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loginWithPassword = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return { ok: false, message: "Email and password are required." };

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) {
      console.error("Failed to sign in:", error);
      return { ok: false, message: error.message };
    }
    return { ok: true };
  };

  const sendPasswordResetEmail = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return { ok: false, message: "Email is required." };

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
    if (error) {
      console.error("Failed to send password reset email:", error);
      return { ok: false, message: error.message };
    }
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearActiveInstituteId();
    setUser(null);
    setInstituteId(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      instituteId,
      isAuthenticated: Boolean(user),
      isAuthLoading,
      loginWithPassword,
      sendPasswordResetEmail,
      logout,
    }),
    [user, instituteId, isAuthLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
