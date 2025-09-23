import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Search, TrendingUp, Users, BarChart3, MonitorPlay, RefreshCw, Clock, Menu } from 'lucide-react';
import SentimentTimeline from '../components/SentimentTimeline';
import SentimentPieChart from '../components/SentimentPieChart';
import TweetsTable from '../components/TweetsTable';
import { supabase } from '../lib/supabase';
import { Tweet, SentimentData, SentimentDistribution } from '../lib/supabase';
import '@n8n/chat/style.css';
import { AI_ASSISTANT_CONFIG } from '../config/ai-assistant';

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
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [nextRefresh, setNextRefresh] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes default
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [stats, setStats] = useState({
    totalTweets: 0,
    totalUsers: 0,
    averageSentiment: 0,
    factChecked: 0,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchDashboardStats();

    if (autoRefreshEnabled) {
      startAutoRefresh();
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, refreshInterval]);

  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    if (autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        fetchDashboardStats();
      }, refreshInterval);

      const next = new Date(Date.now() + refreshInterval);
      setNextRefresh(next);
    }
  };

  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const handleAutoRefreshToggle = () => {
    const newState = !autoRefreshEnabled;
    setAutoRefreshEnabled(newState);

    if (newState) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  };

  const handleManualRefresh = async () => {
    await fetchDashboardStats();
  };

  const formatTimeUntilNext = () => {
    const now = new Date();
    const diff = nextRefresh.getTime() - now.getTime();

    if (diff <= 0) return 'Refreshing...';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      const { count: tweetsCount } = await supabase
        .from('nrm_tweets_kb')
        .select('*', { count: 'exact', head: true });

      // Count unique users correctly
      const { data: userRows } = await supabase
        .from('nrm_tweets_kb')
        .select('username');
      const uniqueUsernames = userRows ? new Set(userRows.map(row => row.username)) : new Set();
      const usersCount = uniqueUsernames.size;

      const { count: factCheckedCount } = await supabase
        .from('nrm_tweets_kb')
        .select('*', { count: 'exact', head: true })
        .eq('fact_checked', true);

      const { data: sentimentData } = await supabase
        .from('nrm_tweets_kb')
        .select('sentiment_score')
        .not('sentiment_score', 'is', null)
        .not('sentiment_score', 'eq', '');

      const avgSentiment =
        sentimentData && sentimentData.length > 0
          ? sentimentData.reduce((sum, item) => {
              let score = 0;
              if (item.sentiment_score === 'Positive') {
                score = 1;
              } else if (item.sentiment_score === 'Negative') {
                score = -1;
              } else if (item.sentiment_score === 'Neutral') {
                score = 0;
              }
              return sum + score;
            }, 0) / sentimentData.length
          : 0;

      setStats({
        totalTweets: tweetsCount || 0,
        totalUsers: usersCount || 0,
        averageSentiment: Math.round(avgSentiment * 100) / 100,
        factChecked: factCheckedCount || 0,
      });

      setLastRefresh(new Date());

      if (autoRefreshEnabled) {
        const next = new Date(Date.now() + refreshInterval);
        setNextRefresh(next);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (autoRefreshEnabled) {
        setNextRefresh((prev) => new Date(prev.getTime()));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled]);

  const handleSignOut = async () => {
    await signOut();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'tweets', label: 'Tweets', icon: BarChart3 },
    { id: 'custom-search', label: 'Custom Search', icon: Search },
    { id: 'youtube', label: 'YouTube', icon: MonitorPlay },
    { id: 'send-sms', label: 'Send SMS', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col">
      {/* Responsive Topbar */}
      <nav className="bg-yellow-400 shadow-md sticky top-0 z-50 lg:static">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                className="lg:hidden p-2 rounded-md text-gray-900 hover:bg-yellow-300"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-expanded={isSidebarOpen}
                aria-label="Toggle navigation"
              >
                <Menu className="h-6 w-6" />
              </button>

              <div className="flex items-center">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-6 w-6 sm:h-8 sm:w-8 mr-2"
                  onError={(e) => {
                    console.error('Logo failed to load, using fallback text');
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-base sm:text-lg font-bold text-gray-900">
                  <span className="hidden sm:inline">Sentiment Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </span>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2">
              <span className="hidden sm:inline text-sm font-medium text-gray-900">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-900 hover:bg-yellow-300 rounded-md text-sm font-medium"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:static lg:z-auto ${{
            true: isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            false: ''
          }[String(window.innerWidth < 1024)]} ${isSidebarCollapsed ? 'w-20' : 'w-64'} lg:translate-x-0`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-yellow-200">
              <div className="flex items-center">
                {(!isSidebarCollapsed || typeof window !== 'undefined' && window.innerWidth < 1024) && (
                  <img src="/logo.png" alt="Logo" className={`h-8 w-8 mr-3 transition-all duration-300 ${isSidebarCollapsed ? 'mr-0' : 'mr-3'}`} onError={() => console.error('Failed to load logo.png')} />
                )}
                {!isSidebarCollapsed && <h1 className="text-lg font-bold text-gray-900">Sentiment Dashboard</h1>}
              </div>
              <div className="flex items-center space-x-2">
                {/* Collapse/Expand button for desktop */}
                <button
                  className="hidden lg:inline-flex p-2 text-gray-900 hover:text-gray-700"
                  onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                  aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  )}
                </button>
                {/* Close button for mobile */}
                <button className="lg:hidden p-2 text-gray-900 hover:text-gray-700" onClick={() => setIsSidebarOpen(false)}>
                  <Menu className="h-6 w-6" />
                </button>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`flex items-center space-x-2 w-full px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    {!isSidebarCollapsed && <span>{tab.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Refresh Controls - hidden on mobile */}
          <div className="hidden sm:flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6 space-y-4 lg:space-y-0">
            <h3 className="text-lg font-semibold text-gray-900">Refresh Controls</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Interval:</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                className="flex items-center space-x-2 w-full sm:w-auto justify-center bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 px-4 rounded-lg"
                disabled={loading}
              >
                {loading && (
                  <svg
                    className="animate-spin h-5 w-5 text-gray-900"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Now</span>
                <span className="sm:hidden">Refresh</span>
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Next refresh: {formatTimeUntilNext()}</span>
                <span className="sm:hidden">Next: {formatTimeUntilNext()}</span>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={autoRefreshEnabled}
                  onChange={handleAutoRefreshToggle}
                />
                <div className="relative">
                  <div
                    className={`block w-10 h-6 rounded-full transition-colors duration-300 ${
                      autoRefreshEnabled ? 'bg-yellow-400' : 'bg-gray-300'
                    }`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                      autoRefreshEnabled ? 'translate-x-4' : ''
                    }`}
                  ></div>
                </div>
                <span className="ml-2 text-sm">Auto-refresh</span>
              </label>
            </div>
          </div>
          {/* Last updated info - hidden on mobile */}
          <div className="hidden sm:block mb-4 p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-yellow-800 space-y-1 sm:space-y-0">
              <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
              <span>Auto-refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tweets</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.totalTweets.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-xl">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unique Users</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.totalUsers.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Sentiment</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.averageSentiment}</p>
                </div>
              </div>
            </div>

            <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Fact-checked Tweets</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.factChecked.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {activeTab === 'send-sms' && (
              <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
                <SendSmsCard />
              </div>
            )}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Timeline</h3>
                  <SentimentTimeline />
                </div>

                <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
                  <SentimentPieChart />
                </div>
              </div>
            )}

            {activeTab === 'tweets' && (
              <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tweets Analysis</h3>
                <TweetsTable />
              </div>
            )}

            {activeTab === 'custom-search' && (
              <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Search</h3>
                <CustomSearchTab />
              </div>
            )}
            {activeTab === 'youtube' && (
              <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">YouTube Search</h3>
                <YouTubeSearchTab />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const CustomSearchTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [webhookResponse, setWebhookResponse] = useState<AgentTweetResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setWebhookResponse(null);
    try {
      const response = await fetch(`${AI_ASSISTANT_CONFIG.customSearchWebhookUrl}?message=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AgentTweetResponse[] = await response.json();
      setWebhookResponse(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <input
          type="text"
          className="form-control flex-grow border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="Enter your search query..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={handleSearch}
          className="btn btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 px-4 rounded-lg"
          disabled={loading}
        >
          {loading && (
            <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
      </div>
      {error && <p className="text-danger">Error: {error}</p>}
      {webhookResponse && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {webhookResponse.map((tweet, index) => (
            <TweetCard key={index} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  );
};

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
    <div className="card p-4 flex flex-col space-y-3 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-yellow-700">@{tweet['Profile User Name']}</span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(tweet.Sentiment)}`}>{tweet.Sentiment}</span>
      </div>
      <p className="text-gray-800 text-sm flex-grow">{tweet['Text Content']}</p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Likes: {tweet['Like Count']}</span>
        <span>Replies: {tweet['Reply Count']}</span>
        <span>Date: {new Date(tweet.Date).toLocaleDateString()}</span>
      </div>
      {tweet['Tweet URL'] && (
        <a
          href={tweet['Tweet URL']}
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-700 hover:underline text-sm self-start"
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
  'Video URL': string;
  'Publish Date': string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [youtubeResponse, setYoutubeResponse] = useState<YouTubeAgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setYoutubeResponse(null);
    try {
      const response = await fetch(`${AI_ASSISTANT_CONFIG.youtubeWebhookUrl}?message=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: YouTubeVideo[] = await response.json();
      setYoutubeResponse({ videos: data });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <input
          type="text"
          className="form-control flex-grow border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="Search YouTube videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={handleSearch}
          className="btn btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 px-4 rounded-lg"
          disabled={loading}
        >
          {loading && (
            <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
      </div>
      {error && <p className="text-danger">Error: {error}</p>}
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
  );
};

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

  const videoId = getVideoId(video['Video URL']);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

  return (
    <div className="card p-4 flex flex-col space-y-3 bg-white shadow rounded-lg">
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
        <h4 className="font-semibold text-yellow-700 text-lg line-clamp-2 flex-grow mr-2">{video.Title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(video.Sentiment)}`}>{video.Sentiment}</span>
      </div>
      <p className="text-gray-600 text-sm">Channel: {video.Channel}</p>
      <p className="text-gray-800 text-sm flex-grow line-clamp-3">{video.Description}</p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Published: {video['Publish Date']}</span>
      </div>
      <a
        href={video['Video URL']}
        target="_blank"
        rel="noopener noreferrer"
        className="text-yellow-700 hover:underline text-sm self-start"
      >
        Watch on YouTube
      </a>
    </div>
  );
};

interface SendSmsResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

const SendSmsCard: React.FC = () => {
  const [message, setMessage] = useState('');
  const [sendTime, setSendTime] = useState('immediate');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; text: string }>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch('http://n8n.nrmcampaign.com:5678/webhook/voter-mobilization-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'manual',
          message,
          target_segment: 'all_voters',
          send_time: sendTime,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: SendSmsResponse = await response.json();
      setFeedback({ type: 'success', text: data.message || 'Message sent successfully!' });
      setMessage('');
    } catch (error: any) {
      setFeedback({ type: 'error', text: error.message || 'Failed to send message.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4 sm:p-6 bg-white shadow rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Voter Mobilization SMS</h3>
      <form className="flex flex-col space-y-4" onSubmit={handleSubmit}>
        <textarea
          className="form-control min-h-[80px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="Write your SMS message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={160}
        />
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Send Time</label>
          <select
            className="form-control border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={sendTime}
            onChange={(e) => setSendTime(e.target.value)}
            required
          >
            <option value="immediate">Immediate</option>
            <option value="scheduled">Scheduled (future feature)</option>
          </select>
        </div>
        <button
          type="submit"
          className="btn btn-primary bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 px-4 rounded-lg flex items-center justify-center"
          disabled={loading || !message.trim()}
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-gray-900 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : null}
          Send SMS
        </button>
        {feedback && (
          <div className={`mt-2 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>{feedback.text}</div>
        )}
      </form>
      <div className="text-xs text-gray-500 mt-2">Max 160 characters. Message will be sent to all voters.</div>
    </div>
  );
};

export default Dashboard;