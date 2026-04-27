import { useState, useEffect } from 'react'

export type Config = {
  homeDir: string
  defaultWorkingDirectory: string
  defaultModel: string
  models: Array<{ id: string; label: string; desc: string; icon: 'sparkles' | 'zap' }>
  workspaces: Array<{ name: string; path: string }>
  _loaded: boolean
}

const DEFAULT: Config = {
  homeDir: '~',
  defaultWorkingDirectory: '~',
  defaultModel: 'pa/claude-sonnet-4-6',
  models: [
    { id: 'pa/claude-opus-4-6',   label: 'Opus',   desc: '最强推理', icon: 'sparkles' },
    { id: 'pa/claude-sonnet-4-6', label: 'Sonnet', desc: '快速高效', icon: 'zap' },
  ],
  workspaces: [],
  _loaded: false,
}

let cached: Config | null = null
const listeners = new Set<(c: Config) => void>()

async function fetchConfig() {
  try {
    const res = await fetch('/api/config')
    const data = await res.json()
    cached = { ...data, _loaded: true }
    listeners.forEach(fn => fn(cached!))
  } catch {
    cached = { ...DEFAULT, _loaded: true }
    listeners.forEach(fn => fn(cached!))
  }
}

export function useConfig(): Config {
  const [config, setConfig] = useState<Config>(cached ?? DEFAULT)

  useEffect(() => {
    listeners.add(setConfig)
    if (!cached) fetchConfig()
    else setConfig(cached)
    return () => { listeners.delete(setConfig) }
  }, [])

  return config
}

export function shortenPath(fullPath: string, homeDir: string): string {
  if (homeDir && homeDir !== '~' && fullPath.startsWith(homeDir)) {
    return '~' + fullPath.slice(homeDir.length)
  }
  return fullPath
}
