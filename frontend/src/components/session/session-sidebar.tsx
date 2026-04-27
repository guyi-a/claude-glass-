import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Plus, Trash2, MessageSquare, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useSessionStore, type Session } from '../../stores/session-store'
import { cn } from '../../lib/utils'

type SessionGroup = { label: string; sessions: Session[] }

function groupByDate(sessions: Session[]): SessionGroup[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86400_000
  const sevenDaysAgo = startOfToday - 7 * 86400_000

  const groups: Record<string, Session[]> = {}
  const order: string[] = []

  const sorted = [...sessions].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  for (const s of sorted) {
    const t = new Date(s.updated_at).getTime()
    let label: string
    if (t >= startOfToday) {
      label = '今天'
    } else if (t >= startOfYesterday) {
      label = '昨天'
    } else if (t >= sevenDaysAgo) {
      const d = new Date(t)
      label = `${d.getMonth() + 1}月${d.getDate()}日`
    } else {
      label = '更早'
    }
    if (!groups[label]) {
      groups[label] = []
      order.push(label)
    }
    groups[label].push(s)
  }

  return order.map(label => ({ label, sessions: groups[label] }))
}

function SessionItem({ session, isActive, onSelect, onDelete }: {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const [hovering, setHovering] = useState(false)

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left",
        "transition-all duration-150",
        isActive
          ? "bg-[var(--bg-elevated)] shadow-[var(--shadow-xs)] border border-[var(--border)]"
          : "hover:bg-[var(--bg-secondary)]/60 border border-transparent"
      )}
    >
      <MessageSquare size={15} className={cn(
        "shrink-0",
        isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
      )} />
      <span className={cn(
        "flex-1 text-[13px] truncate",
        isActive ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"
      )}>
        {session.title}
      </span>
      {hovering && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="shrink-0 p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
        >
          <Trash2 size={12} />
        </button>
      )}
    </button>
  )
}

export function SessionSidebar({ activeSessionId }: { activeSessionId: string }) {
  const { sessions, fetchSessions, deleteSession, setActive } = useSessionStore()
  const [collapsed, setCollapsed] = useState(false)
  const [width, setWidth] = useState(280)
  const dragging = useRef(false)

  const groups = useMemo(() => groupByDate(sessions), [sessions])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const newWidth = Math.min(Math.max(ev.clientX, 200), 480)
      setWidth(newWidth)
    }
    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleNew = async () => {
    setActive(null)
    window.location.hash = '/'
  }

  if (collapsed) {
    return (
      <div className="shrink-0 w-12 border-r border-[var(--border)] bg-[var(--bg-secondary)]/40
        flex flex-col items-center py-3 gap-2">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <PanelLeft size={16} />
        </button>
        <button
          onClick={handleNew}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="shrink-0 relative border-r border-[var(--border)] bg-[var(--bg-secondary)]/40
      flex flex-col overflow-hidden" style={{ width }}>
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize z-30
          hover:bg-[var(--accent)]/30 active:bg-[var(--accent)]/40 transition-colors"
      />
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
        <span className="text-[15px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">会话</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNew}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
            title="新对话"
          >
            <Plus size={17} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sessions.length === 0 && (
          <p className="text-[13px] text-[var(--text-muted)] text-center py-8">暂无会话</p>
        )}
        {groups.map(({ label, sessions: groupSessions }) => (
          <div key={label} className="mb-2">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider px-3 py-1.5">
              {label}
            </p>
            {groupSessions.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => {
                  setActive(session.id)
                  window.location.hash = `/chat/${session.id}`
                }}
                onDelete={() => deleteSession(session.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
