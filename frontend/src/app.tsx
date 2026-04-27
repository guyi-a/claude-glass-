import { useState, useEffect } from 'react'
import { SessionsPage } from './pages/sessions-page'
import { ChatPage } from './pages/chat-page'

function parseHash(hash: string): { page: 'sessions' | 'chat'; sessionId?: string } {
  const path = hash.replace(/^#\/?/, '') || ''
  const chatMatch = path.match(/^chat\/(.+)$/)
  if (chatMatch) return { page: 'chat', sessionId: chatMatch[1] }
  return { page: 'sessions' }
}

export function App() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route.page === 'chat') {
    return <ChatPage sessionId={route.sessionId ?? ''} />
  }

  return <SessionsPage />
}
