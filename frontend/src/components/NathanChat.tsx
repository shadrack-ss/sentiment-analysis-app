import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Minus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_URL =
  'https://n8n.nrmcampaign.com/webhook/51da722f-7785-479a-a7a5-04175eb3b754/chat';

const SESSION_KEY = 'nathan-chat-session-id';
const MESSAGES_KEY = 'nathan-chat-messages';

const QUICK_ACTIONS = [
  "What's the sentiment trend?",
  'Top trending topics',
  'Compare Twitter vs Facebook',
  'Latest negative posts',
];

const WORD_REVEAL_INTERVAL_MS = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
  } catch {
    // localStorage unavailable – fall through
  }
  const id = `nrm-dashboard-${Date.now()}`;
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    // best‑effort
  }
  return id;
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {
    // corrupted – start fresh
  }
  return [];
}

function saveMessages(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // best‑effort
  }
}

function extractResponseText(data: unknown): string {
  if (typeof data === 'string') return data;

  if (Array.isArray(data)) {
    if (data.length === 0) return 'No response received.';
    const first = data[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      const obj = first as Record<string, unknown>;
      for (const key of ['output', 'text', 'response', 'message']) {
        if (typeof obj[key] === 'string') return obj[key] as string;
      }
    }
    return JSON.stringify(first);
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['output', 'text', 'response', 'message']) {
      if (typeof obj[key] === 'string') return obj[key] as string;
    }
    return JSON.stringify(data);
  }

  return 'Unexpected response format.';
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// CSS keyframes (injected once)
// ---------------------------------------------------------------------------

const STYLE_ID = 'nathan-chat-keyframes';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes nathanFadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes nathanPulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.12); }
    }
    @keyframes nathanBounce {
      0%, 80%, 100% { transform: translateY(0); }
      40%           { transform: translateY(-6px); }
    }
    @keyframes nathanScaleIn {
      from { opacity: 0; transform: scale(0.92) translateY(12px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes nathanScaleOut {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to   { opacity: 0; transform: scale(0.92) translateY(12px); }
    }
    .nathan-fade-in-up {
      animation: nathanFadeInUp 0.3s ease-out both;
    }
    .nathan-pulse {
      animation: nathanPulse 2s ease-in-out infinite;
    }
    .nathan-bounce-1 { animation: nathanBounce 1.2s ease-in-out infinite; }
    .nathan-bounce-2 { animation: nathanBounce 1.2s ease-in-out 0.15s infinite; }
    .nathan-bounce-3 { animation: nathanBounce 1.2s ease-in-out 0.3s infinite; }
    .nathan-window-open {
      animation: nathanScaleIn 0.25s ease-out both;
    }
    .nathan-window-close {
      animation: nathanScaleOut 0.2s ease-in both;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Sub‑components
// ---------------------------------------------------------------------------

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1 px-4 py-3">
    <div className="w-2 h-2 rounded-full bg-gray-400 nathan-bounce-1" />
    <div className="w-2 h-2 rounded-full bg-gray-400 nathan-bounce-2" />
    <div className="w-2 h-2 rounded-full bg-gray-400 nathan-bounce-3" />
  </div>
);

interface MessageBubbleProps {
  message: ChatMessage;
  revealedText?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, revealedText }) => {
  const isUser = message.role === 'user';
  const displayText = revealedText ?? message.text;
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`nathan-fade-in-up flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-3`}
    >
      <div
        className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-yellow-400 text-gray-900 rounded-2xl rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{displayText}</span>
        ) : (
          <div className="nathan-markdown prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-3 prose-a:text-blue-600 prose-a:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-400 mt-1 px-1">{time}</span>
    </div>
  );
};

