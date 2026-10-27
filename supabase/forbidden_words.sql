-- ==============================================================================
-- 40Clues: Forbidden Names & Offensive Words Moderation Schema
-- ==============================================================================

-- 1. Create table for forbidden words (stored securely in database)
CREATE TABLE IF NOT EXISTS forbidden_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
-- Denies direct public client access to keep the forbidden words list 100% private from browser inspection
ALTER TABLE forbidden_words ENABLE ROW LEVEL SECURITY;

-- 3. Restrict permissions: Revoke public access, grant full access only to service_role (used by server backend)
REVOKE ALL ON forbidden_words FROM anon, authenticated;
GRANT ALL ON forbidden_words TO service_role;

-- 4. Seed initial forbidden words
INSERT INTO forbidden_words (word, category) VALUES
  -- System / Impersonation Reserved
  ('admin', 'reserved'),
  ('administrator', 'reserved'),
  ('moderator', 'reserved'),
  ('mod', 'reserved'),
  ('staff', 'reserved'),
  ('official', 'reserved'),
  ('support', 'reserved'),
  ('system', 'reserved'),
  ('root', 'reserved'),
  ('40clues', 'reserved'),
  ('creator', 'reserved'),

  -- Hate Speech & Discrimination
  ('nigger', 'slur'),
  ('nigga', 'slur'),
  ('nazi', 'slur'),
  ('hitler', 'slur'),
  ('faggot', 'slur'),
  ('fag', 'slur'),
  ('kike', 'slur'),
  ('spic', 'slur'),
  ('chink', 'slur'),
  ('retard', 'slur'),
  ('tranny', 'slur'),
  ('shemale', 'slur'),

  -- Severe Vulgarities & Profanities
  ('fuck', 'profanity'),
  ('shit', 'profanity'),
  ('bitch', 'profanity'),
  ('cunt', 'profanity'),
  ('asshole', 'profanity'),
  ('bastard', 'profanity'),
  ('whore', 'profanity'),
  ('slut', 'profanity'),
  ('motherfucker', 'profanity'),
  ('dickhead', 'profanity'),
  ('pussy', 'profanity'),

  -- Explicit Sexual Content
  ('porn', 'sexual'),
  ('pedo', 'sexual'),
  ('pedophile', 'sexual'),
  ('rapist', 'sexual'),
  ('rape', 'sexual'),
  ('blowjob', 'sexual'),
  ('dildo', 'sexual'),
  ('jizz', 'sexual'),
  ('cum', 'sexual'),

  -- Extreme Violence & Harm
  ('terrorist', 'violence'),
  ('genocide', 'violence'),
  ('suicide', 'violence'),
  ('killall', 'violence')
ON CONFLICT (word) DO NOTHING;
