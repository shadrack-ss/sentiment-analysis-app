import React, { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, ExternalLink, User, Filter, X, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Tweet } from '../lib/supabase'
import { format } from 'date-fns'

const TweetsTable: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [tweetQuery, setTweetQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [engagementType, setEngagementType] = useState('') // likes | retweets | comments
  const [engagementMin, setEngagementMin] = useState('') // numeric string
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(20)
  const [expandedTweets, setExpandedTweets] = useState<Set<number>>(new Set())
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const fetchTweets = useCallback(async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('nrm_tweets_kb')
        .select('*', { count: 'exact' })

      // Apply tweet text filter
      if (tweetQuery) {
        query = query.ilike('text', `%${tweetQuery}%`)
      }

      // Apply user filter
      if (userQuery) {
        query = query.ilike('username', `%${userQuery}%`)
      }

      // Apply sentiment filter
      if (sentimentFilter) {
        query = query.eq('sentiment_score', sentimentFilter)
      }

      // Apply date range filter
      if (dateFrom) {
        const fromIso = new Date(dateFrom).toISOString()
        query = query.gte('created_at', fromIso)
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        // set to end of day for inclusive filter
        toDate.setHours(23, 59, 59, 999)
        query = query.lte('created_at', toDate.toISOString())
      }

      // Apply engagement filter
      if (engagementType && engagementMin) {
        const minVal = Number(engagementMin)
        if (!Number.isNaN(minVal)) {
          const columnMap: Record<string, string> = {
            likes: 'like_count',
            retweets: 'retweet_count',
            comments: 'reply_count'
          }
          const column = columnMap[engagementType]
          if (column) {
            query = query.gte(column, minVal)
          }
        }
      }

      // District filter removed

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching tweets:', error)
        return
      }

      setTweets(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error processing tweets:', error)
    } finally {
      setLoading(false)
    }
  }, [tweetQuery, userQuery, sentimentFilter, dateFrom, dateTo, engagementType, engagementMin, currentPage, itemsPerPage])

  useEffect(() => {
    fetchTweets()
  }, [fetchTweets])

  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return 'text-gray-500'
    if (sentiment === 'Positive') return 'text-success-600'
    if (sentiment === 'Negative') return 'text-danger-600'
    if (sentiment === 'Neutral') return 'text-warning-600'
    return 'text-gray-500'
  }

  const getSentimentLabel = (sentiment?: string) => {
    if (!sentiment) return 'N/A'
    return sentiment
  }

  const toggleTweetExpansion = (tweetId: number) => {
    const newExpanded = new Set(expandedTweets)
    if (newExpanded.has(tweetId)) {
      newExpanded.delete(tweetId)
    } else {
      newExpanded.add(tweetId)
    }
    setExpandedTweets(newExpanded)
  }

  const isTweetExpanded = (tweetId: number) => {
    return expandedTweets.has(tweetId)
  }

  const shouldShowExpandButton = (text: string) => {
    return text.length > 150 // Show expand button if tweet is longer than 150 characters
  }

  const getTruncatedText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  // District selection removed

  const clearFilters = () => {
    setTweetQuery('')
    setUserQuery('')
    setSentimentFilter('')
    setDateFrom('')
    setDateTo('')
    setEngagementType('')
    setEngagementMin('')
    setCurrentPage(1)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (tweetQuery) count++
    if (userQuery) count++
    if (sentimentFilter) count++
    if (dateFrom || dateTo) count++
    if (engagementType && engagementMin) count++
    return count
  }

  const removeFilter = (filterName: string) => {
    switch(filterName) {
      case 'tweet': setTweetQuery(''); break;
      case 'user': setUserQuery(''); break;
      case 'sentiment': setSentimentFilter(''); break;
      case 'date': setDateFrom(''); setDateTo(''); break;
      case 'engagement': setEngagementType(''); setEngagementMin(''); break;
    }
  }

  if (loading && tweets.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {getActiveFiltersCount() > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {getActiveFiltersCount()} active
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              Advanced
              {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Primary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Tweet Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tweet Text
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tweet content..."
                  value={tweetQuery}
                  onChange={(e) => setTweetQuery(e.target.value)}
                  className="input-field pl-9 w-full"
                />
              </div>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by username..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="input-field pl-9 w-full"
                />
              </div>
            </div>

            {/* Sentiment Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Sentiment
              </label>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="input-field w-full"
              >
                <option value="">All sentiments</option>
                <option value="Positive">✓ Positive</option>
                <option value="Neutral">○ Neutral</option>
                <option value="Negative">✗ Negative</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-gray-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      placeholder="From"
                      className="input-field w-full text-sm"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      placeholder="To"
                      className="input-field w-full text-sm"
                    />
                  </div>
                </div>

                {/* Engagement Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    Minimum Engagement
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={engagementType}
                      onChange={(e) => setEngagementType(e.target.value)}
                      className="input-field w-full text-sm"
                    >
                      <option value="">Type</option>
                      <option value="likes">Likes</option>
                      <option value="retweets">Retweets</option>
                      <option value="comments">Comments</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      placeholder="Count"
                      value={engagementMin}
                      onChange={(e) => setEngagementMin(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Tags */}
          {getActiveFiltersCount() > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tweetQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                  Tweet: "{tweetQuery.substring(0, 20)}{tweetQuery.length > 20 ? '...' : ''}"
                  <button onClick={() => removeFilter('tweet')} className="hover:text-gray-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {userQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                  User: @{userQuery}
                  <button onClick={() => removeFilter('user')} className="hover:text-gray-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {sentimentFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                  Sentiment: {sentimentFilter}
                  <button onClick={() => removeFilter('sentiment')} className="hover:text-gray-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                  Date: {dateFrom || '...'} → {dateTo || '...'}
                  <button onClick={() => removeFilter('date')} className="hover:text-gray-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {(engagementType && engagementMin) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                  {engagementType} ≥ {engagementMin}
                  <button onClick={() => removeFilter('engagement')} className="hover:text-gray-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn-primary">
              <Search className="h-4 w-4 mr-1 inline" />
              Apply Filters
            </button>
            {getActiveFiltersCount() > 0 && (
              <button type="button" onClick={clearFilters} className="btn-secondary">
                <X className="h-4 w-4 mr-1 inline" />
                Clear All
              </button>
            )}
            <button 
              type="button" 
              onClick={() => {
                if (expandedTweets.size === tweets.length) {
                  setExpandedTweets(new Set())
                } else {
                  setExpandedTweets(new Set(tweets.map(tweet => tweet.id)))
                }
              }}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {expandedTweets.size === tweets.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </form>
      </div>

      {/* Results Count */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
        <div className="text-sm">
          <span className="text-gray-600">Displaying </span>
          <span className="font-semibold text-gray-900">{tweets.length}</span>
          <span className="text-gray-600"> tweets</span>
          {getActiveFiltersCount() > 0 && (
            <span className="text-gray-500 ml-1">with {getActiveFiltersCount()} filter{getActiveFiltersCount() > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="text-sm text-gray-600">
          Page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
        </div>
      </div>

      {/* Table (Desktop/Tablet) */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Tweet</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
              
              <th className="text-left py-3 px-4 font-medium text-gray-700">Sentiment</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Engagement</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {tweets.map((tweet) => (
              <tr key={`tweet-${tweet.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="max-w-lg">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {isTweetExpanded(tweet.id) ? tweet.text : getTruncatedText(tweet.text)}
                    </p>
                    {shouldShowExpandButton(tweet.text) && (
                      <div className="mt-1 flex items-center space-x-2">
                        <button
                          onClick={() => toggleTweetExpansion(tweet.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {isTweetExpanded(tweet.id) ? 'Show less' : 'Show more'}
                        </button>
                        <span className="text-xs text-gray-500">
                          {isTweetExpanded(tweet.id) ? tweet.text.length : getTruncatedText(tweet.text).length} / {tweet.text.length} chars
                        </span>
                      </div>
                    )}
                    {tweet.url && (
                      <a
                        href={tweet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-primary-600 hover:text-primary-700 mt-1 ml-2"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Tweet
                      </a>
                    )}
                  </div>
                </td>
                
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {tweet.username}
                    </span>
                  </div>
                </td>
                
                
                
                <td className="py-3 px-4">
                  <span className={`text-sm font-medium ${getSentimentColor(tweet.sentiment_score || undefined)}`}>
                    {getSentimentLabel(tweet.sentiment_score || undefined)}
                  </span>
                </td>
                
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-700">
                    <div className="flex items-center space-x-4">
                      <span>❤️ {tweet.like_count}</span>
                      <span>🔄 {tweet.retweet_count}</span>
                      <span>💬 {tweet.reply_count}</span>
                    </div>
                  </div>
                </td>
                
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">
                    {format(new Date(tweet.created_at), 'MMM dd, yyyy')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card View (Mobile) */}
      <div className="block md:hidden space-y-4">
        {tweets.map((tweet) => (
          <div key={`tweet-card-${tweet.id}`} className="card p-4 flex flex-col space-y-3 bg-white shadow rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-yellow-700 flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-1" />
                @{tweet.username}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(tweet.sentiment_score || undefined)}`}>{getSentimentLabel(tweet.sentiment_score || undefined)}</span>
            </div>
            <div className="text-gray-800 text-sm flex-grow">
              <p className="whitespace-pre-wrap">
                {isTweetExpanded(tweet.id) ? tweet.text : getTruncatedText(tweet.text, 200)}
              </p>
              {shouldShowExpandButton(tweet.text) && (
                <div className="mt-1 flex items-center space-x-2">
                  <button
                    onClick={() => toggleTweetExpansion(tweet.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isTweetExpanded(tweet.id) ? 'Show less' : 'Show more'}
                  </button>
                  <span className="text-xs text-gray-500">
                    {isTweetExpanded(tweet.id) ? tweet.text.length : getTruncatedText(tweet.text, 200).length} / {tweet.text.length} chars
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>❤️ {tweet.like_count}</span>
              <span>🔄 {tweet.retweet_count}</span>
              <span>💬 {tweet.reply_count}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{format(new Date(tweet.created_at), 'MMM dd, yyyy')}</span>
              {tweet.url && (
                <a
                  href={tweet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 text-xs font-medium flex items-center"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Tweet
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {tweets.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No tweets found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}

export default TweetsTable
