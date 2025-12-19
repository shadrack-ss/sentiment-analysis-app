import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface UserData {
  username: string;
  tweet_count: number;
  sentiment: string;
}

export default function TopUsersChart() {
  const [data, setData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopUsers();
  }, []);

  const fetchTopUsers = async () => {
    try {
      setLoading(true);
      const { data: tweets, error } = await supabase
        .from('nrm_tweets_kb')
        .select('username, sentiment_score')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userMap = new Map<string, { count: number; sentiment: string }>();

      tweets?.forEach((tweet) => {
        const username = tweet.username;
        if (userMap.has(username)) {
          userMap.get(username)!.count += 1;
        } else {
          userMap.set(username, {
            count: 1,
            sentiment: tweet.sentiment_score || 'Neutral',
          });
        }
      });

      const topUsers = Array.from(userMap.entries())
        .map(([username, data]) => ({
          username: username.length > 15 ? username.substring(0, 15) + '...' : username,
          tweet_count: data.count,
          sentiment: data.sentiment,
        }))
        .sort((a, b) => b.tweet_count - a.tweet_count)
        .slice(0, 10);

      setData(topUsers);
    } catch (error) {
      console.error('Error fetching top users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBarColor = (sentiment: string) => {
    if (sentiment === 'Positive') return '#22c55e';
    if (sentiment === 'Negative') return '#ef4444';
    return '#f59e0b';
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-gray-600">Loading...</div>;
  }

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-600">No data available</div>;
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="username" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
            formatter={(value: number) => [`${value} tweets`, 'Count']}
          />
          <Bar dataKey="tweet_count" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.sentiment)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
