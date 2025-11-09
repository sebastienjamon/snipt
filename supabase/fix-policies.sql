-- Fix for infinite recursion in RLS policies
-- Run this in Supabase SQL Editor to fix the issue

-- Drop the problematic policies
DROP POLICY IF EXISTS snippets_select_team ON public.snippets;
DROP POLICY IF EXISTS team_members_select_own ON public.team_members;
DROP POLICY IF EXISTS teams_select_member ON public.teams;

-- Recreate team_members policies (simpler, no recursion)
CREATE POLICY team_members_select_own ON public.team_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Recreate teams policy (without checking team_members)
CREATE POLICY teams_select_own ON public.teams
  FOR SELECT
  USING (owner_id = auth.uid());

-- For now, disable the team snippets policy to avoid recursion
-- We'll re-enable team features in Phase 3
-- Users can only see their own snippets
-- (The snippets_select_own policy already exists and works fine)

-- Alternative: If you want team snippets to work, use a simpler approach
-- This checks team membership directly without recursion
CREATE POLICY snippets_select_team_simple ON public.snippets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = snippets.team_id
      AND team_members.user_id = auth.uid()
    )
  );
