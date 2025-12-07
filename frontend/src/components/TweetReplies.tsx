import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet } from '../lib/supabase';
import { Edit2, Save, X, MessageSquare, CheckCircle, Clock, AlertCircle, Send } from 'lucide-react';

interface TweetRepliesProps {}

const TweetReplies: React.FC<TweetRepliesProps> = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTweetsWithReplies();
  }, []);

  const fetchTweetsWithReplies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('nrm_tweets_kb')
        .select('*')
        .not('reply_text', 'is', null)
        .order('checked_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTweets(data || []);
    } catch (err: any) {
      setError('Failed to fetch tweets: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReply = (tweetId: string, currentReply: string) => {
    setEditingReply(tweetId);
    setEditText(currentReply);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingReply(null);
    setEditText('');
    setError(null);
  };

  const handleSaveAndPost = async (tweetId: string) => {
    if (!editText.trim()) {
      setError('Reply text cannot be empty');
      return;
    }

    try {
      setPosting(true);
      setError(null);
      setSuccess(null);

      console.log('Starting save and post process for tweet:', tweetId);

      // First, save to database
      const { error: dbError } = await supabase
        .from('nrm_tweets_kb')
        .update({ 
          reply_text: editText.trim(),
          checked_at: new Date().toISOString()
        })
        .eq('tweet_id', tweetId);

      if (dbError) {
        throw new Error('Database error: ' + dbError.message);
      }

      console.log('Database updated successfully');

      // Then, post to Twitter
      console.log('Sending request to /api/twitter/post-reply');
      
      const response = await fetch('/api/twitter/post-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetId: tweetId,
          replyText: editText.trim()
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse.substring(0, 500));
        throw new Error(`Server returned non-JSON response (${response.status}). The API endpoint may not be configured correctly.`);
      }

      const result = await response.json();
      console.log('Parsed response:', result);

      if (!response.ok) {
        throw new Error('Twitter API error: ' + (result.message || 'Failed to post reply'));
      }

      // Update database with posting status
      const { error: updateError } = await supabase
        .from('nrm_tweets_kb')
        .update({ 
          correction_posted: true,
          reply_posted_at: new Date().toISOString()
        })
        .eq('tweet_id', tweetId);

      if (updateError) {
        console.warn('Failed to update posting status:', updateError);
      }

      setSuccess('Reply saved and posted to Twitter successfully!');
      
      // Update local state
      setTweets(prev => prev.map(tweet => 
        tweet.tweet_id === tweetId 
          ? { 
              ...tweet, 
              reply_text: editText.trim(), 
              checked_at: new Date().toISOString(),
              correction_posted: true,
              reply_posted_at: new Date().toISOString()
            }
          : tweet
      ));

      setEditingReply(null);
      setEditText('');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);

    } catch (err: any) {
      console.error('Error in handleSaveAndPost:', err);
      setError('Failed to save and post reply: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const getSentimentColor = (sentiment: string | null | undefined) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <span className="ml-2 text-gray-600">Loading tweets with replies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Tweet Replies Management
        </h3>
        <button
          onClick={fetchTweetsWithReplies}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-700 hover:text-red-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>{success}</span>
          <button 
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-700 hover:text-green-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {tweets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No tweets with replies found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tweets.map((tweet) => (
            <div key={`reply-${tweet.id}`} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Original Tweet */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">@{tweet.username}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(tweet.sentiment_score)}`}>
                      {tweet.sentiment_score || 'Unknown'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(tweet.created_at)}
                  </span>
                </div>
                <p className="text-gray-800 mb-3">{tweet.text}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>❤️ {tweet.like_count || 0}</span>
                  <span>🔄 {tweet.retweet_count || 0}</span>
                  <span>💬 {tweet.reply_count || 0}</span>
                  {tweet.district && <span>📍 {tweet.district}</span>}
                </div>
              </div>

              {/* Reply Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    AI Fact-Check Reply
                  </h4>
                  <div className="flex items-center space-x-2">
                    {tweet.correction_posted && (
                      <span className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Posted
                      </span>
                    )}
                    {tweet.reply_posted_at && (
                      <span className="flex items-center text-gray-500 text-sm">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(tweet.reply_posted_at)}
                      </span>
                    )}
                  </div>
                </div>

                {editingReply === tweet.tweet_id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      rows={4}
                      placeholder="Enter your reply text..."
                      disabled={posting}
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {editText.length} characters
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSaveAndPost(tweet.tweet_id)}
                          disabled={posting || !editText.trim()}
                          className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {posting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Save & Post
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={posting}
                          className="flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-gray-800 whitespace-pre-wrap">{tweet.reply_text}</p>
                    </div>
                    <button
                      onClick={() => handleEditReply(tweet.tweet_id, tweet.reply_text || '')}
                      disabled={posting}
                      className="flex items-center px-3 py-2 text-yellow-600 hover:text-yellow-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TweetReplies;