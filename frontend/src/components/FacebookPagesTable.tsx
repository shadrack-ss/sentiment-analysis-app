import { useState, useEffect } from 'react';
import { supabase, FacebookPost } from '../lib/supabase';
import { User, Search, ChevronLeft, Heart, MessageCircle, Share2 } from 'lucide-react';

interface PageData {
  owner_name: string;
  owner_username: string;
  post_count: number;
  last_sentiment: string;
}

export default function FacebookPagesTable() {
  const [pages, setPages] = useState<PageData[]>([]);
  const [filteredPages, setFilteredPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pagePosts, setPagePosts] = useState<FacebookPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pagesPerPage = 24;

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPages(pages);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = pages.filter(
        (page) =>
          page.owner_name.toLowerCase().includes(query) ||
          page.owner_username?.toLowerCase().includes(query)
      );
      setFilteredPages(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, pages]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('fb_posts')
        .select('*')
        .order('created_time', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        setPages([]);
        setFilteredPages([]);
        return;
      }

      // Group by page owner
      const pageMap = new Map<string, PageData>();

      data?.forEach((post) => {
        const ownerName = post.owner_name;
        const sentiment = post.sentiment || 'Neutral';
        
        if (pageMap.has(ownerName)) {
          pageMap.get(ownerName)!.post_count += 1;
        } else {
          pageMap.set(ownerName, {
            owner_name: ownerName,
            owner_username: post.owner_username || '',
            post_count: 1,
            last_sentiment: sentiment,
          });
        }
      });

      const pagesArray = Array.from(pageMap.values())
        .sort((a, b) => b.post_count - a.post_count);

      setPages(pagesArray);
      setFilteredPages(pagesArray);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPagePosts = async (ownerName: string) => {
    try {
      setLoadingPosts(true);
      const { data, error } = await supabase
        .from('fb_posts')
        .select('*')
        .eq('owner_name', ownerName)
        .order('created_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPagePosts(data || []);
    } catch (error) {
      console.error('Error fetching page posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handlePageClick = (ownerName: string) => {
    if (selectedPage === ownerName) {
      setSelectedPage(null);
      setPagePosts([]);
    } else {
      setSelectedPage(ownerName);
      fetchPagePosts(ownerName);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'Positive') return 'text-green-600';
    if (sentiment === 'Negative') return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentBg = (sentiment: string) => {
    if (sentiment === 'Positive') return 'bg-green-100';
    if (sentiment === 'Negative') return 'bg-red-100';
    return 'bg-yellow-100';
  };

  // Pagination
  const indexOfLastPage = currentPage * pagesPerPage;
  const indexOfFirstPage = indexOfLastPage - pagesPerPage;
  const currentPages = filteredPages.slice(indexOfFirstPage, indexOfLastPage);
  const totalPages = Math.ceil(filteredPages.length / pagesPerPage);

  if (selectedPage) {
    const page = pages.find((p) => p.owner_name === selectedPage);
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setSelectedPage(null);
            setPagePosts([]);
          }}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Pages
        </button>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {page?.owner_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{page?.owner_name}</h2>
              {page?.owner_username && (
                <p className="text-gray-600">@{page.owner_username}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                {page?.post_count} posts • Last sentiment: {' '}
                <span className={`font-semibold ${getSentimentColor(page?.last_sentiment || 'Neutral')}`}>
                  {page?.last_sentiment}
                </span>
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900">Recent Posts</h3>
        
        {loadingPosts ? (
          <div className="text-center py-8 text-gray-600">Loading posts...</div>
        ) : (
          <div className="space-y-4">
            {pagePosts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm text-gray-500">
                    {new Date(post.created_time).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  {post.sentiment && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentBg(post.sentiment)} ${getSentimentColor(post.sentiment)}`}>
                      {post.sentiment}
                    </span>
                  )}
                </div>
                <p className="text-gray-800 mb-3 whitespace-pre-wrap line-clamp-3">
                  {post.post_text || 'No text content'}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    {post.reactions_total.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    {post.comments_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-4 w-4 text-green-500" />
                    {post.shares_count.toLocaleString()}
                  </span>
                  {post.post_url && (
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Post →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search pages by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-gray-700">
          Showing <span className="font-semibold text-blue-700">{currentPages.length}</span> of{' '}
          <span className="font-semibold text-blue-700">{filteredPages.length}</span> pages
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading pages...</div>
      ) : currentPages.length === 0 ? (
        <div className="text-center py-12 text-gray-600">No pages found</div>
      ) : (
        <>
          {/* Pages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentPages.map((page) => (
              <button
                key={page.owner_name}
                onClick={() => handlePageClick(page.owner_name)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-400 transition-all duration-200 cursor-pointer text-center"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
                  {page.owner_name.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-semibold text-gray-900 text-base mb-2 truncate" title={page.owner_name}>
                  {page.owner_name}
                </h3>
                {page.owner_username && (
                  <p className="text-sm text-gray-500 mb-3 truncate">@{page.owner_username}</p>
                )}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-gray-600">{page.post_count} posts</span>
                </div>
                <div className={`mt-3 text-sm font-medium ${getSentimentColor(page.last_sentiment)}`}>
                  {page.last_sentiment}
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
