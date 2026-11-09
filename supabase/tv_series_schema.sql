-- ==============================================================================
-- 40Clues: TV Series Database Schema
-- Run this migration in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create daily_games_tv table
CREATE TABLE IF NOT EXISTS daily_games_tv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  seasons INTEGER DEFAULT NULL,
  category TEXT DEFAULT 'tv',
  clues JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for daily_games_tv
ALTER TABLE daily_games_tv ENABLE ROW LEVEL SECURITY;

-- Allow public read access to daily_games_tv
CREATE POLICY "Public read access for daily_games_tv"
  ON daily_games_tv
  FOR SELECT
  TO public
  USING (true);

-- Allow service_role full access to daily_games_tv
CREATE POLICY "Service role full access for daily_games_tv"
  ON daily_games_tv
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Create daily_scores_tv table
CREATE TABLE IF NOT EXISTS daily_scores_tv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_date DATE NOT NULL,
  clues_used INTEGER NOT NULL CHECK (clues_used >= 1 AND clues_used <= 40),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
  anon_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tv_user_game_date UNIQUE (user_id, game_date)
);

-- Optional FK to profiles table for PostgREST schema cache join support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_daily_scores_tv_profiles'
  ) THEN
    ALTER TABLE daily_scores_tv
      ADD CONSTRAINT fk_daily_scores_tv_profiles
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Indexes for performance & leaderboard queries
CREATE INDEX IF NOT EXISTS idx_daily_scores_tv_date_score
  ON daily_scores_tv (game_date, score DESC, clues_used ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_daily_scores_tv_user
  ON daily_scores_tv (user_id);

-- Enable RLS for daily_scores_tv
ALTER TABLE daily_scores_tv ENABLE ROW LEVEL SECURITY;

-- Allow public read access to daily_scores_tv (for daily leaderboard)
CREATE POLICY "Public read access for daily_scores_tv"
  ON daily_scores_tv
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert/update their own scores
CREATE POLICY "Authenticated users can insert own daily_scores_tv"
  ON daily_scores_tv
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own daily_scores_tv"
  ON daily_scores_tv
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow guests (anon) to insert scores where user_id IS NULL
CREATE POLICY "Guests can insert anon daily_scores_tv"
  ON daily_scores_tv
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow service_role full access
CREATE POLICY "Service role full access for daily_scores_tv"
  ON daily_scores_tv
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Extend profiles table with TV-specific stats columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS total_score_tv INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played_tv INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak_tv INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_streak_tv INTEGER DEFAULT 0;

-- Index for Global TV Leaderboard
CREATE INDEX IF NOT EXISTS idx_profiles_total_score_tv
  ON profiles (total_score_tv DESC);
