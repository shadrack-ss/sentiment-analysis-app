-- Database Setup Script for Uganda Sentiment Dashboard
-- Run this in your Supabase SQL Editor or PostgreSQL database

-- Create the main table if it doesn't exist
CREATE TABLE IF NOT EXISTS nrm_tweets_kb (
  id SERIAL PRIMARY KEY,
  tweet_id VARCHAR,
  text TEXT,
  username VARCHAR,
  created_at TIMESTAMP,
  retweet_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  url TEXT,
  geo_location TEXT,
  coordinates TEXT,
  district TEXT,
  user_profile_location TEXT,
  has_precise_geo BOOLEAN DEFAULT FALSE
);

-- Add sentiment_score column if it doesn't exist (as VARCHAR for categorical values)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nrm_tweets_kb' 
    AND column_name = 'sentiment_score'
  ) THEN
    ALTER TABLE nrm_tweets_kb ADD COLUMN sentiment_score VARCHAR(10);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nrm_tweets_created_at ON nrm_tweets_kb(created_at);
CREATE INDEX IF NOT EXISTS idx_nrm_tweets_district ON nrm_tweets_kb(district);
CREATE INDEX IF NOT EXISTS idx_nrm_tweets_sentiment ON nrm_tweets_kb(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_nrm_tweets_username ON nrm_tweets_kb(username);

-- Insert sample data for testing (optional)
-- Uncomment and modify the following lines if you want to test with sample data

/*
INSERT INTO nrm_tweets_kb (
  tweet_id, text, username, created_at, 
  retweet_count, reply_count, like_count, quote_count,
  district, sentiment_score
) VALUES 
('1234567890', 'Great progress in Uganda! The new policies are working well.', 'user1', NOW() - INTERVAL '1 day', 5, 2, 15, 1, 'Kampala', 'Positive'),
('1234567891', 'Disappointed with the current situation in our district.', 'user2', NOW() - INTERVAL '2 days', 2, 8, 3, 0, 'Gulu', 'Negative'),
('1234567892', 'Neutral comment about politics in Uganda.', 'user3', NOW() - INTERVAL '3 days', 1, 1, 2, 0, 'Mbarara', 'Neutral'),
('1234567893', 'Amazing development projects in our region!', 'user4', NOW() - INTERVAL '4 days', 12, 5, 45, 3, 'Kampala', 'Positive'),
('1234567894', 'Concerns about infrastructure in rural areas.', 'user5', NOW() - INTERVAL '5 days', 3, 6, 8, 1, 'Arua', 'Negative');
*/

-- Enable Row Level Security (RLS) for security
ALTER TABLE nrm_tweets_kb ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to read all data
CREATE POLICY "Allow authenticated users to read tweets" ON nrm_tweets_kb
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT ON nrm_tweets_kb TO authenticated;
GRANT USAGE ON SEQUENCE nrm_tweets_kb_id_seq TO authenticated;

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'nrm_tweets_kb' 
ORDER BY ordinal_position;
