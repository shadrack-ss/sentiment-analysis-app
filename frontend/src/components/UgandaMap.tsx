import React, { useState, useEffect } from 'react'
import { MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface DistrictSentiment {
  district: string
  averageSentiment: number
  tweetCount: number
  color: string
}

const UgandaMap: React.FC = () => {
  const [districtData, setDistrictData] = useState<DistrictSentiment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)

  useEffect(() => {
    fetchDistrictSentimentData()
  }, [])

  const fetchDistrictSentimentData = async () => {
    try {
      setLoading(true)
      
      // Query for district sentiment data
      // Note: sentiment_score is now categorical (Positive/Negative/Neutral)
      const { data: tweets, error } = await supabase
        .from('nrm_tweets_kb')
        .select('district, sentiment_score')
        .not('district', 'is', null)
        .not('district', 'eq', '')
        .not('sentiment_score', 'is', null)
        .not('sentiment_score', 'eq', '')

      if (error) {
        console.error('Error fetching district sentiment data:', error)
        return
      }

      // Group by district and calculate average sentiment
      const districtMap = new Map<string, { total: number; count: number }>()
      
      tweets?.forEach(tweet => {
        const district = tweet.district
        // Convert categorical sentiment to numeric values for calculations
        let sentimentValue = 0
        if (tweet.sentiment_score === 'Positive') {
          sentimentValue = 1
        } else if (tweet.sentiment_score === 'Negative') {
          sentimentValue = -1
        } else if (tweet.sentiment_score === 'Neutral') {
          sentimentValue = 0
        }
        
        if (!districtMap.has(district)) {
          districtMap.set(district, { total: 0, count: 0 })
        }
        
        const current = districtMap.get(district)!
        current.total += sentimentValue
        current.count += 1
      })

      // Convert to array and calculate averages
      const districtData = Array.from(districtMap.entries()).map(([district, data]) => {
        const averageSentiment = data.total / data.count
        const color = getSentimentColor(averageSentiment)
        
        return {
          district,
          averageSentiment: Math.round(averageSentiment * 100) / 100,
          tweetCount: data.count,
          color
        }
      }).sort((a, b) => b.tweetCount - a.tweetCount)

      setDistrictData(districtData)
    } catch (error) {
      console.error('Error processing district sentiment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentColor = (score: number): string => {
    if (score > 0.1) return '#22c55e' // Green for positive
    if (score < -0.1) return '#ef4444' // Red for negative
    return '#6b7280' // Gray for neutral
  }

  const getSentimentIcon = (score: number) => {
    if (score > 0.1) return <TrendingUp className="h-4 w-4 text-success-600" />
    if (score < -0.1) return <TrendingDown className="h-4 w-4 text-danger-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (districtData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-sm">No geographic data available</p>
          <p className="text-xs mt-1">Make sure you have district and sentiment_score data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Map Legend */}
      <div className="flex items-center justify-center space-x-8 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-success-500 rounded-full"></div>
          <span className="text-gray-700">Positive Sentiment</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
          <span className="text-gray-700">Neutral Sentiment</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-danger-500 rounded-full"></div>
          <span className="text-gray-700">Negative Sentiment</span>
        </div>
      </div>

      {/* District Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {districtData.map((district) => (
          <div
            key={district.district}
            className={`card p-4 cursor-pointer transition-all duration-200 hover:shadow-soft-lg ${
              selectedDistrict === district.district ? 'ring-2 ring-primary-500' : ''
            }`}
            onClick={() => setSelectedDistrict(
              selectedDistrict === district.district ? null : district.district
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900 text-sm">
                  {district.district}
                </span>
              </div>
              {getSentimentIcon(district.averageSentiment)}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Sentiment:</span>
                <span 
                  className={`text-sm font-semibold ${
                    district.averageSentiment > 0.1 
                      ? 'text-success-600' 
                      : district.averageSentiment < -0.1 
                        ? 'text-danger-600' 
                        : 'text-gray-600'
                  }`}
                >
                  {district.averageSentiment > 0 ? '+' : ''}{district.averageSentiment}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Tweets:</span>
                <span className="text-sm font-medium text-gray-900">
                  {district.tweetCount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Color indicator bar */}
            <div 
              className="h-1 rounded-full mt-3"
              style={{ backgroundColor: district.color }}
            />
          </div>
        ))}
      </div>

      {/* Selected District Details */}
      {selectedDistrict && (
        <div className="card p-6 bg-primary-50 border-primary-200">
          <h4 className="text-lg font-semibold text-primary-900 mb-4">
            {selectedDistrict} - Detailed Analysis
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-900">
                {districtData.find(d => d.district === selectedDistrict)?.averageSentiment}
              </p>
              <p className="text-sm text-primary-700">Average Sentiment</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-900">
                {districtData.find(d => d.district === selectedDistrict)?.tweetCount.toLocaleString()}
              </p>
              <p className="text-sm text-primary-700">Total Tweets</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-900">
                {((districtData.find(d => d.district === selectedDistrict)?.tweetCount || 0) / 
                  districtData.reduce((sum, d) => sum + d.tweetCount, 0) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-primary-700">Share of Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-success-600">
            {districtData.filter(d => d.averageSentiment > 0.1).length}
          </p>
          <p className="text-sm text-gray-600">Positive Districts</p>
        </div>
        
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">
            {districtData.filter(d => Math.abs(d.averageSentiment) <= 0.1).length}
          </p>
          <p className="text-sm text-gray-600">Neutral Districts</p>
        </div>
        
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-danger-600">
            {districtData.filter(d => d.averageSentiment < -0.1).length}
          </p>
          <p className="text-sm text-gray-600">Negative Districts</p>
        </div>
      </div>
    </div>
  )
}

export default UgandaMap
