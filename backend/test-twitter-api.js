const crypto = require('crypto');
require('dotenv').config();

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
 * Test posting a tweet with OAuth 1.0a
 */
async function testTwitterOAuth1() {
  console.log('🧪 Testing Twitter API with OAuth 1.0a');
  console.log('====================================');
  
  // Check credentials
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  
  console.log('Environment Variables:');
  console.log('- TWITTER_API_KEY:', apiKey ? '✓ Set' : '✗ Missing');
  console.log('- TWITTER_API_SECRET:', apiSecret ? '✓ Set' : '✗ Missing');
  console.log('- TWITTER_ACCESS_TOKEN:', accessToken ? '✓ Set' : '✗ Missing');
  console.log('- TWITTER_ACCESS_TOKEN_SECRET:', accessTokenSecret ? '✓ Set' : '✗ Missing');
  console.log('');
  
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    console.error('❌ Missing OAuth 1.0a credentials');
    process.exit(1);
  }
  
  // Test tweet data
  const tweetData = {
    text: 'Test tweet from OAuth 1.0a - ' + new Date().toISOString()
  };
  
  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';
  
  // Generate OAuth parameters
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(32).toString('base64').replace(/\W/g, ''),
    oauth_version: '1.0'
  };
  
  console.log('OAuth Parameters:');
  console.log('- oauth_consumer_key:', oauthParams.oauth_consumer_key);
  console.log('- oauth_token:', oauthParams.oauth_token);
  console.log('- oauth_timestamp:', oauthParams.oauth_timestamp);
  console.log('- oauth_nonce:', oauthParams.oauth_nonce.substring(0, 20) + '...');
  console.log('');
  
  // Generate signature
  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    apiSecret,
    accessTokenSecret
  );
  
  oauthParams.oauth_signature = signature;
  
  // Build Authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
  
  console.log('Authorization Header (truncated):');
  console.log(authHeader.substring(0, 100) + '...');
  console.log('');
  
  console.log('📡 Posting test tweet...');
  console.log('Tweet text:', tweetData.text);
  console.log('');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData)
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('');
    
    const responseData = await response.json();
    console.log('Response Body:', JSON.stringify(responseData, null, 2));
    console.log('');
    
    if (response.ok) {
      console.log('✅ Tweet posted successfully!');
      console.log('Tweet ID:', responseData.data?.id);
      console.log('Tweet text:', responseData.data?.text);
    } else {
      console.log('❌ Failed to post tweet');
      console.log('Error:', responseData);
    }
  } catch (error) {
    console.error('❌ Error posting tweet:', error.message);
    console.error(error);
  }
}

// Run test
testTwitterOAuth1();