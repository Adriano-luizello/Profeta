# Supabase Setup Guide

## ✅ Step 1: Get Your Credentials

After creating your Supabase project:

1. Go to your project dashboard
2. Click on **Settings** (⚙️ icon in the left sidebar)
3. Click on **API**
4. Copy these values:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```

### Project API Keys

**anon/public key** (safe to use in browser):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

**service_role key** (secret, never expose):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

---

## ✅ Step 2: Configure Environment Variables

1. In your project root, create a file called `.env.local`:

```bash
# Create the file
touch .env.local
```

2. Add your credentials (replace with your actual values):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

⚠️ **Important**: Make sure `.env.local` is in your `.gitignore` (it already is!)

---

## ✅ Step 3: Create Database Tables

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire content of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl/Cmd + Enter)

You should see: ✅ Success. No rows returned

This creates:
- ✅ `analyses` table
- ✅ `products` table  
- ✅ `sales_history` table
- ✅ `forecasts` table
- ✅ `recommendations` table
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Auto-update triggers

---

## ✅ Step 4: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Optional: Configure email templates
   - Go to **Authentication** → **Email Templates**
   - Customize the "Confirm signup" email if you want

### Important: Email Confirmation

By default, Supabase requires email confirmation. For MVP testing, you can disable it:

1. Go to **Authentication** → **Providers**
2. Click on **Email**
3. Scroll to **Email Confirmation**
4. Toggle **Enable email confirmations** to OFF (for easier testing)
5. Click **Save**

⚠️ **For production**, keep email confirmation ON for security!

---

## ✅ Step 5: Test the Setup

1. Make sure your `.env.local` file is saved
2. Restart your dev server:

```bash
# Stop the current server (Ctrl + C)
npm run dev
```

3. Open http://localhost:3001 (or 3000)
4. Click **"Get Started"**
5. Try creating an account!

---

## 🎯 What You Can Test Now:

### 1. Sign Up Flow
- Click "Get Started" → "Sign up"
- Enter email and password
- If email confirmation is disabled: redirects to login
- If enabled: check your email for confirmation link

### 2. Login Flow
- Go to "Sign In"
- Enter credentials
- Should redirect to Dashboard

### 3. Protected Routes
- Try accessing `/dashboard` without logging in
- Should redirect to `/login`
- After login, dashboard is accessible

### 4. Sign Out
- In dashboard, click "Sign Out"
- Should redirect to homepage
- Can't access dashboard anymore

---

## 🐛 Troubleshooting

### Error: "supabaseUrl is required"
**Solution**: Make sure `.env.local` exists and has the correct variables

### Error: "Invalid API key"
**Solution**: Double-check you copied the full API keys (they're long!)

### Can't sign up / login
**Solution**: Check Supabase logs:
1. Go to **Logs** → **Auth Logs** in Supabase dashboard
2. Look for errors

### Server won't start
**Solution**: 
```bash
rm -rf .next
npm run dev
```

---

## 📊 Verify Database Tables

Go to **Database** → **Tables** in Supabase and you should see:

- ✅ analyses
- ✅ products
- ✅ sales_history
- ✅ forecasts
- ✅ recommendations

Click on any table to see its structure.

---

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] `.env.local` file created with credentials
- [ ] Database schema ran successfully
- [ ] Email provider configured
- [ ] Dev server restarted
- [ ] Can access signup page
- [ ] Can create account
- [ ] Can login
- [ ] Dashboard loads
- [ ] Can sign out

---

## 🚀 Next Steps After Setup

Once authentication works:

1. **Phase 3**: CSV Upload & Validation
2. **Phase 4**: OpenAI Data Cleaning
3. **Phase 5**: Prophet Forecasting
4. **Phase 6**: Recommendations
5. **Phase 7**: Results Dashboard

---

**Need help?** Let me know which step is giving you trouble!
