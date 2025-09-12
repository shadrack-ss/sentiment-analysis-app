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
