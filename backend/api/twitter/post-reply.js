const crypto = require('crypto');

/**
 * Generate OAuth 1.0a signature
 */
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret = '') {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  return signature;
}

/**
 * Post reply using OAuth 2.0 (Bearer Token)
 */
async function postReplyOAuth2(tweetId, replyText, accessToken) {
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: replyText,
      reply: {
        in_reply_to_tweet_id: tweetId
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Twitter API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}

/**
 * Post reply using OAuth 1.0a
 */
async function postReplyOAuth1(tweetId, replyText, credentials) {
  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';
  
  const oauthParams = {
    oauth_consumer_key: credentials.apiKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(32).toString('base64').replace(/\W/g, ''),
    oauth_version: '1.0'
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    credentials.apiSecret,
    credentials.accessTokenSecret
  );

  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: replyText,
      reply: {
        in_reply_to_tweet_id: tweetId
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Twitter API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}

/**
 * Parse JSON body from request
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Main handler for POST /api/twitter/post-reply
 */
async function handlePostReply(req, res) {
  console.log('====================================');
  console.log('API endpoint hit: /api/twitter/post-reply');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Timestamp:', new Date().toISOString());
  console.log('====================================');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ 
      success: false, 
      message: 'Method not allowed. Use POST.' 
    }));
    return;
  }
  
  try {
    const body = await parseJsonBody(req);
    console.log('Parsed body:', {
      tweetId: body.tweetId,
      replyTextLength: body.replyText?.length
    });
    
    const { tweetId, replyText } = body;

    // Validate input
    if (!tweetId || !replyText) {
      console.error('Validation failed: Missing tweetId or replyText');
      res.statusCode = 400;
      res.end(JSON.stringify({ 
        success: false, 
        message: 'Tweet ID and reply text are required' 
      }));
      return;
    }

    // Check if in test mode
    if (process.env.TWITTER_TEST_MODE === 'true') {
      console.log('⚠️  TEST MODE: Skipping actual Twitter posting');
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Reply saved successfully (test mode - not posted to Twitter)',
        data: {
          test_mode: true,
          tweet_id: tweetId,
          reply_text: replyText
        }
      }));
      return;
    }

     // Determine authentication method
     const hasOAuth1 = process.env.TWITTER_API_KEY && 
                       process.env.TWITTER_API_SECRET && 
                       process.env.TWITTER_ACCESS_TOKEN && 
                       process.env.TWITTER_ACCESS_TOKEN_SECRET;

     const hasOAuth2 = process.env.TWITTER_ACCESS_TOKEN;
     
     console.log('Environment check:');
     console.log('- TWITTER_ACCESS_TOKEN exists:', !!process.env.TWITTER_ACCESS_TOKEN);
     console.log('- TWITTER_API_KEY exists:', !!process.env.TWITTER_API_KEY);
     console.log('- TWITTER_API_SECRET exists:', !!process.env.TWITTER_API_SECRET);
     console.log('- TWITTER_ACCESS_TOKEN_SECRET exists:', !!process.env.TWITTER_ACCESS_TOKEN_SECRET);
     console.log('- OAuth 1.0a available:', hasOAuth1);
     console.log('- OAuth 2.0 available:', hasOAuth2);

    if (!hasOAuth1 && !hasOAuth2) {
      console.error('No Twitter credentials configured');
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        success: false, 
        message: 'Twitter credentials not configured. Please set up OAuth 1.0a or OAuth 2.0 credentials.' 
      }));
      return;
    }

    console.log('Authentication method:', hasOAuth1 ? 'OAuth 1.0a' : 'OAuth 2.0');

    let result;

    if (hasOAuth1) {
      console.log('Using OAuth 1.0a authentication');
      const credentials = {
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
      };
      result = await postReplyOAuth1(tweetId, replyText, credentials);
     } else {
       console.log('Using OAuth 2.0 authentication');
       // URL decode the token in case it's encoded
       const accessToken = decodeURIComponent(process.env.TWITTER_ACCESS_TOKEN);
       console.log('Using access token:', accessToken.substring(0, 20) + '...');
       result = await postReplyOAuth2(tweetId, replyText, accessToken);
     }

    console.log('Twitter API response:', result);

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      message: 'Reply posted successfully',
      data: result
    }));

  } catch (error) {
    console.error('====================================');
    console.error('Error posting reply to Twitter:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('====================================');
    
    let userMessage = error.message;
    
    if (error.message.includes('403')) {
      userMessage = 'Authentication failed. Your Twitter token may not have write permissions.';
    } else if (error.message.includes('401')) {
      userMessage = 'Authentication failed. Your Twitter token may be invalid or expired.';
    } else if (error.message.includes('429')) {
      userMessage = 'Rate limit exceeded. Please try again later.';
    }
    
    res.statusCode = 500;
    res.end(JSON.stringify({
      success: false,
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }));
  }
}

module.exports = handlePostReply;