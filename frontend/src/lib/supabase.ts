import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on your schema
export interface Tweet {
  id: number
  tweet_id: string
  text: string
  username: string
  created_at: string
  retweet_count: number
  reply_count: number
  like_count: number
  quote_count: number
  url: string
  geo_location: string
  coordinates: string
  district: string
  user_profile_location: string
  has_precise_geo: boolean
  sentiment_score?: 'Positive' | 'Negative' | 'Neutral' | null // Categorical sentiment values
  // Reply-related fields added by n8n workflow
  fact_checked?: boolean
  correction_posted?: boolean
  reply_text?: string
  reply_posted_at?: string
  checked_at?: string
}

export interface SentimentData {
  date: string
  average_sentiment: number
  tweet_count: number
}

export interface SentimentDistribution {
  positive: number
  negative: number
  neutral: number
  total: number
}

// Facebook Posts table schema
export interface FacebookPost {
  id: string // Primary key - Facebook Post ID
  created_time: string // ISO timestamp
  owner_name: string // e.g., "Daily Monitor"
  owner_username: string // e.g., "DailyMonitor"
  post_text: string | null // Main caption/text
  text_lang: string | null // Language code e.g., "en"
  post_url: string | null // Direct link to Facebook post
  attached_link: string | null // External link
  attached_image_url: string | null // Photo URL
  attached_video_url: string | null // Video URL
  reactions_total: number // Total reactions
  likes_count: number // Specific like count
  comments_count: number // Number of comments
  shares_count: number // Number of shares
  sentiment: 'Positive' | 'Negative' | 'Neutral' | null // Categorical sentiment
  inserted_at: string // When saved to Supabase
}

// Combined social media stats
export interface CombinedStats {
  totalPosts: number
  totalEngagement: number
  sentimentDistribution: SentimentDistribution
  twitterStats: {
    posts: number
    engagement: number
  }
  facebookStats: {
    posts: number
    engagement: number
  }
}

// Helper function to convert sentiment to numeric value
export const sentimentToNumber = (sentiment: string | null | undefined): number => {
  if (sentiment === 'Positive') return 1
  if (sentiment === 'Negative') return -1
  if (sentiment === 'Neutral') return 0
  return 0
}
