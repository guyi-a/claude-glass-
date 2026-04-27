import { useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Shield, ShieldOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useChat } from '../../hooks/use-chat'
import { useSessionStore } from '../../stores/session-store'
import { WelcomeView } from './welcome-view'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'

type Props = {
  sessionId: string
  onSendNew?: (message: string, workingDirectory: string, model: string) => void
  onBack?: () => void
}

export function ChatView({ sessionId, onSendNew, onBack }: Props) {
  const {
    messages,
    sendMessage,
    isStreaming,
    stop,
    workingDirectory,
    setWorkingDirectory,
    model,
    setModel,
    approval,
    setApproval,
    pendingPermission,
    respondPermission,
  } = useChat(sessionId)
  const { renameSession } = useSessionStore()
  const titleSetRef = useRef(false)
  const hasMessages = messages.length > 0

  useEffect(() => {
    if (titleSetRef.current || !sessionId || messages.length === 0) return
    const first = messages.find(m => m.role === 'user')
    if (!first) return
    titleSetRef.current = true
    const now = new Date()
    const mo = now.getMonth() + 1
    const d = now.getDate()
    const h = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const preview = first.content.length > 16 ? first.content.slice(0, 16) + '…' : first.content
    renameSession(sessionId, `${preview} · ${mo}月${d}日 ${h}:${min}`)
  }, [messages, sessionId, renameSession])

  const handleSend = onSendNew && !sessionId
    ? (msg: string) => onSendNew(msg, workingDirectory, model)
    : sendMessage

  if (!hasMessages) {
    return (
      <WelcomeView
        onSend={handleSend}
        workingDirectory={workingDirectory}
        onSelectWorkspace={setWorkingDirectory}
        model={model}
        onSelectModel={setModel}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 px-4 py-3 flex items-center justify-between
        bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-1 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                hover:bg-[var(--bg-secondary)] transition-all duration-150"
              title="返回首页"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-6 h-6 rounded-[8px] bg-gradient-to-br from-[var(--accent)] to-[#a84e30]
            flex items-center justify-center shadow-[var(--shadow-xs)]">
            <span className="text-[10px] text-white font-[var(--font-serif)] leading-none">G</span>
          </div>
          <span className="text-[14px] font-medium text-[var(--text-primary)]">Claude Glass</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Approval mode toggle */}
          <button
            onClick={() => setApproval(v => !v)}
            title={approval ? '关闭审批模式' : '开启审批模式（拦截危险工具）'}
            className={cn(
              'p-1.5 rounded-lg transition-all duration-150',
              approval
                ? 'text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]',
            )}
          >
            {approval ? <Shield size={16} /> : <ShieldOff size={16} />}
          </button>

          {isStreaming && (
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-[12px] text-[var(--text-tertiary)]">生成中</span>
            </div>
          )}
        </div>
      </header>

      <MessageList
        messages={messages}
        pendingPermission={pendingPermission}
        onAllow={() => respondPermission('allow')}
        onDeny={() => respondPermission('deny')}
      />

      <ChatInput onSend={sendMessage} onStop={stop} isStreaming={isStreaming} variant="compact" />
    </div>
  )
}
