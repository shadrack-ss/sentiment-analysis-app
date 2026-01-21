-- Add post_url column to fb_posts table
-- Run this in your Supabase SQL Editor

-- Add the post_url column
ALTER TABLE fb_posts
ADD COLUMN IF NOT EXISTS post_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN fb_posts.post_url IS 'Direct link to Facebook post (format: https://www.facebook.com/{username}/posts/{post_id})';

-- Create index for better performance when filtering by URL
CREATE INDEX IF NOT EXISTS idx_fb_posts_url ON fb_posts(post_url);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fb_posts' AND column_name = 'post_url';
