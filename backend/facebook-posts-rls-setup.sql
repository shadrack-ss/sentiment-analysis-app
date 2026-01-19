-- Facebook Posts Table RLS Setup
-- Run this in your Supabase SQL Editor to enable Row Level Security for fb_posts table

-- Enable Row Level Security
ALTER TABLE fb_posts ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read Facebook posts
CREATE POLICY "Allow authenticated users to read fb_posts" 
ON fb_posts
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Grant necessary permissions to authenticated users
GRANT SELECT ON fb_posts TO authenticated;

-- Optional: If you need to allow updates to sentiment or other fields
-- Uncomment the following lines if needed:

-- CREATE POLICY "Allow authenticated users to update fb_posts" 
-- ON fb_posts
-- FOR UPDATE 
-- USING (auth.role() = 'authenticated');

-- GRANT UPDATE ON fb_posts TO authenticated;

-- Verify the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'fb_posts';
