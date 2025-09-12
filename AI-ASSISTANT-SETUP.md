# AI Assistant Integration Guide

## 🚀 **Your n8n AI Assistant is Now Integrated!**

Your Uganda Sentiment Dashboard now includes a powerful AI assistant powered by n8n that can help users understand and analyze the political sentiment data.

## ✨ **Features**

- **Floating Chat Button**: Always accessible from any page
- **Real-time Responses**: Powered by your n8n webhook
- **Context-Aware**: Sends context about the Uganda Sentiment Dashboard
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Graceful fallbacks for network issues

## 🔧 **How It Works**

1. **User clicks** the floating chat button (bottom-right corner)
2. **Chat window opens** with a welcome message
3. **User types** a question about Uganda sentiment data
4. **Message sent** to your n8n webhook: `https://n8n.nrmcampaign.com/webhook/51da722f-7785-479a-a7a5-04175eb3b754/chat`
5. **n8n processes** the request and returns a response
6. **Response displayed** in the chat interface

## 📍 **Webhook Integration**

Your webhook URL is configured in `src/config/ai-assistant.ts`:

```typescript
webhookUrl: 'https://n8n.nrmcampaign.com/webhook/51da722f-7785-479a-a7a5-04175eb3b754/chat'
```

## 📝 **Webhook Payload Format**

The assistant sends this data to your n8n webhook:

```json
{
  "message": "What's the current sentiment trend?",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "context": "Uganda Sentiment Dashboard"
}
```

## 🔄 **Expected Response Format**

Your n8n workflow should return one of these formats:

**Option 1:**
```json
{
  "response": "Based on the current data, the sentiment trend shows..."
}
```

**Option 2:**
```json
{
  "message": "Based on the current data, the sentiment trend shows..."
}
```

## 🎯 **Suggested AI Capabilities**

Your n8n AI assistant can help users with:

- **Data Interpretation**: "What does this sentiment score mean?"
- **Trend Analysis**: "How has sentiment changed over time?"
- **District Insights**: "Which districts have the most positive sentiment?"
- **Engagement Analysis**: "What's the correlation between sentiment and engagement?"
- **Data Queries**: "Show me tweets with negative sentiment from Kampala"
- **Statistical Questions**: "What's the average sentiment this month?"

## 🛠 **Customization**

### **Change Webhook URL**
Edit `src/config/ai-assistant.ts`:

```typescript
webhookUrl: 'your-new-webhook-url-here'
```

### **Modify Assistant Name**
```typescript
name: 'Your Custom AI Name',
description: 'Your custom description'
```

### **Adjust Position**
```typescript
position: {
  bottom: '8rem', // Move up/down
  right: '2rem'   // Move left/right
}
```

### **Change Dimensions**
```typescript
dimensions: {
  width: '28rem',  // Make wider/narrower
  height: '35rem'  // Make taller/shorter
}
```

## 🧪 **Testing**

1. **Start your React app**: `npm start`
2. **Navigate to any page** (Login or Dashboard)
3. **Click the chat button** (bottom-right corner)
4. **Type a test message**: "Hello, how are you?"
5. **Check your n8n logs** for incoming webhook requests

## 🔍 **Troubleshooting**

### **Chat Button Not Visible**
- Check browser console for errors
- Ensure `AIAssistant` component is imported and rendered
- Verify CSS classes are not being overridden

### **Webhook Not Responding**
- Check n8n workflow execution logs
- Verify webhook URL is correct
- Test webhook endpoint directly with Postman/curl

### **Messages Not Sending**
- Check browser network tab for failed requests
- Verify CORS settings in n8n
- Check browser console for JavaScript errors

## 📱 **Mobile Responsiveness**

The AI Assistant is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All screen sizes

## 🎨 **Styling**

The assistant uses your existing Tailwind CSS theme:
- Primary colors from your dashboard
- Consistent shadows and borders
- Responsive design patterns
- Accessible color contrasts

## 🚀 **Next Steps**

1. **Test the integration** with your n8n workflow
2. **Customize responses** based on your data
3. **Add more AI capabilities** through n8n
4. **Monitor usage** and user feedback
5. **Iterate and improve** the AI responses

Your AI Assistant is now ready to help users understand Uganda's political sentiment data! 🎉
