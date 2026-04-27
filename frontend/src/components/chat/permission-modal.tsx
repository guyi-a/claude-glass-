import { Terminal, FileEdit, FilePlus, Move, Shield } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { PendingPermission } from '../../hooks/use-chat'

type Props = {
  pending: PendingPermission
  onAllow: () => void
  onDeny: () => void
}

function ToolIcon({ name }: { name: string }) {
  const cls = "shrink-0 text-[var(--accent)]"
  if (name === 'Bash') return <Terminal size={18} className={cls} />
  if (name === 'Write') return <FilePlus size={18} className={cls} />
  if (name === 'Edit' || name === 'MultiEdit') return <FileEdit size={18} className={cls} />
  if (name === 'Move') return <Move size={18} className={cls} />
  return <Shield size={18} className={cls} />
}

function summarize(name: string, input: Record<string, unknown>): string {
  if ((name === 'Write' || name === 'Edit' || name === 'MultiEdit') && input.file_path) {
    return String(input.file_path)
  }
  if (name === 'Move' && input.source) {
    return `${input.source} → ${input.destination ?? '?'}`
  }
  if (name === 'Bash' && input.command) {
    const cmd = String(input.command)
    return cmd.length > 80 ? cmd.slice(0, 80) + '…' : cmd
  }
  const first = Object.values(input)[0]
  if (typeof first === 'string') return first.length > 80 ? first.slice(0, 80) + '…' : first
  return ''
}

export function PermissionModal({ pending, onAllow, onDeny }: Props) {
  const { tool_name, tool_input } = pending
  const summary = summarize(tool_name, tool_input)

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      {/* Card */}
      <div
        className={cn(
          "w-full max-w-[480px] mx-4 rounded-2xl border border-[var(--border)]",
          "bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.4)]",
          "animate-enter",
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 mb-1">
            <ToolIcon name={tool_name} />
            <span className="text-[16px] font-semibold text-[var(--text-primary)]">
              {tool_name}
            </span>
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full
              bg-[var(--accent)]/10 text-[var(--accent)]">
              需要批准
            </span>
          </div>
          {summary && (
            <p className="mt-2 text-[13px] font-mono text-[var(--text-secondary)] break-all leading-relaxed pl-0.5">
              {summary}
            </p>
          )}
        </div>

        {/* Details toggle */}
        <div className="px-6 py-3 border-b border-[var(--border)]">
          <details className="group">
            <summary className="list-none cursor-pointer select-none flex items-center gap-1.5
              text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]
              transition-colors duration-150">
              <span className="inline-block transition-transform duration-150 group-open:rotate-90">▶</span>
              查看完整参数
            </summary>
            <pre className="mt-3 p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border)]
              text-[11px] font-mono overflow-x-auto text-[var(--text-secondary)] leading-relaxed max-h-56">
              {JSON.stringify(tool_input, null, 2)}
            </pre>
          </details>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onDeny}
            className={cn(
              "px-5 py-2 rounded-xl text-[13px] font-medium",
              "bg-[var(--error)]/10 text-[var(--error)]",
              "border border-[var(--error)]/20",
              "hover:bg-[var(--error)]/20 transition-colors duration-150 active:scale-95",
            )}
          >
            拒绝
          </button>
          <button
            onClick={onAllow}
            className={cn(
              "px-5 py-2 rounded-xl text-[13px] font-medium text-white",
              "bg-[var(--accent)] hover:bg-[var(--accent-hover)]",
              "transition-colors duration-150 active:scale-95",
            )}
          >
            允许
          </button>
        </div>
      </div>
    </div>
  )
}
