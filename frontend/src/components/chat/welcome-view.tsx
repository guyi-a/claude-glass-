import { useState, useEffect } from 'react'
import { ChatInput } from './chat-input'
import { FolderOpen, Sparkles, Zap, Plus, ChevronRight, ChevronLeft, Home, Monitor, Download, FileText, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useConfig, shortenPath, refreshConfig } from '../../hooks/use-config'

const MODEL_ICONS = { sparkles: Sparkles, zap: Zap } as const

type Props = {
  onSend: (message: string) => void
  workingDirectory: string
  onSelectWorkspace: (path: string) => void
  model: string
  onSelectModel: (model: string) => void
}

type DirEntry = { name: string; path: string }
type DirListing = { path: string; parent: string | null; entries: DirEntry[] }

function AddWorkspaceModal({ homeDir, onClose }: { homeDir: string; onClose: () => void }) {
  const [listing, setListing] = useState<DirListing | null>(null)
  const [selected, setSelected] = useState<DirEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDir = async (path: string) => {
    setSelected(null)
    setError(null)
    const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`)
    const data = await res.json()
    setListing(data)
  }

  useEffect(() => { loadDir(homeDir) }, [homeDir])

  const handleAdd = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/config/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selected.name, path: selected.path }),
      })
      if (res.status === 409) { setError('该工作区已存在'); return }
      refreshConfig()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const displayPath = listing
    ? listing.path.startsWith(homeDir)
      ? '~' + listing.path.slice(homeDir.length) || '~'
      : listing.path
    : '~'

  const bookmarks = [
    { label: '主目录', path: homeDir, Icon: Home },
    { label: '桌面', path: `${homeDir}/Desktop`, Icon: Monitor },
    { label: '下载', path: `${homeDir}/Downloads`, Icon: Download },
    { label: '文稿', path: `${homeDir}/Documents`, Icon: FileText },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

      <div className="relative z-10 w-[560px] flex flex-col rounded-3xl overflow-hidden
        bg-[var(--bg-elevated)] border border-[var(--border)]
        shadow-[0_20px_60px_-10px_rgba(0,0,0,0.18)]">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <button
            onClick={() => listing?.parent && loadDir(listing.parent)}
            disabled={!listing?.parent}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="flex-1 text-[12px] font-mono text-[var(--text-secondary)] truncate">
            {displayPath}
          </span>
        </div>

        {/* Body — left sidebar + right listing */}
        <div className="flex min-h-0" style={{ height: 320 }}>
          {/* Sidebar */}
          <div className="w-[140px] shrink-0 border-r border-[var(--border)] py-2 flex flex-col gap-0.5 px-2">
            {bookmarks.map(({ label, path, Icon }) => (
              <button
                key={path}
                onClick={() => loadDir(path)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors",
                  listing?.path === path
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon size={14} className="shrink-0" />
                <span className="text-[12px] font-medium truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Directory list */}
          <div className="flex-1 overflow-y-auto py-1.5">
            {listing?.entries.length === 0 && (
              <p className="text-[13px] text-[var(--text-muted)] text-center py-8">没有子目录</p>
            )}
            {listing?.entries.map(entry => {
              const isSelected = selected?.path === entry.path
              return (
                <div
                  key={entry.path}
                  onClick={() => setSelected(isSelected ? null : entry)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                    isSelected ? "bg-[var(--accent)]/10" : "hover:bg-[var(--bg-secondary)]"
                  )}
                >
                  <FolderOpen size={15} className={cn(
                    "shrink-0",
                    isSelected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  )} />
                  <span className={cn(
                    "flex-1 text-[13px] truncate",
                    isSelected ? "text-[var(--accent)] font-medium" : "text-[var(--text-primary)]"
                  )}>
                    {entry.name}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); loadDir(entry.path) }}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]
                      text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-[var(--border)]">
          {error && (
            <p className="text-[12px] text-[var(--error)] text-center">{error}</p>
          )}
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-[13px] font-medium
                text-[var(--text-secondary)] bg-[var(--bg-secondary)]
                hover:bg-[var(--bg-tertiary)] transition-colors duration-150"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={!selected || saving}
              className="flex-1 py-2.5 rounded-2xl text-[13px] font-medium text-white
                bg-[var(--accent)] hover:bg-[var(--accent-hover)]
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors duration-150 active:scale-[0.97]"
            >
              {saving ? '添加中…' : selected ? `添加"${selected.name}"` : '请选择一个文件夹'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

async function deleteWorkspace(path: string) {
  await fetch(`/api/config/workspaces?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  refreshConfig()
}

async function deleteModel(id: string) {
  await fetch(`/api/config/models?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  refreshConfig()
}

function AddModelModal({ onClose }: { onClose: () => void }) {
  const [modelId, setModelId] = useState('')
  const [label, setLabel] = useState('')
  const [desc, setDesc] = useState('')
  const [icon, setIcon] = useState<'zap' | 'sparkles'>('zap')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!modelId.trim() || !label.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/config/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modelId.trim(), label: label.trim(), desc: desc.trim(), icon }),
      })
      if (res.status === 409) { setError('该模型 ID 已存在'); return }
      refreshConfig()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div className="relative z-10 w-[400px] flex flex-col rounded-3xl overflow-hidden
        bg-[var(--bg-elevated)] border border-[var(--border)]
        shadow-[0_20px_60px_-10px_rgba(0,0,0,0.18)]">

        <div className="px-5 py-4 border-b border-[var(--border)]">
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">添加模型</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">填写模型信息后添加到选择列表</p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">模型 ID</span>
            <input
              value={modelId}
              onChange={e => setModelId(e.target.value)}
              placeholder="例如：claude-opus-4-7"
              className="px-3 py-2 rounded-xl text-[13px] bg-[var(--bg-secondary)]
                border border-[var(--border)] text-[var(--text-primary)]
                placeholder:text-[var(--text-muted)] outline-none
                focus:border-[var(--accent)]/60 transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">显示名称</span>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="例如：Opus"
              className="px-3 py-2 rounded-xl text-[13px] bg-[var(--bg-secondary)]
                border border-[var(--border)] text-[var(--text-primary)]
                placeholder:text-[var(--text-muted)] outline-none
                focus:border-[var(--accent)]/60 transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">描述（可选）</span>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="例如：最强推理"
              className="px-3 py-2 rounded-xl text-[13px] bg-[var(--bg-secondary)]
                border border-[var(--border)] text-[var(--text-primary)]
                placeholder:text-[var(--text-muted)] outline-none
                focus:border-[var(--accent)]/60 transition-colors"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">图标</span>
            <div className="flex gap-2.5">
              {(['zap', 'sparkles'] as const).map(ic => {
                const Icon = MODEL_ICONS[ic]
                return (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] transition-all",
                      icon === ic
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                        : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40"
                    )}
                  >
                    <Icon size={14} />
                    <span>{ic === 'zap' ? 'Zap' : 'Sparkles'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-5 py-4 border-t border-[var(--border)]">
          {error && <p className="text-[12px] text-[var(--error)] text-center">{error}</p>}
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-[13px] font-medium
                text-[var(--text-secondary)] bg-[var(--bg-secondary)]
                hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={!modelId.trim() || !label.trim() || saving}
              className="flex-1 py-2.5 rounded-2xl text-[13px] font-medium text-white
                bg-[var(--accent)] hover:bg-[var(--accent-hover)]
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors active:scale-[0.97]"
            >
              {saving ? '添加中…' : '添加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WelcomeView({ onSend, workingDirectory, onSelectWorkspace, model, onSelectModel }: Props) {
  const { models, workspaces, homeDir } = useConfig()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModelModal, setShowAddModelModal] = useState(false)
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null)
  const [confirmDeleteModelId, setConfirmDeleteModelId] = useState<string | null>(null)

  return (
    <div className="h-full flex flex-col">
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
          <div className="flex justify-center flex-wrap gap-5">
            {models.map(({ id, label, desc, icon }) => {
              const Icon = MODEL_ICONS[icon] ?? Zap
              const isSelected = model === id
              return (
                <div
                  key={id}
                  className="relative group/model"
                  onMouseLeave={() => setConfirmDeleteModelId(null)}
                >
                  <button
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
                  {/* Delete / confirm */}
                  {confirmDeleteModelId === id ? (
                    <div
                      onClick={e => e.stopPropagation()}
                      className={cn(
                        "absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg border",
                        isSelected
                          ? "bg-black/20 border-white/20"
                          : "bg-[var(--error)]/10 border-[var(--error)]/20"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-medium whitespace-nowrap",
                        isSelected ? "text-white" : "text-[var(--error)]"
                      )}>删除?</span>
                      <button
                        onClick={() => { deleteModel(id); setConfirmDeleteModelId(null) }}
                        className={cn(
                          "p-0.5 rounded transition-colors",
                          isSelected
                            ? "text-white hover:bg-white/20"
                            : "text-[var(--error)] hover:bg-[var(--error)]/20"
                        )}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteModelId(id) }}
                      className={cn(
                        "absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover/model:opacity-100",
                        "transition-all duration-150",
                        isSelected
                          ? "text-white/70 hover:text-white hover:bg-white/20"
                          : "text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
                      )}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )
            })}
            {/* Add model card */}
            <button
              onClick={() => setShowAddModelModal(true)}
              className={cn(
                "flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl min-w-[140px]",
                "border-2 border-dashed border-[var(--border-strong)]",
                "hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]",
                "transition-all duration-200 cursor-pointer hover:shadow-[var(--shadow-md)]",
                "active:scale-[0.97]"
              )}
            >
              <Plus size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
              <span className="text-[14px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">添加</span>
            </button>
          </div>
        </div>

        {/* Workspace row */}
        <div className="w-full animate-enter" style={{ animationDelay: '140ms' }}>
          <p className="text-[13px] font-medium text-[var(--text-secondary)] tracking-widest mb-4 text-center">工作区</p>
          <div className="grid grid-cols-4 gap-5 max-h-[380px] overflow-y-auto pb-1">
            {workspaces.map(({ name, path }, i) => {
              const isSelected = workingDirectory === path
              return (
                <div
                  key={path}
                  style={{ animationDelay: `${160 + i * 50}ms` }}
                  className="animate-enter relative group"
                  onMouseLeave={() => setConfirmDeletePath(null)}
                >
                  <button
                    onClick={() => onSelectWorkspace(isSelected ? '' : path)}
                    className={cn(
                      "w-full flex flex-col items-center gap-3 px-5 py-6 rounded-2xl text-center",
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
                        {shortenPath(path, homeDir)}
                      </span>
                    </div>
                  </button>
                  {/* Delete / confirm */}
                  {confirmDeletePath === path ? (
                    <div
                      onClick={e => e.stopPropagation()}
                      className={cn(
                        "absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg border",
                        isSelected
                          ? "bg-black/20 border-white/20"
                          : "bg-[var(--error)]/10 border-[var(--error)]/20"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-medium whitespace-nowrap",
                        isSelected ? "text-white" : "text-[var(--error)]"
                      )}>删除?</span>
                      <button
                        onClick={() => { deleteWorkspace(path); setConfirmDeletePath(null) }}
                        className={cn(
                          "p-0.5 rounded transition-colors",
                          isSelected
                            ? "text-white hover:bg-white/20"
                            : "text-[var(--error)] hover:bg-[var(--error)]/20"
                        )}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeletePath(path) }}
                      className={cn(
                        "absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100",
                        "transition-all duration-150",
                        isSelected
                          ? "text-white/70 hover:text-white hover:bg-white/20"
                          : "text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
                      )}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )
            })}

            {/* Add workspace card */}
            <button
              onClick={() => setShowAddModal(true)}
              className={cn(
                "group flex flex-col items-center justify-center gap-3 px-5 py-6 rounded-2xl",
                "border-2 border-dashed border-[var(--border-strong)]",
                "hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]",
                "transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-[var(--shadow-md)]",
                "active:translate-y-0 active:scale-[0.97]"
              )}
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] group-hover:bg-[var(--accent-soft)]
                flex items-center justify-center transition-colors duration-200">
                <Plus size={22} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
              </div>
              <span className="text-[14px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                添加
              </span>
            </button>
          </div>
        </div>

      </div>
      </div>

      {showAddModal && (
        <AddWorkspaceModal homeDir={homeDir} onClose={() => setShowAddModal(false)} />
      )}
      {showAddModelModal && (
        <AddModelModal onClose={() => setShowAddModelModal(false)} />
      )}
    </div>
  )
}
