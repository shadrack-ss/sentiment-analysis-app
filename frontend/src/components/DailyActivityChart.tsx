import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface DayData {
  date: string;
  count: number;
}

export default function DailyActivityChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyActivity();
  }, []);

  const fetchDailyActivity = async () => {
    try {
      setLoading(true);
      const { data: tweets, error } = await supabase
        .from('nrm_tweets_kb')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const dayMap = new Map<string, number>();

      tweets?.forEach((tweet) => {
        const date = format(new Date(tweet.created_at), 'MMM dd');
        dayMap.set(date, (dayMap.get(date) || 0) + 1);
      });

      const chartData = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .slice(-14); // Last 14 days

      setData(chartData);
    } catch (error) {
      console.error('Error fetching daily activity:', error);
    } finally {
      setLoading(false);
    }
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
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
            formatter={(value: number) => [`${value} tweets`, 'Count']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorCount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
