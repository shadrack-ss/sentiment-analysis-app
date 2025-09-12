// AI Assistant Configuration
export const AI_ASSISTANT_CONFIG = {
  // Your n8n webhook URL
  webhookUrl: 'https://n8n.nrmcampaign.com/webhook/51da722f-7785-479a-a7a5-04175eb3b754/chat',
  
  // Assistant settings
  name: 'Hi there!  👋',
  description: 'I\'m Nathan,  here to help you 24/7.',
  
  // UI settings
  position: {
    bottom: '6rem', // 6rem from bottom
    right: '1.5rem' // 1.5rem from right
  },
  
  // Chat window dimensions
  dimensions: {
    width: '24rem', // 24rem = 384px
    height: '31.25rem' // 31.25rem = 500px
  },
  
  // Welcome message
  welcomeMessage: "Hello! I'm your NRM Campaign Agent for sentiment analysis. Ask me anything about twhat people are saying about the NRM Campaign, trends, or insights!",
  
  // Error messages
  errorMessages: {
    networkError: 'Sorry, I encountered a network error. Please check your connection and try again.',
    processingError: 'Sorry, I encountered an error while processing your request. Please try again.',
    invalidResponse: 'I received your message but couldn\'t process it properly. Please try again.'
  }
}
