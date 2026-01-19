import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { supabase } from '../lib/supabase'

const FacebookSentimentChart: React.FC = () => {
  const [data, setData] = useState<Array<{ name: string; value: number; color: string; percentage: string }>>([])
  const [loading, setLoading] = useState(true)
  const [totalPosts, setTotalPosts] = useState(0)

  useEffect(() => {
    fetchSentimentDistribution()
  }, [])

  const fetchSentimentDistribution = async () => {
    try {
      setLoading(true)
      
      const { data: posts, error } = await supabase
        .from('fb_posts')
        .select('sentiment')
        .not('sentiment', 'is', null)
        .not('sentiment', 'eq', '')

      if (error) {
        console.error('Error fetching Facebook sentiment data:', error)
        return
      }

      let positive = 0
      let negative = 0
      let neutral = 0

      posts?.forEach(post => {
        if (post.sentiment === 'Positive') {
          positive++
        } else if (post.sentiment === 'Negative') {
          negative++
        } else if (post.sentiment === 'Neutral') {
          neutral++
        }
      })

      const total = positive + negative + neutral
      setTotalPosts(total)

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
      console.error('Error processing Facebook sentiment distribution:', error)
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

  if (data.length === 0 || totalPosts === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-sm">No sentiment data available</p>
          <p className="text-xs mt-1">Make sure you have sentiment data in your Facebook posts</p>
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
            {data.value.toLocaleString()} posts ({data.percentage}%)
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
            Based on {totalPosts.toLocaleString()} analyzed Facebook posts
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              label={{ value: 'Number of Posts', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              <LabelList content={renderCustomLabel} />
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs font-medium text-gray-700">
              {item.name}
            </span>
            <span className="text-xs text-gray-500">
              ({item.value.toLocaleString()})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FacebookSentimentChart
