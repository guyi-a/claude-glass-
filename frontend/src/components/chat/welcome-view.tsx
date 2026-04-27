import { ChatInput } from './chat-input'
import { FolderOpen, Sparkles, Zap, ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/utils'

const WORKSPACES = [
  { name: 'krow-agent',    path: '/Users/guyi/krow-agent' },
  { name: 'krow-app',      path: '/Users/guyi/krow-app' },
  { name: 'Ling-Agent',    path: '/Users/guyi/Ling-Agent' },
  { name: 'claude-glass-', path: '/Users/guyi/claude-glass-' },
]

const MODELS = [
  { id: 'pa/claude-opus-4-6',   label: 'Opus',   desc: '最强推理', icon: Sparkles },
  { id: 'pa/claude-sonnet-4-6', label: 'Sonnet', desc: '快速高效', icon: Zap },
]

type Props = {
  onSend: (message: string) => void
  workingDirectory: string
  onSelectWorkspace: (path: string) => void
  model: string
  onSelectModel: (model: string) => void
  onBack?: () => void
}

export function WelcomeView({ onSend, workingDirectory, onSelectWorkspace, model, onSelectModel, onBack }: Props) {
  return (
    <div className="h-full flex flex-col">
      {onBack && (
        <div className="shrink-0 px-4 pt-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px]
              text-[var(--text-muted)] hover:text-[var(--text-secondary)]
              hover:bg-[var(--bg-secondary)] transition-all duration-150"
          >
            <ArrowLeft size={14} />
            所有对话
          </button>
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-10">
      <div className="w-full max-w-3xl flex flex-col items-center gap-8">

        {/* Badge + Title */}
        <div className="text-center animate-enter">
          <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full
            bg-[var(--accent-soft)] border border-[var(--accent)]/20">
            <div className="w-4 h-4 rounded-md bg-gradient-to-br from-[var(--accent)] to-[#a84e30]
              flex items-center justify-center">
              <span className="text-[8px] text-white font-[var(--font-serif)] leading-none">G</span>
            </div>
            <span className="text-[12px] font-semibold text-[var(--accent)] tracking-wide">Claude Glass</span>
          </div>

          <h1 className="text-[3.5rem] leading-[1.08] font-[var(--font-serif)] text-[var(--text-primary)] tracking-[-0.025em]">
            What would you like<br />
            <span className="italic text-[var(--accent)]">to build</span> today?
          </h1>
        </div>

        {/* Input */}
        <div className="w-full animate-enter" style={{ animationDelay: '60ms' }}>
          <ChatInput onSend={onSend} onStop={() => {}} isStreaming={false} variant="hero" />
        </div>

        {/* Model selector */}
        <div className="w-full animate-enter" style={{ animationDelay: '100ms' }}>
          <p className="text-[13px] font-medium text-[var(--text-secondary)] tracking-widest mb-4 text-center">模型</p>
          <div className="flex justify-center gap-5">
            {MODELS.map(({ id, label, desc, icon: Icon }) => {
              const isSelected = model === id
              return (
                <button
                  key={id}
                  onClick={() => onSelectModel(id)}
                  className={cn(
                    "group flex items-center justify-center gap-3 px-6 py-4 rounded-2xl min-w-[140px]",
                    "border transition-all duration-200 cursor-pointer",
                    "hover:shadow-[var(--shadow-md)] active:scale-[0.97]",
                    isSelected
                      ? "bg-[var(--accent)] border-[var(--accent)] shadow-[var(--shadow-md)]"
                      : "bg-[var(--bg-elevated)] border-[var(--border-strong)] hover:border-[var(--accent)]/40"
                  )}
                >
                  <Icon size={18} className={cn(
                    "transition-colors shrink-0",
                    isSelected ? "text-white" : "text-[var(--text-tertiary)] group-hover:text-[var(--accent)]"
                  )} />
                  <div className="text-left">
                    <span className={cn(
                      "text-[15px] font-semibold block leading-tight whitespace-nowrap",
                      isSelected ? "text-white" : "text-[var(--text-primary)]"
                    )}>
                      {label}
                    </span>
                    <span className={cn(
                      "text-[11px] leading-tight whitespace-nowrap",
                      isSelected ? "text-white/70" : "text-[var(--text-muted)]"
                    )}>
                      {desc}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Workspace row */}
        <div className="w-full animate-enter" style={{ animationDelay: '140ms' }}>
          <p className="text-[13px] font-medium text-[var(--text-secondary)] tracking-widest mb-4 text-center">工作区</p>
          <div className="grid grid-cols-4 gap-5">
            {WORKSPACES.map(({ name, path }, i) => {
              const isSelected = workingDirectory === path
              return (
                <button
                  key={path}
                  onClick={() => onSelectWorkspace(path)}
                  style={{ animationDelay: `${160 + i * 50}ms` }}
                  className={cn(
                    "animate-enter group flex flex-col items-center gap-3 px-5 py-6 rounded-2xl text-center",
                    "border transition-all duration-200 cursor-pointer",
                    "hover:-translate-y-1 hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.97]",
                    isSelected
                      ? "bg-[var(--accent)] border-[var(--accent)] shadow-[var(--shadow-md)]"
                      : "bg-[var(--bg-elevated)] border-[var(--border-strong)] hover:border-[var(--accent)]/40"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200",
                    isSelected
                      ? "bg-white/20"
                      : "bg-[var(--bg-secondary)] group-hover:bg-[var(--accent-soft)]"
                  )}>
                    <FolderOpen size={24} className={cn(
                      "transition-colors",
                      isSelected ? "text-white" : "text-[var(--text-secondary)] group-hover:text-[var(--accent)]"
                    )} />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={cn(
                      "text-[14px] font-semibold leading-tight tracking-tight",
                      isSelected ? "text-white" : "text-[var(--text-primary)]"
                    )}>
                      {name}
                    </span>
                    <span className={cn(
                      "text-[11px] leading-tight font-mono truncate max-w-full px-1",
                      isSelected ? "text-white/60" : "text-[var(--text-muted)]"
                    )}>
                      {path.replace('/Users/guyi/', '~/')}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      </div>
      </div>
    </div>
  )
}
