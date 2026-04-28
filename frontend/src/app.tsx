import { useState, useEffect } from 'react'
import { ChatPage } from './pages/chat-page'
import { SessionSidebar } from './components/session/session-sidebar'

function parsePath(pathname: string): { page: 'welcome' | 'chat'; sessionId?: string } {
  const chatMatch = pathname.match(/^\/chat\/(.+)$/)
  if (chatMatch) return { page: 'chat', sessionId: chatMatch[1] }
  return { page: 'welcome' }
}

export function App() {
  const [route, setRoute] = useState(() => parsePath(window.location.pathname))

  useEffect(() => {
    const handler = () => setRoute(parsePath(window.location.pathname))
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const sessionId = route.page === 'chat' ? (route.sessionId ?? '') : ''

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <SessionSidebar activeSessionId={sessionId} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <ChatPage sessionId={sessionId} />
      </div>
    </div>
  )
}
