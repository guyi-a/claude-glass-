import { useEffect } from 'react'
import { Plus, MessageSquare, Trash2, FolderOpen } from 'lucide-react'
import { useSessionStore, type Session } from '../stores/session-store'
import { cn } from '../lib/utils'
import { useConfig, shortenPath } from '../hooks/use-config'

function SessionCard({ session, homeDir, onOpen, onDelete }: {
  session: Session
  homeDir: string
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative flex flex-col gap-3 p-5 rounded-2xl cursor-pointer",
        "bg-[var(--bg-elevated)] border border-[var(--border)]",
        "hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)]",
        "hover:-translate-y-0.5 transition-all duration-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
          <MessageSquare size={15} className="text-[var(--text-muted)]" />
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
            hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--error)]
            transition-all duration-150 shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[var(--text-primary)] truncate leading-snug">
          {session.title}
        </p>
        {session.working_directory && session.working_directory !== '~' && (
          <div className="flex items-center gap-1 mt-1.5">
            <FolderOpen size={11} className="text-[var(--text-muted)] shrink-0" />
            <span className="text-[11px] text-[var(--text-muted)] truncate font-mono">
              {shortenPath(session.working_directory, homeDir)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function SessionsPage() {
  const { sessions, fetchSessions, createSession, deleteSession } = useSessionStore()
  const { homeDir } = useConfig()

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleNew = async () => {
    const empty = sessions.find(s => !s.has_messages)
    if (empty) {
      window.location.hash = `/chat/${empty.id}`
      return
    }
    const id = await createSession()
    window.location.hash = `/chat/${id}`
  }

  const handleOpen = (id: string) => {
    window.location.hash = `/chat/${id}`
  }

  const withMessages = sessions.filter(s => s.has_messages)
  const withoutMessages = sessions.filter(s => !s.has_messages)

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)] overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto px-8 py-10 flex flex-col gap-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[var(--accent)] to-[#a84e30]
              flex items-center justify-center shadow-[var(--shadow-sm)]">
              <span className="text-[12px] text-white font-[var(--font-serif)] leading-none">G</span>
            </div>
            <span className="text-[17px] font-semibold text-[var(--text-primary)]">Claude Glass</span>
          </div>
          <button
            onClick={handleNew}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium",
              "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
              "shadow-[var(--shadow-sm)] active:scale-95 transition-all duration-150"
            )}
          >
            <Plus size={16} />
            新对话
          </button>
        </div>

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center">
              <MessageSquare size={24} className="text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-[16px] font-medium text-[var(--text-secondary)]">还没有对话</p>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">点击"新对话"开始</p>
            </div>
          </div>
        )}

        {/* Session grid */}
        {withMessages.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">
              历史对话
            </p>
            <div className="grid grid-cols-3 gap-3">
              {withMessages.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  homeDir={homeDir}
                  onOpen={() => handleOpen(s.id)}
                  onDelete={() => deleteSession(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {withoutMessages.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">
              空对话
            </p>
            <div className="grid grid-cols-3 gap-3">
              {withoutMessages.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  homeDir={homeDir}
                  onOpen={() => handleOpen(s.id)}
                  onDelete={() => deleteSession(s.id)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
