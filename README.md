# Uganda Political Sentiment Analysis Dashboard

A production-ready web application for analyzing political sentiment in Uganda using React, Tailwind CSS, and Supabase.

## Features

- 📈 **Sentiment Timeline Chart** - Track sentiment changes over time
- 🥧 **Sentiment Distribution** - Visualize positive vs negative sentiment
- 📋 **Searchable Tweets Table** - Filter and search through tweet data
- 🗺️ **Geographic Distribution** - View sentiment by Uganda districts
- 🔐 **Authentication** - Secure login with Supabase Auth
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Modern UI** - Clean, professional interface with Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Custom Design System
- **Charts**: Recharts for data visualization
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Prerequisites

- Node.js 16+ and npm
- Supabase account and project
- PostgreSQL database with your tweet data

## Database Schema

Your database should have a table named `nrm_tweets_kb` with the following structure:

```sql
CREATE TABLE nrm_tweets_kb (
  id SERIAL PRIMARY KEY,
  tweet_id VARCHAR,
  text TEXT,
  username VARCHAR,
  created_at TIMESTAMP,
  retweet_count INTEGER,
  reply_count INTEGER,
  like_count INTEGER,
  quote_count INTEGER,
  url TEXT,
  geo_location TEXT,
  coordinates TEXT,
  district TEXT,
  user_profile_location TEXT,
  has_precise_geo BOOLEAN,
  sentiment_score DECIMAL(3,2) -- Add this column if not present
);
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd uganda-sentiment-dashboard
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Get Supabase Credentials

1. Go to [Supabase](https://supabase.com) and create a new project
2. Navigate to Settings > API
3. Copy your Project URL and anon/public key
4. Paste them in your `.env` file

### 4. Set Up Authentication

1. In Supabase Dashboard, go to Authentication > Settings
2. Enable Email authentication
3. Configure your email templates if needed

### 5. Import Your Data

1. Go to Supabase Dashboard > Table Editor
2. Create the `nrm_tweets_kb` table with the schema above
3. Import your tweet data (CSV, JSON, or direct SQL)

### 6. Add Sentiment Score Column (if needed)

If you don't have sentiment scores yet, add the column:

```sql
ALTER TABLE nrm_tweets_kb 
ADD COLUMN sentiment_score DECIMAL(3,2);

-- Update with sample data (replace with your actual sentiment analysis)
UPDATE nrm_tweets_kb 
SET sentiment_score = (RANDOM() - 0.5) * 2 
WHERE sentiment_score IS NULL;
```

### 7. Run the Application

```bash
npm start
```

The app will open at `http://localhost:3000`

## Usage

### Authentication
- Sign up with your email and password
- Sign in to access the dashboard
- All data is protected behind authentication

### Dashboard Features
- **Overview Tab**: View sentiment timeline and distribution charts
- **Tweets Tab**: Search, filter, and analyze individual tweets
- **Map Tab**: Explore geographic sentiment distribution

### Data Analysis
- Sentiment scores range from -1 (negative) to +1 (positive)
- Filter by district, search by text or username
- View engagement metrics (likes, retweets, replies)
- Export data or generate reports as needed

## Customization

### Adding New Charts
1. Create a new component in `src/components/`
2. Import Recharts components as needed
3. Add to the Dashboard tabs

### Styling
- Modify `tailwind.config.js` for theme changes
- Update `src/index.css` for custom CSS
- Use the design system classes: `card`, `btn-primary`, `input-field`

### Database Queries
- All Supabase queries are in the component files
- Optimize with proper indexing on `created_at`, `district`, `sentiment_score`
- Use pagination for large datasets

## Performance Optimization

- Implement virtual scrolling for large tweet tables
- Add Redis caching for frequently accessed data
- Use database materialized views for complex aggregations
- Implement lazy loading for chart components

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel/Netlify

1. Connect your GitHub repository
2. Set environment variables in the deployment platform
3. Deploy automatically on push to main branch

### Environment Variables for Production

Ensure these are set in your deployment platform:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check Supabase URL and keys
   - Verify email authentication is enabled
   - Check browser console for detailed errors

2. **No Data Displayed**
   - Verify database table exists and has data
   - Check Supabase Row Level Security (RLS) policies
   - Ensure `sentiment_score` column exists

3. **Build Errors**
   - Clear `node_modules` and reinstall
   - Check TypeScript compilation errors
   - Verify all dependencies are installed

### Debug Mode

Enable detailed logging by adding to your `.env`:

```bash
REACT_APP_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Supabase documentation
- Open an issue in the repository

## Roadmap

- [ ] Real-time sentiment updates
- [ ] Advanced filtering and analytics
- [ ] Data export functionality
- [ ] User role management
- [ ] API rate limiting
- [ ] Mobile app version
