-- Add reply-related columns to nrm_tweets_kb table
-- Run this in your Supabase SQL Editor or PostgreSQL database

-- Add fact_checked column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nrm_tweets_kb' 
    AND column_name = 'fact_checked'
  ) THEN
    ALTER TABLE nrm_tweets_kb ADD COLUMN fact_checked BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add correction_posted column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nrm_tweets_kb' 
    AND column_name = 'correction_posted'
  ) THEN
    ALTER TABLE nrm_tweets_kb ADD COLUMN correction_posted BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add reply_text column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nrm_tweets_kb' 
    AND column_name = 'reply_text'
  ) THEN
    ALTER TABLE nrm_tweets_kb ADD COLUMN reply_text TEXT;
  END IF;
END $$;

-- Add reply_posted_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nrm_tweets_kb' 
    AND column_name = 'reply_posted_at'
  ) THEN
    ALTER TABLE nrm_tweets_kb ADD COLUMN reply_posted_at TIMESTAMP;
  END IF;
END $$;

-- Add checked_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nrm_tweets_kb' 
    AND column_name = 'checked_at'
  ) THEN
    ALTER TABLE nrm_tweets_kb ADD COLUMN checked_at TIMESTAMP;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nrm_tweets_fact_checked ON nrm_tweets_kb(fact_checked);
CREATE INDEX IF NOT EXISTS idx_nrm_tweets_correction_posted ON nrm_tweets_kb(correction_posted);
CREATE INDEX IF NOT EXISTS idx_nrm_tweets_reply_text ON nrm_tweets_kb(reply_text) WHERE reply_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nrm_tweets_checked_at ON nrm_tweets_kb(checked_at);

-- Update RLS policies to allow updates for authenticated users
CREATE POLICY "Allow authenticated users to update tweets" ON nrm_tweets_kb
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT UPDATE ON nrm_tweets_kb TO authenticated;

-- Verify the new columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'nrm_tweets_kb' 
  AND column_name IN ('fact_checked', 'correction_posted', 'reply_text', 'reply_posted_at', 'checked_at')
ORDER BY column_name;
