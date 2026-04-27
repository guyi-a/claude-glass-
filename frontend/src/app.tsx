import { useState, useEffect } from 'react'
import { ChatPage } from './pages/chat-page'
import { SessionSidebar } from './components/session/session-sidebar'

function parseHash(hash: string): { page: 'welcome' | 'chat'; sessionId?: string } {
  const path = hash.replace(/^#\/?/, '') || ''
  const chatMatch = path.match(/^chat\/(.+)$/)
  if (chatMatch) return { page: 'chat', sessionId: chatMatch[1] }
  return { page: 'welcome' }
}

export function App() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
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
