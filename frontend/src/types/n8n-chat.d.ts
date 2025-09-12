declare module '@n8n/chat' {
  export interface N8nChatOptions {
    webhookUrl: string
    [key: string]: any
  }

  export function createChat(options: N8nChatOptions): void
}

declare module '@n8n/chat/style.css'


