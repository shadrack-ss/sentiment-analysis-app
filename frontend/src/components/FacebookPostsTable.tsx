import React, { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, ExternalLink, User, Filter, X, Calendar, TrendingUp, ChevronDown, ChevronUp, ThumbsUp, MessageCircle, Share2, Heart } from 'lucide-react'
import { supabase, FacebookPost, sentimentToNumber } from '../lib/supabase'
import { format } from 'date-fns'

const FacebookPostsTable: React.FC = () => {
  const [posts, setPosts] = useState<FacebookPost[]>([])
  const [loading, setLoading] = useState(true)
  const [textQuery, setTextQuery] = useState('')
  const [ownerQuery, setOwnerQuery] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [engagementType, setEngagementType] = useState('') // reactions | comments | shares
  const [engagementMin, setEngagementMin] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(20)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('fb_posts')
        .select('*', { count: 'exact' })

      // Apply post text filter
      if (textQuery) {
        query = query.ilike('post_text', `%${textQuery}%`)
      }

      // Apply owner filter
      if (ownerQuery) {
        query = query.or(`owner_name.ilike.%${ownerQuery}%,owner_username.ilike.%${ownerQuery}%`)
      }

      // Apply sentiment filter
      if (sentimentFilter) {
        query = query.eq('sentiment', sentimentFilter)
      }

      // Apply date range filter
      if (dateFrom) {
        const fromIso = new Date(dateFrom).toISOString()
        query = query.gte('created_time', fromIso)
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        query = query.lte('created_time', toDate.toISOString())
      }

      // Apply engagement filter
      if (engagementType && engagementMin) {
        const minVal = Number(engagementMin)
        if (!Number.isNaN(minVal)) {
          const columnMap: Record<string, string> = {
            reactions: 'reactions_total',
            comments: 'comments_count',
            shares: 'shares_count'
          }
          const column = columnMap[engagementType]
          if (column) {
            query = query.gte(column, minVal)
          }
        }
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to).order('created_time', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching Facebook posts:', error)
        return
      }

      setPosts(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error processing Facebook posts:', error)
    } finally {
      setLoading(false)
    }
  }, [textQuery, ownerQuery, sentimentFilter, dateFrom, dateTo, engagementType, engagementMin, currentPage, itemsPerPage])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const getSentimentColor = (sentiment?: string | null) => {
    if (!sentiment) return 'text-gray-500'
    if (sentiment === 'Positive') return 'text-success-600'
    if (sentiment === 'Negative') return 'text-danger-600'
    if (sentiment === 'Neutral') return 'text-warning-600'
    return 'text-gray-500'
  }

  const getSentimentBgColor = (sentiment?: string | null) => {
    if (!sentiment) return 'bg-gray-100'
    if (sentiment === 'Positive') return 'bg-success-100'
    if (sentiment === 'Negative') return 'bg-danger-100'
    if (sentiment === 'Neutral') return 'bg-warning-100'
    return 'bg-gray-100'
  }

  const togglePostExpansion = (postId: string) => {
    const newExpanded = new Set(expandedPosts)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
    }
    setExpandedPosts(newExpanded)
  }

  const isPostExpanded = (postId: string) => {
    return expandedPosts.has(postId)
  }

  const shouldShowExpandButton = (text: string | null) => {
    return text && text.length > 200
  }

  const getTruncatedText = (text: string | null, maxLength: number = 200) => {
    if (!text) return 'No text content'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setTextQuery('')
    setOwnerQuery('')
    setSentimentFilter('')
    setDateFrom('')
    setDateTo('')
    setEngagementType('')
    setEngagementMin('')
    setCurrentPage(1)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (textQuery) count++
    if (ownerQuery) count++
    if (sentimentFilter) count++
    if (dateFrom || dateTo) count++
    if (engagementType && engagementMin) count++
    return count
  }

  const removeFilter = (filterName: string) => {
    switch(filterName) {
      case 'text': setTextQuery(''); break;
      case 'owner': setOwnerQuery(''); break;
      case 'sentiment': setSentimentFilter(''); break;
      case 'date': setDateFrom(''); setDateTo(''); break;
      case 'engagement': setEngagementType(''); setEngagementMin(''); break;
    }
  }

  if (loading && posts.length === 0) {
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
            {/* Post Text Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Post Text
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search post content..."
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  className="input-field pl-9 w-full"
                />
              </div>
            </div>

            {/* Page Owner Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Page Owner
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by page name..."
                  value={ownerQuery}
                  onChange={(e) => setOwnerQuery(e.target.value)}
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
                      <option value="reactions">Reactions</option>
                      <option value="comments">Comments</option>
                      <option value="shares">Shares</option>
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
              {textQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                  Text: "{textQuery.substring(0, 20)}{textQuery.length > 20 ? '...' : ''}"
                  <button onClick={() => removeFilter('text')} className="hover:text-gray-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {ownerQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                  Owner: {ownerQuery}
                  <button onClick={() => removeFilter('owner')} className="hover:text-gray-900">
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
                if (expandedPosts.size === posts.length) {
                  setExpandedPosts(new Set())
                } else {
                  setExpandedPosts(new Set(posts.map(post => post.id)))
                }
              }}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {expandedPosts.size === posts.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </form>
      </div>

      {/* Results Count */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
        <div className="text-sm">
          <span className="text-gray-600">Displaying </span>
          <span className="font-semibold text-gray-900">{posts.length}</span>
          <span className="text-gray-600"> Facebook posts</span>
        </div>
        <div className="text-xs text-gray-500">
          Page {currentPage} of {totalPages}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid gap-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {post.owner_name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="truncate">@{post.owner_username}</span>
                      <span>•</span>
                      <time title={format(new Date(post.created_time), 'PPpp')}>
                        {format(new Date(post.created_time), 'MMM d, yyyy')}
                      </time>
                    </div>
                  </div>
                </div>
                {post.sentiment && (
                  <span className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${getSentimentBgColor(post.sentiment)} ${getSentimentColor(post.sentiment)}`}>
                    {post.sentiment}
                  </span>
                )}
              </div>

              {/* Post Content */}
              <div className="mb-4">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {isPostExpanded(post.id) || !shouldShowExpandButton(post.post_text)
                    ? post.post_text || 'No text content'
                    : getTruncatedText(post.post_text)}
                </p>
                {shouldShowExpandButton(post.post_text) && (
                  <button
                    onClick={() => togglePostExpansion(post.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2"
                  >
                    {isPostExpanded(post.id) ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              {/* Media Indicators */}
              {(post.attached_image_url || post.attached_video_url || post.attached_link) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.attached_image_url && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      📷 Photo
                    </span>
                  )}
                  {post.attached_video_url && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-50 text-purple-700 border border-purple-200">
                      🎥 Video
                    </span>
                  )}
                  {post.attached_link && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-50 text-green-700 border border-green-200">
                      🔗 Link
                    </span>
                  )}
                </div>
              )}

              {/* Engagement Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1" title="Total Reactions">
                    <Heart className="h-4 w-4 text-red-500" />
                    {post.reactions_total.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1" title="Likes">
                    <ThumbsUp className="h-4 w-4 text-blue-500" />
                    {post.likes_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1" title="Comments">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    {post.comments_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1" title="Shares">
                    <Share2 className="h-4 w-4 text-purple-500" />
                    {post.shares_count.toLocaleString()}
                  </span>
                </div>
                {post.attached_link && (
                  <a
                    href={post.attached_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View on Facebook
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Page <span className="font-semibold">{currentPage}</span> of{' '}
              <span className="font-semibold">{totalPages}</span>
            </span>
          </div>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 mb-2">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No posts found</h3>
          <p className="text-gray-500">Try adjusting your filters or search criteria</p>
        </div>
      )}
    </div>
  )
}

export default FacebookPostsTable
