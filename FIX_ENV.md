# 🔧 Fix Your .env File

## ❌ Current Problem

Your `.env` file has incorrect values:

```bash
VITE_SUPABASE_URL=sb_publishable_-SAluDMlvBDNUiyG9ClgOA_WYaUeZ3I  ❌ WRONG!
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ✅ CORRECT
```

**The URL should be a web address, not a key!**

---

## ✅ How to Fix

### Step 1: Get Your Correct Supabase URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Under **Project API keys**, find **"Project URL"**
5. It should look like: `https://uqrpkphcdoshjfupzcr.supabase.co`

### Step 2: Update Your .env File

Open `.env` in your project root and change it to:

```bash
VITE_SUPABASE_URL=https://uqrpkphcdoshjfupzcr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnBrb3BoY2Rvc2hqZnVwemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTUyMjIsImV4cCI6MjA4NzIzMTIyMn0.OU-xJgUeBNL7jjHpmI4WIFS6L1gvb2NqXAdnm96S0oI
```

**Important:**
- Replace `uqrpkphcdoshjfupzcr` with your actual project ID
- The URL must start with `https://` and end with `.supabase.co`
- Keep the anon key as is (it looks correct)

### Step 3: Restart Dev Server

After updating `.env`:
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## 🔍 How to Verify

After fixing, check browser console:
- ✅ Should see: Empty array `[]` (no errors)
- ❌ Should NOT see: "Failed to load resource" or "401" errors

---

## 📝 Correct Format

```bash
# .env file format
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Both values should be on separate lines, no quotes needed.

