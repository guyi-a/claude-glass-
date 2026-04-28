import { useStickToBottom } from 'use-stick-to-bottom'
import { MessageBubble } from './message-bubble'
import type { Message, PendingPermission } from '../../hooks/use-chat'

type Props = {
  messages: Message[]
  pendingPermission?: PendingPermission | null
}

export function MessageList({ messages, pendingPermission }: Props) {
  const { scrollRef, contentRef } = useStickToBottom()

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div ref={contentRef} className="w-full max-w-[900px] mx-auto px-16 pt-8 pb-32">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            index={i}
            isLast={i === messages.length - 1}
            pendingPermission={pendingPermission}
          />
        ))}
      </div>
    </div>
  )
}
