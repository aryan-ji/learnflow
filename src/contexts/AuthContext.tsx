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

  return {
    instituteId: String((data as any).institute_id),
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
      setIsAuthLoading(true);
      try {
        let session = providedSession;
        
        if (session === undefined) {
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            15000,
            "Supabase session check timed out (check internet/Supabase URL).",
          );
          session = data.session;
        }

        if (!session?.user?.id) {
          if (!cancelled) {
            setUser(null);
            setInstituteId(null);
          }
          return;
        }

        const profile = await withTimeout(
          fetchAppUserByAuthUserId(session.user.id),
          8000,
          "Supabase profile load timed out (check RLS/user linking).",
        );
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
        console.error("Auth bootstrap failed:", err);
        if (!cancelled) {
          toast.error("Connection Error", {
            description: "Unable to reach Supabase. If you just updated your .env, please restart 'npm run dev'. Also disable any adblockers.",
            duration: 8000,
          });
          setUser(null);
          setInstituteId(null);
        }
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    syncFromSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await syncFromSession(session);
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
