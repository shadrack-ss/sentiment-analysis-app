# Uganda Sentiment Analysis Dashboard - AI Agent Guide

## Project Architecture

This is a **full-stack political sentiment analysis dashboard** for tracking Uganda-related social media discourse about NRM, President Museveni, Hon. Anita Among, and Hon. Thomas Tayebwa across **Twitter and Facebook**. The application consists of:

- **Frontend**: React 18 + TypeScript + Tailwind CSS (CRA-based)
- **Backend**: Minimal Node.js static server ([backend/server.js](backend/server.js)) serving build files + API routes
- **Database**: Supabase (PostgreSQL) with `nrm_tweets_kb` and `fb_posts` tables
- **AI Integration**: n8n webhooks for chat assistant, fact-checking, and YouTube search
- **Process Management**: PM2 via [ecosystem.config.js](ecosystem.config.js)

## Critical Data Model

### Twitter Table: `nrm_tweets_kb`
```typescript
sentiment_score: 'Positive' | 'Negative' | 'Neutral' | null  // NOT a number!
fact_checked: boolean
correction_posted: boolean
reply_text: string  // AI-generated fact-check replies from n8n
```

### Facebook Table: `fb_posts`
```typescript
sentiment: 'Positive' | 'Negative' | 'Neutral' | null  // Matches Twitter format
reactions_total, likes_count, comments_count, shares_count: number
owner_name, owner_username: string  // Page identifiers
```

**Both use categorical sentiment** (`Positive`, `Negative`, `Neutral` as VARCHAR), not numerical scores. Helper function `sentimentToNumber()` converts to numeric (-1, 0, 1) only for calculations.

See [backend/database-setup.sql](backend/database-setup.sql), [backend/facebook-posts-rls-setup.sql](backend/facebook-posts-rls-setup.sql), and [frontend/src/lib/supabase.ts](frontend/src/lib/supabase.ts) for complete schema.

## Key Workflows

### Development
```bash
# Frontend only (development)
cd frontend && npm start  # Runs on port 3000

# Backend + Frontend (production-like with PM2)
pm2 start ecosystem.config.js  # Backend on port 5000, frontend on 3000
pm2 logs  # View logs
```

Use [start.bat](start.bat) on Windows for quick frontend-only development start.

### Database Changes
Always update both:
1. SQL files in [backend/](backend/) (e.g., `add-reply-columns.sql`)
2. TypeScript interfaces in [frontend/src/lib/supabase.ts](frontend/src/lib/supabase.ts)

Row Level Security (RLS) is **enabled** - all queries require `authenticated` role via Supabase Auth.

### n8n Integration Pattern
All external AI features use n8n webhooks configured in [frontend/src/config/ai-assistant.ts](frontend/src/config/ai-assistant.ts):

- **Chat Assistant**: `webhookUrl` - Main conversational agent
- **YouTube Search**: `youtubeWebhookUrl` - Video content analysis
- **Custom Search**: `customSearchWebhookUrl` - Generic query handling

The chat widget is initialized **once globally** in [frontend/src/App.tsx](frontend/src/App.tsx) with session persistence to maintain conversation history across navigation.

## Project-Specific Patterns

### Dashboard Architecture (Hybrid Overview)
The [Dashboard.tsx](frontend/src/pages/Dashboard.tsx) uses a hybrid approach:
- **Overview Tab**: Combined stats from both platforms + side-by-side comparison + platform-specific charts
- **Platform Tabs**: Separate Twitter and Facebook sections with dedicated tables and visualizations
- **Three stat sets**: `stats` (Twitter), `fbStats` (Facebook), `combinedStats` (aggregated)

### Component Organization
- **Data Visualization**: [frontend/src/components/](frontend/src/components/) - All charts use Recharts with consistent color scheme
  - Twitter: `SentimentTimeline`, `SentimentPieChart`, `TopUsersChart`, `DailyActivityChart`
  - Facebook: `FacebookSentimentChart`, `FacebookActivityChart`, `TopPageOwnersChart`
  - Tables: `TweetsTable`, `FacebookPostsTable`, `TweetReplies`
- **Pages**: [frontend/src/pages/](frontend/src/pages/) - Dashboard (main) and Login
- **Auth**: [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx) wraps entire app

### Supabase Query Pattern
Always use this structure for authenticated queries:
```typescript
const { data, error } = await supabase
  .from('nrm_tweets_kb')  // or 'fb_posts'
  .select('*')
  .eq('district', 'Kampala')  // Example filter
  .order('created_at', { ascending: false })
```

**Engagement metrics differ by platform:**
- Twitter: `like_count`, `retweet_count`, `reply_count`, `quote_count`
- Facebook: `reactions_total`, `likes_count`, `comments_count`, `shares_count`

### Twitter Reply Workflow
See [TWEET-REPLIES-FEATURE.md](TWEET-REPLIES-FEATURE.md) and [TweetReplies.tsx](frontend/src/components/TweetReplies.tsx):
1. n8n workflow fact-checks tweets, writes `reply_text` to DB
2. Dashboard displays replies for manual editing
3. "Save and Post" button updates DB and posts to Twitter via [backend/api/twitter/post-reply.js](backend/api/twitter/post-reply.js)

Requires `TWITTER_ACCESS_TOKEN` in [backend/.env](backend/env.example).

## Environment Configuration

### Required Variables
```bash
# Frontend (.env at root or in frontend/)
REACT_APP_SUPABASE_URL=your_url
REACT_APP_SUPABASE_ANON_KEY=your_key

# Backend (backend/.env)
TWITTER_ACCESS_TOKEN=your_token
PORT=5000
HOST=0.0.0.0
```

See [backend/env.example](backend/env.example) for complete backend config.

## Build & Deployment

The backend server ([backend/server.js](backend/server.js)) serves the **frontend build folder** with:
- Brotli/gzip compression for text assets
- Aggressive caching for `/static/` (hashed assets)
- SPA fallback to `index.html` for client-side routing

Build workflow:
```bash
cd frontend && npm run build  # Creates frontend/build/
cd ../backend && node server.js  # Serves frontend/build on port 5000
```

## Common Gotchas

1. **Sentiment is categorical, not numeric** - Don't average or calculate means directly; use `sentimentToNumber()` helper
2. **Different sentiment column names** - Twitter uses `sentiment_score`, Facebook uses `sentiment` (both categorical)
3. **Chat widget persists globally** - Don't reinitialize on route changes (see [App.tsx](frontend/src/App.tsx) `__n8nChatInitialized` flag)
4. **RLS policies required** - Unauthenticated users cannot query data; both `nrm_tweets_kb` and `fb_posts` require authenticated role
5. **Backend serves frontend** - Production uses single Node.js server, not separate React dev server
6. **PM2 for process management** - Use [ecosystem.config.js](ecosystem.config.js) for dual frontend/backend processes
7. **Platform-specific engagement fields** - Twitter has retweets/quotes, Facebook has reactions/shares

## Key References

- [README.md](README.md) - Setup and features overview
- [AI-ASSISTANT-SETUP.md](AI-ASSISTANT-SETUP.md) - n8n chat integration details
- [TWITTER-INTEGRATION-SETUP.md](TWITTER-INTEGRATION-SETUP.md) - Twitter API setup
- [frontend/src/lib/supabase.ts](frontend/src/lib/supabase.ts) - Complete type definitions for both platforms
- [backend/facebook-posts-rls-setup.sql](backend/facebook-posts-rls-setup.sql) - Facebook RLS policies
