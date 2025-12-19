import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { supabase } from '../lib/supabase'
import { SentimentDistribution } from '../lib/supabase'

const SentimentPieChart: React.FC = () => {
  const [data, setData] = useState<Array<{ name: string; value: number; color: string; percentage: string }>>([])
  const [loading, setLoading] = useState(true)
  const [totalTweets, setTotalTweets] = useState(0)

  useEffect(() => {
    fetchSentimentDistribution()
  }, [])

  const fetchSentimentDistribution = async () => {
    try {
      setLoading(true)
      
      // Query for sentiment distribution
      // Note: sentiment_score is now categorical (Positive/Negative/Neutral)
      const { data: tweets, error } = await supabase
        .from('nrm_tweets_kb')
        .select('sentiment_score')
        .not('sentiment_score', 'is', null)
        .not('sentiment_score', 'eq', '')

      if (error) {
        console.error('Error fetching sentiment data:', error)
        return
      }

      // Categorize tweets by sentiment
      let positive = 0
      let negative = 0
      let neutral = 0

      tweets?.forEach(tweet => {
        // Count categorical sentiment values directly
        if (tweet.sentiment_score === 'Positive') {
          positive++
        } else if (tweet.sentiment_score === 'Negative') {
          negative++
        } else if (tweet.sentiment_score === 'Neutral') {
          neutral++
        }
      })

      const total = positive + negative + neutral
      setTotalTweets(total)

      const chartData = [
        {
          name: 'Positive',
          value: positive,
          color: '#22c55e',
          percentage: ((positive / total) * 100).toFixed(1)
        },
        {
          name: 'Neutral',
          value: neutral,
          color: '#f59e0b',
          percentage: ((neutral / total) * 100).toFixed(1)
        },
        {
          name: 'Negative',
          value: negative,
          color: '#ef4444',
          percentage: ((negative / total) * 100).toFixed(1)
        }
      ]

      setData(chartData)
    } catch (error) {
      console.error('Error processing sentiment distribution:', error)
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

  if (data.length === 0 || totalTweets === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-sm">No sentiment data available</p>
          <p className="text-xs mt-1">Make sure you have sentiment_score data in your database</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value.toLocaleString()} tweets ({data.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, payload } = props
    if (!payload || !payload.percentage) return null
    
    return (
      <text 
        x={x + width / 2} 
        y={y - 10} 
        fill="#374151" 
        textAnchor="middle" 
        fontSize="12"
        fontWeight="600"
      >
        {payload.percentage}%
      </text>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Sentiment Distribution</h4>
          <p className="text-xs text-gray-500 mt-1">
            Based on {totalTweets.toLocaleString()} analyzed tweets
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
            barSize={60}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis 
              dataKey="name" 
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
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar 
              dataKey="value" 
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList content={renderCustomLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        {data.map((item, index) => (
          <div key={index} className="text-center">
            <div 
              className="w-4 h-4 rounded-full mx-auto mb-2"
              style={{ backgroundColor: item.color }}
            />
            <p className="text-xl font-bold text-gray-900">
              {item.value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 font-medium mt-1">{item.name}</p>
            <p className="text-xs text-gray-500">{item.percentage}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SentimentPieChart
