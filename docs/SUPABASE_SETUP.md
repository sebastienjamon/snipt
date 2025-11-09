# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in project details:
   - **Name:** snipt (or your preferred name)
   - **Database Password:** Generate a strong password and save it securely
   - **Region:** Choose the closest region to your users
   - **Pricing Plan:** Free tier is sufficient for development
5. Click "Create new project"
6. Wait for the project to be provisioned (~2 minutes)

## Step 2: Get API Keys

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Step 4: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the schema
6. You should see "Success. No rows returned"

## Step 5: Configure Authentication

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider (enabled by default)
3. Optional: Enable OAuth providers (Google, GitHub, etc.)
4. Go to **Authentication** > **URL Configuration**
5. Add your site URL:
   - **Site URL:** `http://localhost:3000` (development)
   - **Redirect URLs:**
     - `http://localhost:3000/auth/callback`
     - Add production URLs later

## Step 6: Verify Setup

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `users`
   - `api_keys`
   - `teams`
   - `team_members`
   - `snippets`
   - `snippet_usage`

3. Check that Row Level Security (RLS) is enabled:
   - Click on any table → "Policies" tab
   - You should see the security policies listed

## Step 7: Test the Connection

Run the Next.js development server:

```bash
npm run dev
```

Open http://localhost:3000 - the app should load without errors.

## Troubleshooting

### Error: "Invalid API key"
- Double-check that you copied the correct keys from Supabase
- Make sure there are no extra spaces in your `.env.local` file
- Restart the dev server after updating environment variables

### Error: "relation does not exist"
- Run the `schema.sql` script in the SQL Editor
- Check that all tables were created successfully

### RLS Policies Not Working
- Make sure Row Level Security is enabled on all tables
- Verify policies were created by checking the "Policies" tab for each table
- Check Supabase logs: **Logs** > **Database** for detailed errors

## Next Steps

Once Supabase is set up, you can:
1. Test signup/login functionality
2. Create your first snippet via the web UI
3. Use the Supabase Table Editor to view data
4. Monitor auth users in the **Authentication** > **Users** section

## Security Notes

- ⚠️ **Never commit `.env.local` to git** - it's already in `.gitignore`
- ⚠️ **Never share your `service_role` key** - it bypasses all RLS policies
- ✅ Use `anon` key in client-side code - it respects RLS policies
- ✅ Only use `service_role` key in secure server-side API routes

## Production Deployment

When deploying to production:

1. Update environment variables in your hosting platform (Vercel, etc.)
2. Update Supabase URL configuration with production URLs
3. Enable additional auth providers as needed
4. Set up database backups (automatic on paid plans)
5. Monitor usage in Supabase dashboard

---

**Need help?** Check the [Supabase Docs](https://supabase.com/docs) or [Snipt Documentation](/docs)
