import { memo, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { highlight } from '../../lib/shiki'
import { cn } from '../../lib/utils'
import type { Message, PendingPermission } from '../../hooks/use-chat'
import { ChevronRight, ChevronDown, Check, Copy, CheckCheck, Loader2 } from 'lucide-react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="absolute top-3 right-3 p-1.5 rounded-lg
        glass text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]
        opacity-0 group-hover/code:opacity-100
        transition-all duration-200"
    >
      {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
    </button>
  )
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [html, setHtml] = useState<string | null>(null)
  const code = String(children).replace(/\n$/, '')
  const lang = className?.replace('language-', '') || ''

  useEffect(() => {
    if (!lang) return
    let cancelled = false
    highlight(code, lang).then(r => { if (!cancelled) setHtml(r) })
    return () => { cancelled = true }
  }, [code, lang])

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-[var(--border)]">
      {lang && (
        <div className="px-4 py-1.5 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border)]">
          <span className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">{lang}</span>
        </div>
      )}
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="shiki"><code>{code}</code></pre>
      )}
      <CopyButton text={code} />
    </div>
  )
}

function ToolCallRow({
  tool,
  pending,
  onAllow,
  onDeny,
}: {
  tool: import('../../hooks/use-chat').ToolCall
  pending?: boolean
  onAllow?: () => void
  onDeny?: () => void
}) {
  const [open, setOpen] = useState(true)
  const Icon = open ? ChevronDown : ChevronRight

  return (
    <div className="my-2">
      <div
        className={cn(
          'rounded-xl border overflow-hidden',
          pending
            ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5'
            : 'border-[var(--border)] bg-[var(--bg-secondary)]/60'
        )}
      >
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 text-[13px] w-full text-left',
            'hover:bg-[var(--bg-secondary)] transition-colors duration-150'
          )}
        >
          <Icon size={12} className="text-[var(--text-muted)] shrink-0" />
          {pending
            ? <Loader2 size={12} className="text-[var(--accent)] shrink-0 animate-spin" />
            : <Check size={12} className="text-[var(--success)] shrink-0" />
          }
          <span className="font-medium text-[var(--text-secondary)]">{tool.name}</span>
          <span className="text-[var(--text-muted)] truncate font-mono text-[11px]">
            {summarizeToolInput(tool.name, tool.input)}
          </span>
          {pending && (
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full
              bg-[var(--accent)]/10 text-[var(--accent)] shrink-0">
              需要批准
            </span>
          )}
        </button>

        {pending && onAllow && onDeny && (
          <div className="px-4 py-3 border-t border-[var(--accent)]/20 flex items-center justify-end gap-2">
            <button
              onClick={onDeny}
              className="px-4 py-1.5 rounded-lg text-[13px] font-medium
                bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20
                hover:bg-[var(--error)]/20 transition-colors duration-150 active:scale-95"
            >
              拒绝
            </button>
            <button
              onClick={onAllow}
              className="px-4 py-1.5 rounded-lg text-[13px] font-medium text-white
                bg-[var(--accent)] hover:bg-[var(--accent-hover)]
                transition-colors duration-150 active:scale-95"
            >
              允许
            </button>
          </div>
        )}
      </div>

      {open && (
        <pre className="mt-2 ml-6 p-4 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border)]
          text-[11px] font-mono overflow-x-auto text-[var(--text-secondary)] leading-relaxed">
          {JSON.stringify(tool.input, null, 2)}
        </pre>
      )}
    </div>
  )
}

function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  if (name === 'Read' && input.file_path) return String(input.file_path)
  if (name === 'Edit' && input.file_path) return String(input.file_path)
  if (name === 'Write' && input.file_path) return String(input.file_path)
  if (name === 'Bash' && input.command) return String(input.command).slice(0, 60)
  if (name === 'Glob' && input.pattern) return String(input.pattern)
  if (name === 'Grep' && input.pattern) return String(input.pattern)
  return ''
}

export const MessageBubble = memo(function MessageBubble({
  message,
  index,
  isLast,
  pendingPermission,
  onAllow,
  onDeny,
}: {
  message: Message
  index: number
  isLast?: boolean
  pendingPermission?: PendingPermission | null
  onAllow?: () => void
  onDeny?: () => void
}) {
  const isUser = message.role === 'user'

  return (
    <div
      className="animate-enter"
      style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
    >
      {isUser ? (
        <div className="flex justify-end mb-6">
          <div className="max-w-[75%] bg-[var(--bg-elevated)] border border-[var(--border)]
            px-5 py-3 rounded-2xl rounded-br-md shadow-[var(--shadow-xs)]">
            <p className="text-[15px] leading-[1.7] text-[var(--text-primary)] whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ) : (
        <div className="mb-8 pl-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[var(--accent)] to-[#a84e30]
              flex items-center justify-center">
              <span className="text-[8px] text-white font-[var(--font-serif)] leading-none">G</span>
            </div>
            <span className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Claude</span>
          </div>

          {message.blocks.map((block, i) => {
            const isPending = isLast
              && pendingPermission != null
              && block.type === 'tool_use'
              && i === message.blocks.length - 1
              && block.tool.name === pendingPermission.tool_name

            return block.type === 'tool_use' ? (
              <ToolCallRow
                key={block.tool.id || i}
                tool={block.tool}
                pending={isPending}
                onAllow={isPending ? onAllow : undefined}
                onDeny={isPending ? onDeny : undefined}
              />
            ) : (
              <div key={i} className="chat-prose pl-0.5">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const isInline = !className
                      if (isInline) return <code {...props}>{children}</code>
                      return <CodeBlock className={className}>{children}</CodeBlock>
                    },
                  }}
                >
                  {block.text}
                </ReactMarkdown>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
