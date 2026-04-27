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

function DiffLines({ oldStr, newStr }: { oldStr: string; newStr: string }) {
  const oldLines = oldStr ? oldStr.split('\n') : []
  const newLines = newStr ? newStr.split('\n') : []
  return (
    <div className="rounded-lg overflow-hidden border border-[var(--border)] font-mono text-[11px] max-h-72 overflow-y-auto">
      {oldLines.map((line, i) => (
        <div key={`r${i}`} className="flex px-3 py-[1px] min-h-[18px] bg-[var(--error)]/8">
          <span className="shrink-0 w-4 text-[var(--error)]/60 select-none">-</span>
          <span className="text-[var(--error)] whitespace-pre-wrap break-all">{line || ' '}</span>
        </div>
      ))}
      {newLines.map((line, i) => (
        <div key={`a${i}`} className="flex px-3 py-[1px] min-h-[18px] bg-[var(--success)]/8">
          <span className="shrink-0 w-4 text-[var(--success)]/60 select-none">+</span>
          <span className="text-[var(--success)] whitespace-pre-wrap break-all">{line || ' '}</span>
        </div>
      ))}
    </div>
  )
}

function ToolInputView({ name, input }: { name: string; input: Record<string, unknown> }) {
  if (name === 'Edit') {
    return (
      <div className="space-y-1.5">
        {!!input.replace_all && (
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-medium">replace_all</span>
        )}
        <DiffLines oldStr={String(input.old_string ?? '')} newStr={String(input.new_string ?? '')} />
      </div>
    )
  }
  if (name === 'MultiEdit') {
    const edits = (input.edits as Array<{ file_path?: string; old_string?: string; new_string?: string }>) || []
    return (
      <div className="space-y-3">
        {edits.map((edit, i) => (
          <div key={i}>
            {edit.file_path && <p className="font-mono text-[10px] text-[var(--text-muted)] mb-1 truncate">{edit.file_path}</p>}
            <DiffLines oldStr={edit.old_string ?? ''} newStr={edit.new_string ?? ''} />
          </div>
        ))}
      </div>
    )
  }
  if (name === 'Write') {
    const lines = String(input.content ?? '').split('\n')
    return (
      <div className="rounded-lg overflow-hidden border border-[var(--border)] font-mono text-[11px] max-h-72 overflow-y-auto">
        {lines.map((line, i) => (
          <div key={i} className="flex px-3 py-[1px] min-h-[18px] hover:bg-[var(--bg-secondary)]/60">
            <span className="shrink-0 w-8 text-right text-[var(--text-muted)]/50 select-none mr-3">{i + 1}</span>
            <span className="text-[var(--text-secondary)] whitespace-pre-wrap break-all">{line || ' '}</span>
          </div>
        ))}
      </div>
    )
  }
  if (name === 'Bash') {
    const desc = input.description ? String(input.description) : null
    return (
      <div className="rounded-lg overflow-hidden border border-[var(--border)]">
        {desc && (
          <div className="px-3 py-1.5 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border)] text-[11px] text-[var(--text-secondary)] italic">{desc}</div>
        )}
        <pre className="px-3 py-2.5 font-mono text-[11px] text-[var(--text-primary)] whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto bg-[var(--bg-secondary)]/40">
          {String(input.command ?? '')}
        </pre>
      </div>
    )
  }
  const kvKeys: Record<string, string[]> = {
    Read: ['file_path', 'offset', 'limit'],
    Glob: ['pattern', 'path'],
    Grep: ['pattern', 'path', 'include'],
  }
  if (kvKeys[name]) {
    return (
      <div className="space-y-1">
        {kvKeys[name].filter(k => input[k] != null).map(k => (
          <div key={k} className="flex gap-2 font-mono text-[11px]">
            <span className="text-[var(--text-secondary)] shrink-0">{k}:</span>
            <span className="text-[var(--text-primary)] break-all">{String(input[k])}</span>
          </div>
        ))}
      </div>
    )
  }
  if (name === 'TodoWrite') {
    const todos = (input.todos as Array<{ content?: string; status?: string; priority?: string }>) || []
    return (
      <div className="space-y-1.5">
        {todos.map((todo, i) => {
          const status = todo.status ?? 'pending'
          return (
            <div key={i} className={cn(
              'flex items-start gap-2.5 px-3 py-2 rounded-lg border text-[12px]',
              status === 'completed' ? 'bg-[var(--success)]/8 border-[var(--success)]/20'
                : status === 'in_progress' ? 'bg-[var(--accent)]/8 border-[var(--accent)]/20'
                : 'bg-[var(--bg-tertiary)]/40 border-[var(--border)]'
            )}>
              <span className="mt-[1px] shrink-0 text-[13px]">
                {status === 'completed' ? '✓' : status === 'in_progress' ? '◉' : '○'}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn('leading-snug break-words', status === 'completed' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]')}>
                  {todo.content}
                </p>
                {todo.priority && <span className="text-[10px] text-[var(--text-muted)]">{todo.priority}</span>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <pre className="text-[11px] font-mono text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
      {JSON.stringify(input, null, 2)}
    </pre>
  )
}

function ToolOutputView({ output, toolName }: { output: string; toolName: string }) {
  if (!output) return null
  if (toolName === 'Glob' || toolName === 'Grep') {
    const lines = output.split('\n').filter(Boolean)
    return (
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {lines.map((line, i) => (
          <div key={i} className="font-mono text-[11px] text-[var(--text-secondary)] px-2 py-0.5 rounded hover:bg-[var(--bg-secondary)] truncate">{line}</div>
        ))}
      </div>
    )
  }
  return (
    <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-[var(--text-secondary)] leading-relaxed max-h-56 overflow-y-auto">
      {output}
    </pre>
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
          <div className="px-4 py-3 border-t border-[var(--accent)]/20 flex items-center justify-end gap-2 pr-12">
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
        <div className="mt-2 ml-6 space-y-2">
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border)]">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Input</div>
            <ToolInputView name={tool.name} input={tool.input} />
          </div>
          {tool.output && (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)]/40 border border-[var(--border)]">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Output</div>
              <ToolOutputView output={tool.output} toolName={tool.name} />
            </div>
          )}
        </div>
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
