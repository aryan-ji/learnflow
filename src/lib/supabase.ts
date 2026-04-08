import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseUrl !== "https://fjnqkckmdjroyrmhixss.supabase.co") {
  alert(
    "VITE CACHE ERROR: Your app is still loading the old Supabase URL:\\n" +
    supabaseUrl +
    "\\n\\nPlease close all your terminals, kill the 'npm run dev' servers, and start a fresh one! You currently have two servers running and this tab is connected to the old one."
  );
}

const missingEnv: string[] = [];
if (!supabaseUrl) missingEnv.push("VITE_SUPABASE_URL");
if (!supabaseKey) missingEnv.push("VITE_SUPABASE_ANON_KEY");
if (missingEnv.length) {
  // Fail fast with a helpful error instead of hanging on network calls.
  throw new Error(`Missing Supabase env vars: ${missingEnv.join(", ")}`);
}

const mergeSignals = (a?: AbortSignal, b?: AbortSignal) => {
  if (!a) return b;
  if (!b) return a;
  // AbortSignal.any is supported in modern browsers; fallback to b.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySignal = (AbortSignal as any).any as undefined | ((signals: AbortSignal[]) => AbortSignal);
  return anySignal ? anySignal([a, b]) : b;
};

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutMs = 12_000;
  const timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (import.meta.env.DEV) {
      // Useful when debugging "stuck on loading" issues.
      // eslint-disable-next-line no-console
      console.debug("[supabase fetch]", input);
    }
    return await fetch(input, {
      ...init,
      signal: mergeSignals(init?.signal, controller.signal),
    });
  } finally {
    window.clearTimeout(timeoutHandle);
  }
};

// Note: With RLS enabled, the app must use Supabase Auth.
// These options help keep sessions persistent and handle auth redirects (e.g. password reset).
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
