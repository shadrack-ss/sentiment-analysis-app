import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Search, TrendingUp, Users, BarChart3, MonitorPlay, RefreshCw, Clock } from 'lucide-react'
import SentimentTimeline from '../components/SentimentTimeline'
import SentimentPieChart from '../components/SentimentPieChart'
import TweetsTable from '../components/TweetsTable'
// Removed UgandaMap
// import AIAssistant from '../components/AIAssistant'
import { supabase } from '../lib/supabase'
import { Tweet, SentimentData, SentimentDistribution } from '../lib/supabase'
import '@n8n/chat/style.css'
import { createChat } from '@n8n/chat'
import { AI_ASSISTANT_CONFIG } from '../config/ai-assistant'

interface AgentTweetResponse {
  "Tweet by": string;
  "Text Content": string;
  "Reply Count": string;
  "Like Count": string;
  "Tweet URL": string;
  "Date": string;
  "Profile User Name": string;
  "Profile Description": string;
  "Sentiment": string;
}

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [nextRefresh, setNextRefresh] = useState<Date>(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(300000) // 5 minutes default
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [stats, setStats] = useState({
    totalTweets: 0,
    totalUsers: 0,
    averageSentiment: 0,
    factChecked: 0
  })

  useEffect(() => {
    fetchDashboardStats()
    
    // Set up auto-refresh
    if (autoRefreshEnabled) {
      startAutoRefresh()
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefreshEnabled, refreshInterval])

  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }
    
    if (autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        fetchDashboardStats()
      }, refreshInterval)
      
      // Calculate next refresh time
      const next = new Date(Date.now() + refreshInterval)
      setNextRefresh(next)
    }
  }

  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
  }

  const handleAutoRefreshToggle = () => {
    const newState = !autoRefreshEnabled
    setAutoRefreshEnabled(newState)
    
    if (newState) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }

  const handleManualRefresh = async () => {
    await fetchDashboardStats()
  }

  const formatTimeUntilNext = () => {
    const now = new Date()
    const diff = nextRefresh.getTime() - now.getTime()
    
    if (diff <= 0) return 'Refreshing...'
    
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Get total tweets count
      const { count: tweetsCount } = await supabase
        .from('nrm_tweets_kb')
        .select('*', { count: 'exact', head: true })

      // Get unique users count
      const { count: usersCount } = await supabase
        .from('nrm_tweets_kb')
        .select('username', { count: 'exact', head: true })

      // Get fact-checked tweets count
      const { count: factCheckedCount } = await supabase
        .from('nrm_tweets_kb')
        .select('*', { count: 'exact', head: true })
        .eq('fact_checked', true)

      // Get average sentiment (sentiment_score is now categorical)
      const { data: sentimentData } = await supabase
        .from('nrm_tweets_kb')
        .select('sentiment_score')
        .not('sentiment_score', 'is', null)
        .not('sentiment_score', 'eq', '')

      const avgSentiment = sentimentData && sentimentData.length > 0
        ? sentimentData.reduce((sum, item) => {
            // Convert categorical sentiment to numeric values for calculations
            let score = 0
            if (item.sentiment_score === 'Positive') {
              score = 1
            } else if (item.sentiment_score === 'Negative') {
              score = -1
            } else if (item.sentiment_score === 'Neutral') {
              score = 0
            }
            return sum + score
          }, 0) / sentimentData.length
        : 0

      setStats({
        totalTweets: tweetsCount || 0,
        totalUsers: usersCount || 0,
        averageSentiment: Math.round(avgSentiment * 100) / 100,
        factChecked: factCheckedCount || 0
      })
      
      setLastRefresh(new Date())
      
      // Update next refresh time
      if (autoRefreshEnabled) {
        const next = new Date(Date.now() + refreshInterval)
        setNextRefresh(next)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (autoRefreshEnabled) {
        // Force re-render to update countdown
        setNextRefresh(prev => new Date(prev.getTime()))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [autoRefreshEnabled])

  // Handle AI Chat creation and cleanup based on authentication
  useEffect(() => {
    let chatCreated = false
    let headerOverrideObserver: MutationObserver | null = null

    if (user) {
      // Create the chat when user is authenticated with error handling and delay
      const timer = setTimeout(() => {
        try {
          createChat({
            webhookUrl: AI_ASSISTANT_CONFIG.webhookUrl,
            loadPreviousSession: false,
            initialMessages: ["I\'m ready to analyze Ugandan political discourse about the NRM and President Museveni. What kind of insights are you looking for today? I can access and analyze  a database of tweets, identify sentiment, and track trends."]
          })
          chatCreated = true

          // Try to override the embedded widget header (title/subtitle)
          const applyHeaderOverride = () => {
            const root = document.querySelector('#n8n-chat') as HTMLElement | null
            if (!root) return false
            const header = root.querySelector('.chat-header') as HTMLElement | null
            if (!header) return false

            // Title: try h1/h2 or first heading element
            const titleEl = header.querySelector('h1, h2, .chat-heading, [class*="title"]') as HTMLElement | null
            if (titleEl) {
              titleEl.textContent = AI_ASSISTANT_CONFIG.name
            }

            // Subtitle: prefer p inside header
            const subtitleEl = header.querySelector('p, [class*="subtitle"], [class*="sub-title"]') as HTMLElement | null
            if (subtitleEl) {
              subtitleEl.textContent = AI_ASSISTANT_CONFIG.description
            }
            return true
          }

          // Attempt immediately and then observe DOM mutations for late render
          let applied = applyHeaderOverride()
          if (!applied) {
            headerOverrideObserver = new MutationObserver(() => {
              if (applyHeaderOverride()) {
                headerOverrideObserver && headerOverrideObserver.disconnect()
                headerOverrideObserver = null
              }
            })
            headerOverrideObserver.observe(document.body, { childList: true, subtree: true })
          }
        } catch (error) {
          console.warn('Failed to create AI chat:', error)
          // Continue without the chat if creation fails
        }
      }, 1000) // Delay chat creation by 1 second to let the page fully load

      // Cleanup timer if component unmounts
      return () => {
        clearTimeout(timer)
        if (chatCreated) {
          if (headerOverrideObserver) {
            headerOverrideObserver.disconnect()
            headerOverrideObserver = null
          }
          // Remove any existing chat elements
          const chatElements = document.querySelectorAll('[data-n8n-chat]')
          chatElements.forEach(element => element.remove())
          
          // Remove any chat-related elements
          const chatContainers = document.querySelectorAll('.n8n-chat-container, [id*="n8n-chat"]')
          chatContainers.forEach(element => element.remove())
          
          // Remove any iframes or other chat elements
          const iframes = document.querySelectorAll('iframe[src*="n8n"]')
          iframes.forEach(iframe => iframe.remove())
          
          // Remove any chat widgets by class or ID patterns
          const chatWidgets = document.querySelectorAll('[class*="chat"], [id*="chat"]')
          chatWidgets.forEach(widget => {
            if (widget.innerHTML.includes('n8n') || widget.innerHTML.includes('chat')) {
              widget.remove()
            }
          })
        }
      }
    }

    // Cleanup function for when user logs out
    return () => {
      if (chatCreated) {
        // Remove any existing chat elements
        const chatElements = document.querySelectorAll('[data-n8n-chat]')
        chatElements.forEach(element => element.remove())
        
        // Remove any chat-related elements
        const chatContainers = document.querySelectorAll('.n8n-chat-container, [id*="n8n-chat"]')
        chatContainers.forEach(element => element.remove())
        
        // Remove any iframes or other chat elements
        const iframes = document.querySelectorAll('iframe[src*="n8n"]')
        iframes.forEach(iframe => iframe.remove())
        
        // Remove any chat widgets by class or ID patterns
        const chatWidgets = document.querySelectorAll('[class*="chat"], [id*="chat"]')
        chatWidgets.forEach(widget => {
          if (widget.innerHTML.includes('n8n') || widget.innerHTML.includes('chat')) {
            widget.remove()
          }
        })
      }
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'tweets', label: 'Tweets', icon: BarChart3 },
    { id: 'custom-search', label: 'Custom Search', icon: Search },
    { id: 'youtube', label: 'YouTube', icon: MonitorPlay }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
             {/* Header */}
       <header className="bg-white shadow-soft border-b border-gray-100">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-center h-16 py-4 sm:py-0">
             <div className="flex items-center">
               <TrendingUp className="h-8 w-8 text-primary-600 mr-3" />
               <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                 Sentiment Dashboard
               </h1>
             </div>
             
             {/* Mobile: Just logout icon, Desktop: Full logout button with email */}
             <div className="flex items-center space-x-4">
               {/* Email - hidden on mobile */}
               <span className="hidden sm:block text-sm text-gray-600">
                  {user?.email}
               </span>
               
               {/* Mobile: Icon only, Desktop: Full button */}
               <button
                 onClick={handleSignOut}
                 className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                 title="Sign Out"
               >
                 <LogOut className="h-5 w-5" />
               </button>
               
               {/* Desktop: Full button */}
               <button
                 onClick={handleSignOut}
                 className="hidden sm:flex btn-secondary items-center space-x-2"
               >
                 <LogOut className="h-4 w-4" />
                 <span>Sign Out</span>
               </button>
             </div>
           </div>
         </div>
       </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                 {/* Refresh Controls - Hidden on mobile */}
         <div className="hidden sm:block">
           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6 space-y-4 lg:space-y-0">
             <h3 className="text-lg font-semibold text-gray-900">
               Refresh Controls
             </h3>
             <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
               <div className="flex items-center space-x-2">
                 <label className="text-sm text-gray-600">Interval:</label>
                 <select
                   value={refreshInterval}
                   onChange={(e) => setRefreshInterval(Number(e.target.value))}
                   className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                   disabled={!autoRefreshEnabled}
                 >
                   <option value={60000}>1 minute</option>
                   <option value={300000}>5 minutes</option>
                   <option value={600000}>10 minutes</option>
                   <option value={1800000}>30 minutes</option>
                   <option value={3600000}>1 hour</option>
                 </select>
               </div>
               <button
                 onClick={handleManualRefresh}
                 className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center"
                 disabled={loading}
               >
                 {loading && (
                   <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                 )}
                 <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                 <span>Refresh Now</span>
               </button>
               <div className="flex items-center space-x-2 text-sm text-gray-600">
                 <Clock className="h-4 w-4" />
                 <span>Next refresh: {formatTimeUntilNext()}</span>
               </div>
               <label className="flex items-center cursor-pointer">
                 <input
                   type="checkbox"
                   className="sr-only"
                   checked={autoRefreshEnabled}
                   onChange={handleAutoRefreshToggle}
                 />
                 <div className="relative">
                   <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${
                     autoRefreshEnabled ? 'bg-primary-600' : 'bg-gray-300'
                   }`}></div>
                   <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                     autoRefreshEnabled ? 'translate-x-4' : ''
                   }`}></div>
                 </div>
                 <span className="ml-2 text-sm">Auto-refresh</span>
               </label>
             </div>
           </div>
         </div>
        
                 {/* Status Bar - Hidden on mobile */}
         <div className="hidden sm:block mb-4 p-3 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-blue-800 space-y-1 sm:space-y-0">
             <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
             <span>Auto-refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
           </div>
         </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tweets</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.totalTweets.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-success-100 rounded-xl">
                <Users className="h-6 w-6 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.totalUsers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-warning-100 rounded-xl">
                <BarChart3 className="h-6 w-6 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Sentiment</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.averageSentiment}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-danger-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-danger-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Fact-checked Tweets</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.factChecked.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 sm:mb-8">
          <nav className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 bg-white p-2 sm:p-1 rounded-2xl shadow-soft">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center sm:justify-start space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 w-full sm:w-auto ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 sm:space-y-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              <div className="card p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Sentiment Timeline
                </h3>
                <SentimentTimeline />
              </div>
              
              <div className="card p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Sentiment Distribution
                </h3>
                <SentimentPieChart />
              </div>
            </div>
          )}

          {activeTab === 'tweets' && (
            <div className="card p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Tweets Analysis
              </h3>
              <TweetsTable />
            </div>
          )}

          

          {activeTab === 'custom-search' && (
            <div className="card p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Custom Search
              </h3>
              <CustomSearchTab />
            </div>
          )}
          {activeTab === 'youtube' && (
            <div className="card p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                YouTube Search
              </h3>
              <YouTubeSearchTab />
            </div>
          )}
        </div>
      </main>

      {/* AI Assistant - Fixed position overlay (now provided by @n8n/chat) */}
      {/* <AIAssistant /> */}
    </div>
  )
}

const CustomSearchTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [webhookResponse, setWebhookResponse] = useState<AgentTweetResponse[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setWebhookResponse(null)
    try {
      const response = await fetch(`https://n8n.nrmcampaign.com:5678/webhook-test/myagent?message=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AgentTweetResponse[] = await response.json()
      setWebhookResponse(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col space-y-4">
             <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
         <input
           type="text"
           className="input-field flex-grow"
           placeholder="Enter your search query..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
         <button 
           onClick={handleSearch} 
           className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
           disabled={loading}
         >
          {loading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
      </div>
      {error && <p className="text-danger-600">Error: {error}</p>}
      {webhookResponse && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {webhookResponse.map((tweet, index) => (
            <TweetCard key={index} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  )
}

interface TweetCardProps {
  tweet: AgentTweetResponse;
}

const TweetCard: React.FC<TweetCardProps> = ({ tweet }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-success-100 text-success-800';
      case 'negative':
        return 'bg-danger-100 text-danger-800';
      case 'neutral':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="card p-4 flex flex-col space-y-3">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-primary-700">@{tweet["Profile User Name"]}</span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(tweet.Sentiment)}`}>
          {tweet.Sentiment}
        </span>
      </div>
      <p className="text-gray-800 text-sm flex-grow">{tweet["Text Content"]}</p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Likes: {tweet["Like Count"]}</span>
        <span>Replies: {tweet["Reply Count"]}</span>
        <span>Date: {new Date(tweet.Date).toLocaleDateString()}</span>
      </div>
      {tweet["Tweet URL"] && (
        <a 
          href={tweet["Tweet URL"]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline text-sm self-start"
        >
          Read more on Twitter
        </a>
      )}
    </div>
  );
};

interface YouTubeVideo {
  Title: string;
  Channel: string;
  "Video URL": string;
  "Publish Date": string;
  Description: string;
  Sentiment: string;
}

interface YouTubeAgentResponse {
  success?: boolean;
  message?: string;
  error?: string;
  videos?: YouTubeVideo[];
}

const YouTubeSearchTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [youtubeResponse, setYoutubeResponse] = useState<YouTubeAgentResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setYoutubeResponse(null)
    try {
      const response = await fetch(`https://n8n.nrmcampaign.com:5678/webhook-test/youtubeagent?message=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: YouTubeVideo[] = await response.json()
      setYoutubeResponse({ videos: data })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col space-y-4">
             <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
         <input
           type="text"
           className="input-field flex-grow"
           placeholder="Search YouTube videos..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
         <button 
           onClick={handleSearch} 
           className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
           disabled={loading}
         >
          {loading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
      </div>
      {error && <p className="text-danger-600">Error: {error}</p>}
      {youtubeResponse && youtubeResponse.videos && youtubeResponse.videos.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {youtubeResponse.videos.map((video, index) => (
            <VideoCard key={index} video={video} />
          ))}
        </div>
      )}
      {youtubeResponse && youtubeResponse.videos && youtubeResponse.videos.length === 0 && !error && (
        <p className="text-gray-600">No videos found</p>
      )}
    </div>
  )
}

interface VideoCardProps {
  video: YouTubeVideo;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-success-100 text-success-800';
      case 'negative':
        return 'bg-danger-100 text-danger-800';
      case 'neutral':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(video["Video URL"]);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

  return (
    <div className="card p-4 flex flex-col space-y-3">
      {embedUrl && (
        <div className="w-full h-48 mb-3">
          <iframe
            src={embedUrl}
            title={video.Title}
            className="w-full h-full rounded-md"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-primary-700 text-lg line-clamp-2 flex-grow mr-2">{video.Title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(video.Sentiment)}`}>
          {video.Sentiment}
        </span>
      </div>
      <p className="text-gray-600 text-sm">Channel: {video.Channel}</p>
      <p className="text-gray-800 text-sm flex-grow line-clamp-3">{video.Description}</p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Published: {video["Publish Date"]}</span>
      </div>
      <a 
        href={video["Video URL"]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 hover:underline text-sm self-start"
      >
        Watch on YouTube
      </a>
    </div>
  );
};

export default Dashboard
