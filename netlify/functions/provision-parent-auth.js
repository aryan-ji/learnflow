import { createClient } from "@supabase/supabase-js";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
  },
  body: JSON.stringify(body),
});

const readEnv = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { supabaseUrl, anonKey, serviceRoleKey };
};

const bearerToken = (headers) => {
  const raw = headers?.authorization || headers?.Authorization || "";
  const match = String(raw).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
};

const findAuthUserIdByEmail = async (adminClient, email) => {
  // Supabase doesn't provide a direct "get by email" call in auth-js.
  // We page through the admin list API until we find it (sufficient for small-to-medium orgs).
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  let page = 1;
  for (let i = 0; i < 10; i++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) return { userId: null, error };

    const users = data?.users || [];
    const found = users.find((u) => String(u?.email || "").trim().toLowerCase() === target);
    if (found?.id) return { userId: found.id, error: null };

    if (!data?.nextPage) break;
    page = data.nextPage;
  }
  return { userId: null, error: null };
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const { supabaseUrl, anonKey, serviceRoleKey } = readEnv();
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, {
      error: "Missing env",
      missing: [
        !supabaseUrl ? "SUPABASE_URL" : null,
        !anonKey ? "SUPABASE_ANON_KEY" : null,
        !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
      ].filter(Boolean),
    });
  }

  const token = bearerToken(event.headers);
  if (!token) return json(401, { error: "Missing Authorization bearer token" });

  const body = safeJsonParse(event.body);
  const instituteId = String(body?.instituteId || "").trim();
  const parentEmail = String(body?.parentEmail || "").trim().toLowerCase();
  const password = String(body?.password || "").trim();
  if (!instituteId || !parentEmail || !password) {
    return json(400, { error: "instituteId, parentEmail, password are required" });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: caller, error: callerError } = await authClient.auth.getUser(token);
  if (callerError || !caller?.user?.id) return json(401, { error: "Invalid session" });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Verify caller is an admin of this institute
  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from("users")
    .select("role,institute_id")
    .eq("auth_user_id", caller.user.id)
    .maybeSingle();

  if (adminProfileError) return json(500, { error: "Failed to verify caller role" });
  if (!adminProfile || adminProfile.role !== "admin") return json(403, { error: "Admin only" });
  if (String(adminProfile.institute_id) !== instituteId) return json(403, { error: "Wrong institute" });

  // Provision or update the Auth user, forcing email confirmed.
  const createRes = await adminClient.auth.admin.createUser({
    email: parentEmail,
    password,
    email_confirm: true,
  });

  if (!createRes.error && createRes.data?.user?.id) {
    return json(200, { auth_user_id: createRes.data.user.id });
  }

  // If already exists, find user and force-confirm.
  const { userId, error: findError } = await findAuthUserIdByEmail(adminClient, parentEmail);
  if (findError) return json(500, { error: "Failed to search existing auth users" });
  if (!userId) return json(500, { error: "Auth user exists but could not be found" });

  const updateRes = await adminClient.auth.admin.updateUserById(userId, {
    email_confirm: true,
    password,
  });

  if (updateRes.error || !updateRes.data?.user?.id) {
    return json(500, { error: "Failed to confirm existing auth user" });
  }

  return json(200, { auth_user_id: updateRes.data.user.id });
};