const WelcomeScreen: React.FC<{ onChipClick: (text: string) => void }> = ({
  onChipClick,
}) => (
  <div className="flex flex-col items-center justify-center h-full px-6 text-center">
    <div className="text-4xl mb-3">&#128075;</div>
    <h2 className="text-xl font-bold text-gray-900 mb-1">Hi there! I'm Nathan</h2>
    <p className="text-sm text-gray-500 mb-5 leading-relaxed max-w-[300px]">
      I help you analyze political discourse around the NRM and key figures.
    </p>
    <div className="text-left text-sm text-gray-600 mb-6 space-y-1.5 max-w-[300px]">
      <p className="font-medium text-gray-700 mb-2">I can help you:</p>
      <p>&bull; Access and analyze tweets &amp; Facebook posts</p>
      <p>&bull; Track sentiment trends</p>
      <p>&bull; Identify emerging narratives</p>
      <p>&bull; Generate insights from social media data</p>
    </div>
    <div className="flex flex-wrap justify-center gap-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action}
          onClick={() => onChipClick(action)}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer"
        >
          {action}
        </button>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const NathanChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Progressive reveal state
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [revealedWordCount, setRevealedWordCount] = useState(0);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sessionIdRef = useRef(getOrCreateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Inject keyframe styles once
  useEffect(() => {
    ensureStyles();
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, revealedWordCount]);

  // Cleanup reveal interval on unmount
  useEffect(() => {
    return () => {
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Progressive word reveal
  // -----------------------------------------------------------------------

  const startReveal = useCallback((msgId: string, fullText: string) => {
    const words = fullText.split(/(\s+)/); // preserve whitespace tokens
    setRevealingId(msgId);
    setRevealedWordCount(0);

    let count = 0;
    revealIntervalRef.current = setInterval(() => {
      count += 1;
      if (count >= words.length) {
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
        setRevealingId(null);
        setRevealedWordCount(0);
      } else {
        setRevealedWordCount(count);
      }
    }, WORD_REVEAL_INTERVAL_MS);
  }, []);

  // -----------------------------------------------------------------------
  // Send message
  // -----------------------------------------------------------------------

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setIsLoading(true);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      try {
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            sessionId: sessionIdRef.current,
            chatInput: trimmed,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: unknown = await res.json();
        const responseText = extractResponseText(data);

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          text: responseText,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // If chat is closed, flag unread
        if (!isOpen) setHasUnread(true);

        // Start word-by-word reveal
        startReveal(assistantMsg.id, responseText);
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          text: "Sorry, I couldn't reach the server. Please try again in a moment.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isOpen, startReveal],
  );

  // -----------------------------------------------------------------------
  // UI handlers
  // -----------------------------------------------------------------------

  const toggleOpen = () => {
    if (isOpen) {
      // Animate close
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 200);
    } else {
      setIsOpen(true);
      setHasUnread(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-grow (up to ~4 lines)
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  };

  // Compute revealed text for the currently-revealing message
  const getRevealedText = (msg: ChatMessage): string | undefined => {
    if (msg.id !== revealingId) return undefined;
    const words = msg.text.split(/(\s+)/);
    return words.slice(0, revealedWordCount).join('');
  };

  const showWelcome = messages.length === 0;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* Chat window */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden ${
            isClosing ? 'nathan-window-close' : 'nathan-window-open'
          }`}
          style={{ transformOrigin: 'bottom right', height: 'min(550px, calc(100vh - 120px))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-500 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-gray-900 font-bold text-base">
                  N
                </div>
                <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-yellow-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">Nathan</p>
                <p className="text-[11px] text-gray-700/80">Online</p>
              </div>
            </div>
            <button
              onClick={toggleOpen}
              className="p-1.5 rounded-full hover:bg-yellow-300/50 transition-colors"
              aria-label="Minimize chat"
            >
              <Minus className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* Body */}
          <div
            ref={chatBodyRef}
            className="flex-1 overflow-y-auto px-4 py-4 bg-white min-h-0"
          >
            {showWelcome ? (
              <WelcomeScreen
                onChipClick={(text) => {
                  sendMessage(text);
                }}
              />
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    revealedText={getRevealedText(msg)}
                  />
                ))}
                {(isLoading || revealingId) && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
            <div className="flex items-end space-x-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Nathan anything..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 disabled:opacity-50 transition-colors"
                style={{ maxHeight: 96 }}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-400 text-gray-900 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-yellow-400 text-gray-900 shadow-lg hover:bg-yellow-500 transition-colors ${
          hasUnread ? 'nathan-pulse' : ''
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </>
  );
};

export default NathanChat;
