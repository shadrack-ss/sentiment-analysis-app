import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { supabase } from '../lib/supabase'
import { SentimentData } from '../lib/supabase'
import { format, subDays, startOfDay } from 'date-fns'

const SentimentTimeline: React.FC = () => {
  const [data, setData] = useState<SentimentData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d') // 7d, 30d, 90d

  useEffect(() => {
    fetchSentimentData()
  }, [timeRange])

  const fetchSentimentData = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = subDays(endDate, timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90)
      
      // Query for sentiment data over time
      // Note: sentiment_score is now categorical (Positive/Negative/Neutral)
      const { data: tweets, error } = await supabase
        .from('nrm_tweets_kb')
        .select('created_at, sentiment_score')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('sentiment_score', 'is', null)
        .not('sentiment_score', 'eq', '')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching sentiment data:', error)
        return
      }

      // Group by date and calculate average sentiment
      const groupedData = tweets?.reduce((acc, tweet) => {
        const date = startOfDay(new Date(tweet.created_at))
        const dateKey = format(date, 'yyyy-MM-dd')
        
        if (!acc[dateKey]) {
          acc[dateKey] = { date: dateKey, total: 0, count: 0 }
        }
        
        // Convert categorical sentiment to numeric values for calculations
        let sentimentValue = 0
        if (tweet.sentiment_score === 'Positive') {
          sentimentValue = 1
        } else if (tweet.sentiment_score === 'Negative') {
          sentimentValue = -1
        } else if (tweet.sentiment_score === 'Neutral') {
          sentimentValue = 0
        }
        
        acc[dateKey].total += sentimentValue
        acc[dateKey].count += 1
        
        return acc
      }, {} as Record<string, { date: string; total: number; count: number }>)

      // Convert to array and calculate averages
      const chartData = Object.values(groupedData || {}).map(item => ({
        date: format(new Date(item.date), 'MMM dd'),
        average_sentiment: Math.round((item.total / item.count) * 100) / 100,
        tweet_count: item.count
      }))

      setData(chartData)
    } catch (error) {
      console.error('Error processing sentiment data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-sm">No sentiment data available</p>
          <p className="text-xs mt-1">Make sure you have sentiment_score data in your database</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700">Sentiment Over Time</h4>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[-1, 1]}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#374151', fontWeight: '600' }}
            />
            <Area
              type="monotone"
              dataKey="average_sentiment"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#sentimentGradient)"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
          <span>Sentiment Score (-1 to 1)</span>
        </div>
        <div className="text-gray-400">•</div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary-200 rounded-full"></div>
          <span>Positive=1, Negative=-1, Neutral=0</span>
        </div>
      </div>
    </div>
  )
}

export default SentimentTimeline

