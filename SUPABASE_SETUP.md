# Supabase Setup (Instipilot)

## 1) Create tables
- Supabase Dashboard → SQL Editor
- Run `supabase/schema.sql`

## 2) Configure environment variables
In the project root `.env`:
```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 3) Multi-institute (recommended)
Run this once:
- `supabase/migrations/002_add_institute_id.sql`

This creates `public.institutes`, adds `institute_id` to all tables, and backfills existing rows to `inst_1`.

## 4) Enable RLS + policies (required for real production)
Run this once (after step 3):
- `supabase/migrations/003_enable_rls_and_policies.sql`

After this:
- All reads/writes require Supabase Auth (`authenticated`) because RLS blocks anonymous access.
- Each authenticated user must be linked to `public.users` via `auth_user_id`.

### Linking a logged-in user
After you create/login the user in Supabase Auth (email/password), update the matching row in `public.users`:
```sql
update public.users
set auth_user_id = '<auth-uuid-from-auth.users>'
where email = '<same-email>';
```

### Email + password login (recommended)
- Create users in Supabase Auth with a temporary password (Supabase Dashboard → Authentication → Users).
- Share the email + temporary password with the user.
- The user can click “Forgot password” on the login page to receive a reset email and set a new password.

## 5) Seed sample data (optional)
This repo includes a browser-side seeder at `src/lib/seedDatabase.ts`.

After `npm run dev`, open the browser DevTools console and run:
```js
import("/src/lib/seedDatabase.ts").then(m => m.seedDatabase())
```

## Quick checks
- Verify institute columns exist:
```sql
select table_name, column_name
from information_schema.columns
where table_schema='public'
  and column_name='institute_id'
order by table_name;
```
- If you see `permission denied for table ...`, it usually means the logged-in user is not linked in `public.users` (missing `auth_user_id`).
