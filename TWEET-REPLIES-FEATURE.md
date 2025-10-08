# Tweet Replies Management Feature

This document describes the new Tweet Replies Management feature added to the Uganda Sentiment Analysis Dashboard.

## Overview

The Tweet Replies Management feature allows you to view and manage AI-generated fact-check replies to tweets. This feature integrates with your n8n workflow that automatically fact-checks tweets and generates replies.

## Features

### 1. View Tweets with Replies
- Display all tweets that have AI-generated fact-check replies
- Show original tweet content, metadata, and engagement metrics
- Display the AI-generated reply text
- Show fact-check status and timestamps

### 2. Edit Reply Text
- Inline editing of AI-generated replies
- Real-time updates to the database
- Validation to ensure reply text is not empty
- Success/error feedback for operations

### 3. Visual Indicators
- Sentiment badges for each tweet
- Status indicators (Posted, Checked)
- Timestamps for when replies were created/updated
- Loading states and error handling

## Database Schema

The feature uses the following additional columns in the `nrm_tweets_kb` table:

```sql
-- Reply-related fields
fact_checked BOOLEAN DEFAULT FALSE
correction_posted BOOLEAN DEFAULT FALSE
reply_text TEXT
reply_posted_at TIMESTAMP
checked_at TIMESTAMP
```

## Setup Instructions

### 1. Database Setup

Run the SQL script to add the required columns:

```bash
# In your Supabase SQL Editor or PostgreSQL database
psql -f backend/add-reply-columns.sql
```

### 2. RLS Policies

The script automatically creates the necessary Row Level Security policies:

- `Allow authenticated users to read tweets` - For viewing data
- `Allow authenticated users to update tweets` - For editing replies

### 3. Permissions

The script grants the necessary permissions:
- `SELECT` on `nrm_tweets_kb` for authenticated users
- `UPDATE` on `nrm_tweets_kb` for authenticated users

## Usage

### Accessing the Feature

1. Log into the dashboard
2. Navigate to the "Tweet Replies" tab in the sidebar
3. View all tweets with AI-generated replies

### Editing a Reply

1. Click the "Edit Reply" button on any tweet
2. Modify the reply text in the textarea
3. Click "Save" to update the database
4. Click "Cancel" to discard changes

### Features Available

- **Refresh**: Manually refresh the list of tweets
- **Inline Editing**: Edit replies directly in the interface
- **Real-time Updates**: Changes are immediately reflected in the UI
- **Error Handling**: Clear error messages for failed operations
- **Success Feedback**: Confirmation when updates are successful

## Integration with n8n Workflow

This feature is designed to work with your existing n8n workflow that:

1. Fetches tweets from the database
2. Uses AI to fact-check the content
3. Generates appropriate replies
4. Updates the database with reply text and status

The dashboard displays the results of this automated process and allows manual refinement of the AI-generated replies.

## Technical Details

### Components

- `TweetReplies.tsx` - Main component for displaying and managing replies
- Updated `Dashboard.tsx` - Added new tab and routing
- Updated `supabase.ts` - Extended Tweet interface with reply fields

### API Calls

- `SELECT` query to fetch tweets with replies
- `UPDATE` query to modify reply text
- Real-time error handling and user feedback

### Styling

- Consistent with existing dashboard design
- Responsive layout for mobile and desktop
- Clear visual hierarchy and status indicators
- Loading states and error messages

## Troubleshooting

### Common Issues

1. **No tweets showing**: Ensure your n8n workflow has processed tweets and added reply data
2. **Cannot edit replies**: Check RLS policies and user permissions
3. **Database errors**: Verify the additional columns exist in your database

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify database connection and permissions
3. Ensure all required columns exist in the database
4. Check Supabase logs for API errors

## Future Enhancements

Potential improvements for future versions:

- Bulk edit functionality
- Reply templates
- Approval workflow for replies
- Analytics on reply performance
- Integration with Twitter API for posting replies
- Advanced filtering and search options

## Support

For issues or questions about this feature:

1. Check the troubleshooting section above
2. Review the database setup requirements
3. Verify your n8n workflow is working correctly
4. Check the browser console for error messages
