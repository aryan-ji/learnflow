# Supabase Setup (EduFlow)

## 1) Create tables
- Open your Supabase project → **SQL Editor**
- Run `supabase/schema.sql`

## 2) Configure environment variables
In the project root `.env`:
```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 3) Seed sample data (optional but recommended)
This repo includes a browser-side seeder at `src/lib/seedDatabase.ts`.

After `npm run dev`, open the browser DevTools console and run:
```js
import("/src/lib/seedDatabase.ts").then(m => m.seedDatabase())
```

You should then see sample users/students/batches/fees/attendance in Supabase tables.

## Notes
- Current schema is **prototype-friendly**: it does **not** use Supabase Auth or RLS yet.
- Once you migrate login to Supabase Auth, enable RLS and add policies so:
  - teachers can only mark attendance for their batches
  - parents can only view their child’s records
  - admins can manage everything

