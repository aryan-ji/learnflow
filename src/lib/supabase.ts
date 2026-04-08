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

// Note: With RLS enabled, the app must use Supabase Auth.
// These options help keep sessions persistent and handle auth redirects (e.g. password reset).
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
