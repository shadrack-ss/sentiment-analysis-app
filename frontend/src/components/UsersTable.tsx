import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Search, ChevronLeft, MessageSquare, TrendingUp } from 'lucide-react';

interface UserData {
  username: string;
  display_name: string;
  profile_image_url: string | null;
  tweet_count: number;
  last_sentiment: string;
}

interface Tweet {
  id: number;
  username: string;
  display_name: string;
  profile_image_url: string | null;
  text_content: string;
  created_at: string;
  sentiment_score: string;
  like_count: number;
  reply_count: number;
  tweet_url: string | null;
}

export default function UsersTable() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userTweets, setUserTweets] = useState<Tweet[]>([]);
  const [loadingTweets, setLoadingTweets] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 24;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.display_name.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users from nrm_tweets_kb...');
      
      // Fetch all tweets with all columns, ordered by date (most recent first)
      const { data, error } = await supabase
        .from('nrm_tweets_kb')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Users query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No tweets found in database');
        setUsers([]);
        setFilteredUsers([]);
        return;
      }

      // Group by username - tweets are already ordered by date (most recent first)
      // So the first occurrence of each username will be their latest tweet
      const userMap = new Map<string, UserData>();
      let sampleCount = 0;

      data?.forEach((tweet) => {
        const username = tweet.username;
        const sentiment = tweet.sentiment_score || 'Neutral';
        
        // Log first 5 tweets to see what sentiment scores look like
        if (sampleCount < 5) {
          console.log('Sample tweet:', {
            username: tweet.username,
            sentiment_score: tweet.sentiment_score,
            type: typeof tweet.sentiment_score
          });
          sampleCount++;
        }
        
        if (userMap.has(username)) {
          // User already exists, just increment tweet count
          const existing = userMap.get(username)!;
          existing.tweet_count += 1;
        } else {
          // First time seeing this user = their latest tweet (since data is ordered by date desc)
          console.log(`New user ${username}: sentiment_score=${tweet.sentiment_score}`);
          
          userMap.set(username, {
            username: tweet.username || 'Unknown',
            display_name: tweet.display_name || tweet.username || 'Unknown User',
            profile_image_url: tweet.profile_image_url || null,
            tweet_count: 1,
            last_sentiment: sentiment,
          });
        }
      });

      // Convert map to array and sort by tweet count
      const usersArray = Array.from(userMap.values()).sort(
        (a, b) => b.tweet_count - a.tweet_count
      );
      
      console.log('Processed users:', usersArray.length, usersArray);
      setUsers(usersArray);
      setFilteredUsers(usersArray);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTweets = async (username: string) => {
    try {
      setLoadingTweets(true);
      setSelectedUser(username);

      const { data, error } = await supabase
        .from('nrm_tweets_kb')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserTweets(data || []);
    } catch (error) {
      console.error('Error fetching user tweets:', error);
    } finally {
      setLoadingTweets(false);
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    if (sentiment === 'Positive') return { label: 'Positive', color: 'text-green-600' };
    if (sentiment === 'Negative') return { label: 'Negative', color: 'text-red-600' };
    return { label: 'Neutral', color: 'text-amber-600' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (selectedUser) {
    const user = users.find((u) => u.username === selectedUser);
    const sentiment = user?.last_sentiment || 'Neutral';
    const sentimentInfo = getSentimentLabel(sentiment);

    return (
      <div className="space-y-4">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedUser(null);
              setUserTweets([]);
            }}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Users
          </button>
        </div>

        {/* User Info Card */}
        {user && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center gap-4">
              {user.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt={user.display_name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">{user.display_name}</h2>
                <p className="text-gray-600">@{user.username}</p>
              </div>
            </div>

            {/* User Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">Total Tweets</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{user.tweet_count}</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Last Tweet Sentiment</span>
                </div>
                <p className={`text-2xl font-bold ${sentimentInfo.color}`}>
                  {sentimentInfo.label}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tweets List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Tweets ({userTweets.length})
            </h3>
          </div>

          {loadingTweets ? (
            <div className="p-8 text-center text-gray-600">Loading tweets...</div>
          ) : userTweets.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No tweets found</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {userTweets.map((tweet) => {
                const sentiment = getSentimentLabel(tweet.sentiment_score);
                return (
                  <div key={tweet.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {tweet.profile_image_url ? (
                        <img
                          src={tweet.profile_image_url}
                          alt={tweet.display_name}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">
                            {tweet.display_name}
                          </span>
                          <span className="text-gray-600">@{tweet.username}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-600 text-sm">
                            {formatDate(tweet.created_at)}
                          </span>
                        </div>

                        <p className="text-gray-800 mb-3 whitespace-pre-wrap break-words">
                          {tweet.text_content}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Sentiment:</span>
                            <span className={`font-semibold ${sentiment.color}`}>
                              {sentiment.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-gray-600">
                            <span>❤️ {tweet.like_count}</span>
                            <span>💬 {tweet.reply_count}</span>
                          </div>

                          {tweet.tweet_url && (
                            <a
                              href={tweet.tweet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View on Twitter
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Users List View
  return (
    <div className="space-y-4">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Users</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{users.length}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Total Tweets</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {users.reduce((sum, user) => sum + user.tweet_count, 0)}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Showing</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{filteredUsers.length}</p>
        </div>
      </div>

      {/* Users Grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No users found</div>
        ) : (
          <>
            {/* Pagination Info */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * usersPerPage + 1, filteredUsers.length)} - {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {Math.ceil(filteredUsers.length / usersPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredUsers.length / usersPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(filteredUsers.length / usersPerPage)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredUsers
              .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
              .map((user) => {
              const sentiment = getSentimentLabel(user.last_sentiment);
              return (
                <button
                  key={user.username}
                  onClick={() => fetchUserTweets(user.username)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {user.profile_image_url ? (
                      <img
                        src={user.profile_image_url}
                        alt={user.display_name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {user.display_name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tweets:</span>
                      <span className="font-semibold text-gray-800">
                        {user.tweet_count}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Last Tweet:</span>
                      <span className={`font-semibold ${sentiment.color}`}>
                        {sentiment.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
