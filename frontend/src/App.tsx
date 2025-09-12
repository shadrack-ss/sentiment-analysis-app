import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import '@n8n/chat/style.css'
import { createChat } from '@n8n/chat'
import { AI_ASSISTANT_CONFIG } from './config/ai-assistant'

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

const AppShell: React.FC = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Create chat ONCE and never tear it down, to preserve DOM and history
  React.useEffect(() => {
    if ((window as any).__n8nChatInitialized) return
    try {
      const existing = localStorage.getItem('n8n-chat-session-id') || ''
      let sessionId = existing
      if (!sessionId) {
        sessionId = 'nrm-dashboard-global'
        localStorage.setItem('n8n-chat-session-id', sessionId)
      }
      createChat({
        webhookUrl: AI_ASSISTANT_CONFIG.webhookUrl,
        loadPreviousSession: true,
        sessionId,
        initialMessages: ["I\'m ready to analyze Ugandan political discourse about the NRM and President Museveni. What kind of insights are you looking for today? I can access and analyze  a database of tweets, identify sentiment, and track trends."]
      })
      ;(window as any).__n8nChatInitialized = true

      // Try to override the embedded widget header (title/subtitle)
      const applyHeaderOverride = () => {
        const root = document.querySelector('#n8n-chat') as HTMLElement | null
        if (!root) return false
        const header = root.querySelector('.chat-header') as HTMLElement | null
        if (!header) return false
        const titleEl = header.querySelector('h1, h2, .chat-heading, [class*="title"]') as HTMLElement | null
        if (titleEl) {
          titleEl.textContent = AI_ASSISTANT_CONFIG.name
        }
        const subtitleEl = header.querySelector('p, [class*="subtitle"], [class*="sub-title"]') as HTMLElement | null
        if (subtitleEl) {
          subtitleEl.textContent = AI_ASSISTANT_CONFIG.description
        }
        return true
      }

      // Attempt immediately and then observe DOM mutations for late render
      let applied = applyHeaderOverride()
      if (!applied) {
        const observer = new MutationObserver(() => {
          if (applyHeaderOverride()) {
            observer.disconnect()
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
        ;(window as any).__n8nChatHeaderObserver = observer
      }

      // Watcher: if widget disappears (e.g., iframe reload), recreate with same sessionId
      const ensureChat = () => {
        const exists = document.querySelector('[data-n8n-chat]')
        if (!exists) {
          try {
            const sid = localStorage.getItem('n8n-chat-session-id') || sessionId
            createChat({
              webhookUrl: AI_ASSISTANT_CONFIG.webhookUrl,
              loadPreviousSession: true,
              sessionId: sid,
              initialMessages: ["I\'m ready to analyze Ugandan political discourse about the NRM and President Museveni. What kind of insights are you looking for today? I can access and analyze  a database of tweets, identify sentiment, and track trends."]
            })
          } catch {}
        }
      }
      const interval = window.setInterval(ensureChat, 2000)
      ;(window as any).__n8nChatEnsureInterval = interval
    } catch (e) {
      console.warn('Failed to initialize chat:', e)
    }
    return () => {
      if ((window as any).__n8nChatEnsureInterval) {
        clearInterval((window as any).__n8nChatEnsureInterval)
        ;(window as any).__n8nChatEnsureInterval = null
      }
    }
  }, [])

  // Toggle visibility instead of removing, so history persists across route/auth transitions
  React.useEffect(() => {
    const onLoginPage = location.pathname === '/login'
    const containers: HTMLElement[] = Array.from(document.querySelectorAll('[data-n8n-chat], .n8n-chat-container, #n8n-chat')) as HTMLElement[]
    if (containers.length === 0) return
    containers.forEach((el) => {
      if (onLoginPage) {
        el.style.visibility = 'hidden'
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
      } else {
        el.style.visibility = ''
        el.style.opacity = ''
        el.style.pointerEvents = ''
      }
    })
  }, [location.pathname, loading, user])

  // Per-user session: switch sessionId when a different user logs in
  React.useEffect(() => {
    if (loading) return
    const desiredId = user ? `nrm-dashboard-${user.id}` : 'nrm-dashboard-guest'
    const currentId = localStorage.getItem('n8n-chat-session-id') || ''
    if (currentId === desiredId) return

    try {
      localStorage.setItem('n8n-chat-session-id', desiredId)
      // Remove existing widget to re-initialize with the new session
      const nodes = document.querySelectorAll('[data-n8n-chat], .n8n-chat-container, #n8n-chat, iframe[src*="n8n"]')
      nodes.forEach(n => n.remove())
      createChat({
        webhookUrl: AI_ASSISTANT_CONFIG.webhookUrl,
        loadPreviousSession: true,
        sessionId: desiredId,
        initialMessages: ["I\'m ready to analyze Ugandan political discourse about the NRM and President Museveni. What kind of insights are you looking for today? I can access and analyze  a database of tweets, identify sentiment, and track trends."]
      })

      // Re-apply header override for the new instance
      const applyHeaderOverride = () => {
        const root = document.querySelector('#n8n-chat') as HTMLElement | null
        if (!root) return false
        const header = root.querySelector('.chat-header') as HTMLElement | null
        if (!header) return false
        const titleEl = header.querySelector('h1, h2, .chat-heading, [class*="title"]') as HTMLElement | null
        if (titleEl) {
          titleEl.textContent = AI_ASSISTANT_CONFIG.name
        }
        const subtitleEl = header.querySelector('p, [class*="subtitle"], [class*="sub-title"]') as HTMLElement | null
        if (subtitleEl) {
          subtitleEl.textContent = AI_ASSISTANT_CONFIG.description
        }
        return true
      }
      let applied = applyHeaderOverride()
      if (!applied) {
        const observer = new MutationObserver(() => {
          if (applyHeaderOverride()) {
            observer.disconnect()
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
      }
    } catch (e) {
      console.warn('Failed to switch chat session:', e)
    }
  }, [user, loading])

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  )
}

export default App
