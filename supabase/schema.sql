-- Snipt Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'team')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys for MCP authentication
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Teams/Workspaces
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES public.users(id),
  plan_tier TEXT DEFAULT 'team',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Snippets (the core entity)
CREATE TABLE IF NOT EXISTS public.snippets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Ownership
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  language TEXT NOT NULL,

  -- Organization
  tags TEXT[] DEFAULT '{}',
  category TEXT,

  -- Context (the secret sauce)
  context JSONB DEFAULT '{}',

  -- Analytics
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Version Control
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES public.snippets(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'manual',

  -- Search (full-text search vector)
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(code, '')), 'C')
  ) STORED
);

-- Snippet Usage Logs
CREATE TABLE IF NOT EXISTS public.snippet_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snippet_id UUID REFERENCES public.snippets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  source TEXT CHECK (source IN ('web-ui', 'mcp-server', 'api')),
  success BOOLEAN,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_snippets_user_id ON public.snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_snippets_team_id ON public.snippets(team_id);
CREATE INDEX IF NOT EXISTS idx_snippets_tags ON public.snippets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_snippets_search ON public.snippets USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_snippets_language ON public.snippets(language);
CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON public.snippets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snippet_usage_snippet_id ON public.snippet_usage(snippet_id);
CREATE INDEX IF NOT EXISTS idx_snippet_usage_created_at ON public.snippet_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snippet_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY users_select_own ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can read their own API keys
CREATE POLICY api_keys_select_own ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own API keys
CREATE POLICY api_keys_insert_own ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY api_keys_delete_own ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can read teams they're members of
CREATE POLICY teams_select_member ON public.teams
  FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Team owners can update their teams
CREATE POLICY teams_update_owner ON public.teams
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can read team memberships they're part of
CREATE POLICY team_members_select_own ON public.team_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Snippets: Users can read their own snippets
CREATE POLICY snippets_select_own ON public.snippets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Snippets: Users can read team snippets they're members of
CREATE POLICY snippets_select_team ON public.snippets
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Snippets: Users can insert their own snippets
CREATE POLICY snippets_insert_own ON public.snippets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Snippets: Users can update their own snippets
CREATE POLICY snippets_update_own ON public.snippets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Snippets: Team admins can update team snippets
CREATE POLICY snippets_update_team_admin ON public.snippets
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Snippets: Users can delete their own snippets
CREATE POLICY snippets_delete_own ON public.snippets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Snippet usage: Users can read their own usage logs
CREATE POLICY snippet_usage_select_own ON public.snippet_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Snippet usage: Anyone can insert usage logs (for tracking)
CREATE POLICY snippet_usage_insert_all ON public.snippet_usage
  FOR INSERT
  WITH CHECK (true);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update snippets updated_at
DROP TRIGGER IF EXISTS snippets_updated_at ON public.snippets;
CREATE TRIGGER snippets_updated_at
  BEFORE UPDATE ON public.snippets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update users updated_at
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Seed data (optional - example snippet for testing)
-- Uncomment to add sample data
/*
INSERT INTO public.snippets (user_id, title, description, code, language, tags, category, context)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user UUID
  'Example: Git commit with conventional commits',
  'Standard git commit format following conventional commits specification',
  'git commit -m "feat: add user authentication"',
  'bash',
  ARRAY['git', 'commit', 'conventional-commits'],
  'version-control',
  '{"when_to_use": "When committing code changes", "common_mistakes": ["Forgetting to add files with git add", "Using incorrect commit type"], "prerequisites": ["Git repository initialized", "Changes staged with git add"]}'::jsonb
);
*/
