import { ChatView } from '../components/chat/chat-view'
import { useSessionStore } from '../stores/session-store'
import { navigate } from '../lib/navigate'

type Props = {
  sessionId: string
}

export function ChatPage({ sessionId }: Props) {
  const { createSession, setActive } = useSessionStore()

  const handleBack = () => {
    navigate('/')
  }

  const handleSendNew = async (message: string, workingDirectory: string, model: string) => {
    const id = await createSession(workingDirectory)
    setActive(id)
    navigate(`/chat/${id}`)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('send-message', {
        detail: { sessionId: id, message, workingDirectory, model },
      }))
    }, 150)
  }

  return (
    <div className="h-full">
      <ChatView
        key={sessionId}
        sessionId={sessionId}
        onBack={handleBack}
        onSendNew={!sessionId ? handleSendNew : undefined}
      />
    </div>
  )
}
