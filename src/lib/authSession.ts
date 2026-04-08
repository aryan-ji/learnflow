import type { User } from "@/types";

type AuthSessionV1 = {
  version: 1;
  savedAt: number; // epoch ms
  expiresAt: number; // epoch ms
  instituteId: string;
  user: User;
};

const KEY = "instipilot.authSession.v1";

export const getAuthSession = (): AuthSessionV1 | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSessionV1;
    if (!parsed || parsed.version !== 1) return null;
    if (!parsed.user || !parsed.instituteId) return null;
    if (typeof parsed.expiresAt !== "number" || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const setAuthSession = (params: { instituteId: string; user: User; ttlDays?: number }) => {
  try {
    const ttlDays = params.ttlDays ?? 30;
    const now = Date.now();
    const payload: AuthSessionV1 = {
      version: 1,
      savedAt: now,
      expiresAt: now + ttlDays * 24 * 60 * 60 * 1000,
      instituteId: params.instituteId,
      user: params.user,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

export const clearAuthSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

