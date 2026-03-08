# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Uganda Political Sentiment Analysis Dashboard — a full-stack app tracking social media discourse (Twitter & Facebook) about NRM, President Museveni, Hon. Anita Among, and Hon. Thomas Tayebwa.

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS (Create React App), located in `frontend/`
- **Backend**: Minimal Node.js static file server (`backend/server.js`) that serves the frontend build and exposes API routes (e.g., Twitter reply posting)
- **Database**: Supabase (PostgreSQL) with RLS enabled — all queries require authenticated role
- **AI Integration**: n8n webhooks for chat assistant, fact-checking, YouTube search (configured in `frontend/src/config/ai-assistant.ts`)
- **Process Management**: PM2 via `ecosystem.config.js`

## Commands

```bash
# Frontend development
cd frontend && npm start          # Dev server on port 3000

# Production build
cd frontend && npm run build      # Creates frontend/build/

# Backend (serves built frontend on port 5000)
cd backend && node server.js

# Both via PM2
pm2 start ecosystem.config.js
pm2 logs

# Tests
cd frontend && npm test           # Jest via react-scripts
cd frontend && npm test -- --watchAll=false  # CI mode
cd frontend && npm test -- MyComponent.test  # Single test file
```

## Critical Data Model

**Sentiment is categorical, not numeric.** Both tables use VARCHAR values (`'Positive'`, `'Negative'`, `'Neutral'`), never numbers. Use `sentimentToNumber()` from `frontend/src/lib/supabase.ts` to convert for calculations.

- **Twitter table** (`nrm_tweets_kb`): sentiment column is `sentiment_score` (categorical despite the name)
- **Facebook table** (`fb_posts`): sentiment column is `sentiment`
- **Engagement fields differ**: Twitter has `like_count`/`retweet_count`/`reply_count`/`quote_count`; Facebook has `reactions_total`/`likes_count`/`comments_count`/`shares_count`

Full TypeScript interfaces: `frontend/src/lib/supabase.ts`

## Key Patterns

- **Dashboard** (`frontend/src/pages/Dashboard.tsx`) uses a hybrid tab approach: Overview (combined stats from both platforms), plus separate Twitter and Facebook tabs with platform-specific charts and tables
- **Three stat sets**: `stats` (Twitter), `fbStats` (Facebook), `combinedStats` (aggregated)
- **All charts use Recharts** with a consistent color scheme
- **Auth** wraps entire app via `frontend/src/contexts/AuthContext.tsx` using Supabase Auth
- **Chat widget** (`@n8n/chat`) is initialized once globally in `App.tsx` — do not reinitialize on route changes (uses `__n8nChatInitialized` flag)
- **Tweet reply workflow**: n8n fact-checks tweets → writes `reply_text` to DB → dashboard shows for manual editing → posts via `backend/api/twitter/post-reply.js`

## Database Changes

When modifying the schema, update both:
1. SQL migration files in `backend/` (e.g., `add-reply-columns.sql`)
2. TypeScript interfaces in `frontend/src/lib/supabase.ts`

## Environment Variables

```bash
# Frontend (frontend/.env)
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_ANON_KEY=...

# Backend (backend/.env)
TWITTER_ACCESS_TOKEN=...
PORT=5000
HOST=0.0.0.0
```
