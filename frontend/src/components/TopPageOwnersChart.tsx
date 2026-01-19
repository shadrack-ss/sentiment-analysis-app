import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PageOwnerData {
  owner_name: string;
  post_count: number;
  sentiment: string;
}

export default function TopPageOwnersChart() {
  const [data, setData] = useState<PageOwnerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPageOwners();
  }, []);

  const fetchTopPageOwners = async () => {
    try {
      setLoading(true);
      const { data: posts, error } = await supabase
        .from('fb_posts')
        .select('owner_name, sentiment')
        .order('created_time', { ascending: false });

      if (error) throw error;

      const ownerMap = new Map<string, { count: number; sentiment: string }>();

      posts?.forEach((post) => {
        const ownerName = post.owner_name;
        if (ownerMap.has(ownerName)) {
          ownerMap.get(ownerName)!.count += 1;
        } else {
          ownerMap.set(ownerName, {
            count: 1,
            sentiment: post.sentiment || 'Neutral',
          });
        }
      });

      const topOwners = Array.from(ownerMap.entries())
        .map(([owner_name, data]) => ({
          owner_name: owner_name.length > 15 ? owner_name.substring(0, 15) + '...' : owner_name,
          post_count: data.count,
          sentiment: data.sentiment,
        }))
        .sort((a, b) => b.post_count - a.post_count)
        .slice(0, 10);

      setData(topOwners);
    } catch (error) {
      console.error('Error fetching top page owners:', error);
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
    <div className="w-full h-80 -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            type="category" 
            dataKey="owner_name" 
            tick={{ fontSize: 12 }} 
            width={150}
            interval={0}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
            formatter={(value: number) => [`${value} posts`, 'Count']}
          />
          <Bar dataKey="post_count" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.sentiment)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
