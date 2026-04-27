import { create } from 'zustand'

export type Session = {
  id: string
  title: string
  working_directory: string
  created_at: string
  updated_at: string
  has_messages: number
}

type SessionStore = {
  sessions: Session[]
  activeId: string | null
  loading: boolean

  fetchSessions: () => Promise<void>
  createSession: (workingDirectory?: string) => Promise<string>
  deleteSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
  markHasMessages: (id: string) => void
  setActive: (id: string | null) => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeId: null,
  loading: false,

  fetchSessions: async () => {
    set({ loading: true })
    const res = await fetch('/api/sessions')
    const sessions = await res.json()
    set({ sessions, loading: false })
  },

  createSession: async (workingDirectory?: string) => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新对话', ...(workingDirectory ? { working_directory: workingDirectory } : {}) }),
    })
    const session = await res.json()
    set(s => ({ sessions: [session, ...s.sessions], activeId: session.id }))
    return session.id
  },

  deleteSession: async (id) => {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    const { sessions, activeId } = get()
    const remaining = sessions.filter(s => s.id !== id)
    set({
      sessions: remaining,
      activeId: activeId === id ? (remaining[0]?.id ?? null) : activeId,
    })
  },

  renameSession: async (id, title) => {
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    set(s => ({
      sessions: s.sessions.map(sess => sess.id === id ? { ...sess, title } : sess),
    }))
  },

  markHasMessages: (id) => set(s => ({
    sessions: s.sessions.map(sess => sess.id === id ? { ...sess, has_messages: 1 } : sess),
  })),

  setActive: (id) => set({ activeId: id }),
}))
