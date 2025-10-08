# Twitter Integration Setup Guide

This guide explains how to set up the "Save and Post" functionality for the Tweet Replies feature.

## Overview

The "Save and Post" feature allows you to:
1. Edit AI-generated replies in the dashboard
2. Save the edited reply to the database
3. Post the reply directly to Twitter as a reply to the original tweet

## Prerequisites

1. Twitter Developer Account
2. Twitter API v2 access with write permissions
3. Node.js backend server running

## Setup Steps

### 1. Get Twitter API Access Token

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app or use an existing one
3. Go to "Keys and Tokens" section
4. Generate a Bearer Token (Access Token) with write permissions
5. Copy the token for use in environment variables

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Copy the example file
cp backend/env.example backend/.env
```

Edit `backend/.env` and add your Twitter access token:

```env
# Twitter API Configuration
TWITTER_ACCESS_TOKEN=your_actual_twitter_access_token_here

# Server Configuration
PORT=5000
HOST=0.0.0.0
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Start the Backend Server

```bash
cd backend
node server.js
```

The server will start on `http://localhost:5000` (or your configured PORT).

### 5. Update Frontend API Calls

The frontend is already configured to call the API endpoint at `/api/twitter/post-reply`. Make sure your frontend is pointing to the correct backend URL.

## API Endpoint

### POST `/api/twitter/post-reply`

**Request Body:**
```json
{
  "tweetId": "1234567890123456789",
  "replyText": "Your reply text here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reply posted successfully",
  "data": {
    "id": "1234567890123456790",
    "text": "Your reply text here"
  }
}
```

## How It Works

1. **User edits reply**: User clicks "Edit Reply" and modifies the text
2. **Save to database**: The edited text is saved to the `nrm_tweets_kb` table
3. **Post to Twitter**: The reply is posted to Twitter using the Twitter API v2
4. **Update status**: The database is updated with posting status and timestamp

## Database Updates

The feature updates these fields in the `nrm_tweets_kb` table:

- `reply_text`: The edited reply text
- `checked_at`: Timestamp when the reply was last modified
- `correction_posted`: Boolean indicating if the reply was posted to Twitter
- `reply_posted_at`: Timestamp when the reply was posted to Twitter

## Error Handling

The system handles various error scenarios:

- **Invalid tweet ID**: Returns 400 error
- **Missing reply text**: Returns 400 error
- **Twitter API errors**: Returns 500 error with details
- **Database errors**: Returns 500 error with details
- **Network errors**: Returns 500 error with details

## Security Considerations

1. **Access Token**: Store your Twitter access token securely in environment variables
2. **CORS**: The API includes CORS headers for cross-origin requests
3. **Rate Limiting**: Twitter API has rate limits - monitor your usage
4. **Error Logging**: All errors are logged to the console

## Troubleshooting

### Common Issues

1. **"Twitter access token not configured"**
   - Check that `TWITTER_ACCESS_TOKEN` is set in your `.env` file
   - Restart the server after adding the environment variable

2. **"Twitter API error: 401"**
   - Your access token may be invalid or expired
   - Generate a new token from the Twitter Developer Portal

3. **"Twitter API error: 403"**
   - Your app may not have write permissions
   - Check your app settings in the Twitter Developer Portal

4. **"Failed to post reply to Twitter"**
   - Check your internet connection
   - Verify the tweet ID is valid
   - Check Twitter API status

### Debug Steps

1. Check server logs for error messages
2. Verify environment variables are loaded correctly
3. Test the API endpoint directly with curl or Postman
4. Check Twitter API documentation for any changes

## Testing

### Test the API Endpoint

```bash
curl -X POST http://localhost:5000/api/twitter/post-reply \
  -H "Content-Type: application/json" \
  -d '{
    "tweetId": "your_tweet_id_here",
    "replyText": "Test reply"
  }'
```

### Test in the Frontend

1. Navigate to the "Tweet Replies" tab
2. Click "Edit Reply" on any tweet
3. Modify the reply text
4. Click "Save & Post"
5. Check that the reply appears on Twitter

## Rate Limits

Twitter API v2 has rate limits:
- **Tweet Creation**: 300 requests per 15-minute window per user
- **Tweet Lookup**: 300 requests per 15-minute window per user

Monitor your usage to avoid hitting these limits.

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Twitter API documentation
3. Check server logs for detailed error messages
4. Verify your Twitter app permissions

## Future Enhancements

Potential improvements:

- Bulk posting functionality
- Scheduled posting
- Reply templates
- Analytics on posted replies
- Integration with other social media platforms
