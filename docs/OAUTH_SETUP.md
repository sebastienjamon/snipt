# OAuth Setup Guide

This guide will help you configure GitHub and Google OAuth authentication for Snipt.

## Prerequisites

- Supabase project running
- GitHub account
- Google Cloud Platform account

## Your Supabase Callback URL

You'll need this URL for both providers:

```
https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1/callback
```

---

## 1. GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"**
4. Fill in the details:
   - **Application name**: `Snipt` (or any name you prefer)
   - **Homepage URL**: `http://localhost:3000` (for development) or your production URL
   - **Application description**: `AI-powered code snippet manager`
   - **Authorization callback URL**: `https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1/callback`
5. Click **"Register application"**

### Step 2: Get GitHub Credentials

1. After creating the app, you'll see:
   - **Client ID** - Copy this
   - Click **"Generate a new client secret"**
   - **Client Secret** - Copy this immediately (shown only once!)

### Step 3: Configure in Supabase

1. Go to https://supabase.com/dashboard/project/kfmpdlbpchrnirppthvj/auth/providers
2. Find **"GitHub"** in the providers list
3. Toggle **"Enable"** to ON
4. Paste your:
   - **Client ID** (from GitHub)
   - **Client Secret** (from GitHub)
5. Click **"Save"**

✅ GitHub OAuth is now configured!

---

## 2. Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Select or create a project
3. Click **"APIs & Services"** → **"Credentials"** in the left sidebar
4. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
5. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: `Snipt`
   - User support email: Your email
   - Developer contact: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (your email) if not verified
   - Click **"Save and Continue"** through all steps

### Step 2: Create OAuth Client ID

1. Back in **Credentials**, click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Application type: **Web application**
3. Name: `Snipt`
4. **Authorized JavaScript origins**: (leave empty for now)
5. **Authorized redirect URIs**:
   ```
   https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1/callback
   ```
6. Click **"CREATE"**
7. Copy the:
   - **Client ID** (looks like `xxx.apps.googleusercontent.com`)
   - **Client Secret**

### Step 3: Configure in Supabase

1. Go to https://supabase.com/dashboard/project/kfmpdlbpchrnirppthvj/auth/providers
2. Find **"Google"** in the providers list
3. Toggle **"Enable"** to ON
4. Paste your:
   - **Client ID** (from Google)
   - **Client Secret** (from Google)
5. Click **"Save"**

✅ Google OAuth is now configured!

---

## 3. Test OAuth Login

### Local Testing

1. Make sure your app is running:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000/login

3. You should see:
   - Email/password fields
   - "Or continue with" divider
   - **GitHub** button
   - **Google** button

4. Click **GitHub** or **Google** to test

### What Should Happen

1. You click the OAuth button
2. You're redirected to GitHub/Google
3. You authorize the app
4. You're redirected back to `/auth/callback`
5. You're logged in and redirected to `/dashboard`

---

## 4. Production Setup

When deploying to production, update the callback URLs:

### GitHub

1. Go back to your GitHub OAuth app settings
2. Update **"Authorization callback URL"** to include your production domain:
   ```
   https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1/callback
   ```
   (This stays the same - Supabase handles the redirect)

2. Update **"Homepage URL"** to your production URL:
   ```
   https://your-domain.vercel.app
   ```

### Google

1. Go back to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add your production domain to:
   - **Authorized JavaScript origins**: `https://your-domain.vercel.app`
   - Keep the same redirect URI (Supabase callback URL)

### Supabase

In your Supabase project settings:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://your-domain.vercel.app`
3. Add redirect URLs:
   - `https://your-domain.vercel.app/auth/callback`
   - `https://your-domain.vercel.app/dashboard`

---

## Troubleshooting

### "Redirect URI mismatch"

- Double-check the callback URL matches exactly:
  ```
  https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1/callback
  ```
- No trailing slashes
- Must be HTTPS in production
- Must match in both provider settings AND Supabase

### "Application not verified" (Google)

- During development, you can skip verification
- Click "Advanced" → "Go to Snipt (unsafe)"
- For production, submit your app for Google verification

### OAuth works but user not redirected

- Check Supabase **URL Configuration** settings
- Make sure Site URL is correct
- Check redirect URLs include your domain

### User created but no display name

- OAuth providers auto-fill display name from their profile
- GitHub uses the GitHub username
- Google uses the Google account name

---

## Security Notes

✅ OAuth credentials are stored securely in Supabase
✅ Client secrets are never exposed to the browser
✅ Callback URL is validated by Supabase
✅ Row Level Security (RLS) protects user data

---

## Next Steps

After OAuth is configured:

1. **Test thoroughly** - Try both GitHub and Google
2. **Clean up debug logging** - Remove console.logs
3. **Deploy to Vercel** - Make it live!
4. **Update providers** - Add production URLs

Happy coding! 🚀
