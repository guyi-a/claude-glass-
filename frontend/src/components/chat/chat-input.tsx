import { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '../../lib/utils'

type Props = {
  onSend: (message: string) => void
  onStop: () => void
  isStreaming: boolean
  variant: 'hero' | 'compact'
}

export function ChatInput({ onSend, onStop, isStreaming, variant }: Props) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [variant])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [])

  const canSend = value.trim().length > 0

  if (variant === 'hero') {
    return (
      <div className="relative">
        <div className="glass relative rounded-2xl overflow-hidden shadow-[var(--shadow-lg)]
          hover:shadow-[0_16px_48px_rgba(42,37,32,0.1),0_4px_16px_rgba(42,37,32,0.06)]
          transition-all duration-300">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder=""
            rows={1}
            style={{ caretColor: isFocused ? 'var(--accent)' : 'transparent', paddingLeft: '2.5rem' }}
            className="relative z-10 block w-full min-h-[104px] resize-none bg-transparent outline-none
              text-[15px] leading-relaxed pr-16 pt-5 pb-14
              text-[var(--text-primary)]"
          />
          {!value && !isFocused && (
            <div className="absolute pointer-events-none z-10"
              style={{ left: '2.5rem', top: '1.25rem' }}>
              <span className="text-[15px] leading-relaxed text-[var(--text-muted)]">描述你想做的事情...</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end px-5 pb-4 z-20">
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                canSend
                  ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[var(--shadow-xs)] active:scale-90"
                  : "bg-[var(--bg-tertiary)]/60 text-[var(--text-muted)] cursor-default"
              )}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shrink-0 relative z-10 px-6 pb-6 pt-3">
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-end gap-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)]
          shadow-[var(--shadow-md)] focus-within:shadow-[var(--shadow-lg)]
          focus-within:border-[var(--accent)]/30 transition-all duration-200 px-5 py-3.5">
          <div className="relative flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder=""
              rows={1}
              style={{ caretColor: isFocused ? 'var(--accent)' : 'transparent' }}
              className="w-full resize-none bg-transparent outline-none
                text-[15px] leading-relaxed py-1
                text-[var(--text-primary)] max-h-[160px]"
            />
            {!value && !isFocused && (
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <span className="text-[15px] text-[var(--text-muted)]">继续输入...</span>
              </div>
            )}
          </div>
          {isStreaming ? (
            <button
              onClick={onStop}
              className="shrink-0 w-8 h-8 rounded-xl bg-[var(--text-primary)] flex items-center justify-center
                hover:opacity-80 active:scale-90 transition-all"
            >
              <Square size={11} className="text-white" fill="white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                canSend
                  ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[var(--shadow-xs)] active:scale-90"
                  : "bg-[var(--bg-tertiary)]/60 text-[var(--text-muted)] cursor-default"
              )}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
