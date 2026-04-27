import { useState, useCallback, useRef, useEffect } from 'react'
import { useSessionStore } from '../stores/session-store'

export type ToolCall = {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'running' | 'done' | 'error'
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; tool: ToolCall }

export type Message = {
  role: 'user' | 'assistant'
  content: string
  blocks: ContentBlock[]
}

export type PendingPermission = {
  tool_name: string
  tool_input: Record<string, unknown>
}

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [workingDirectory, setWorkingDirectory] = useState('/Users/guyi')
  const [model, setModel] = useState('pa/claude-sonnet-4-6')
  const [approval, setApproval] = useState(false)
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sendRef = useRef<((content: string, wdOverride?: string) => Promise<void>) | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    fetch(`/api/sessions/${sessionId}/messages`)
      .then(res => res.json())
      .then((rows: Array<{ role: string; content: string; tools: string }>) => {
        if (cancelled) return
        const msgs: Message[] = rows.map(r => {
          const raw = typeof r.tools === 'string' ? JSON.parse(r.tools) : (r.tools || [])
          let blocks: ContentBlock[]
          if (raw.length > 0 && raw[0].type) {
            blocks = raw.map((b: Record<string, unknown>) => {
              if (b.type === 'tool_use') return { type: 'tool_use' as const, tool: b.tool as ToolCall }
              return { type: 'text' as const, text: b.text as string }
            })
          } else {
            blocks = []
            for (const t of raw as ToolCall[]) blocks.push({ type: 'tool_use', tool: t })
            if (r.content) blocks.push({ type: 'text', text: r.content })
          }
          return { role: r.role as 'user' | 'assistant', content: r.content, blocks }
        })
        if (msgs.length > 0) setMessages(msgs)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [sessionId])

  // Poll for pending permission while streaming
  useEffect(() => {
    if (!isStreaming || !sessionId) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      setPendingPermission(null)
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/pending-permission`)
        const data = await res.json()
        if (data && data.tool_name) {
          setPendingPermission({ tool_name: data.tool_name, tool_input: data.tool_input ?? {} })
        } else {
          setPendingPermission(null)
        }
      } catch {
        // ignore poll errors
      }
    }, 500)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isStreaming, sessionId])

  const respondPermission = useCallback(async (decision: 'allow' | 'deny') => {
    setPendingPermission(null)
    try {
      await fetch(`/api/sessions/${sessionId}/permission-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
    } catch {
      // ignore
    }
  }, [sessionId])

  const sendMessage = useCallback(async (content: string, wdOverride?: string) => {
    const dir = wdOverride ?? workingDirectory
    setMessages(prev => [...prev, { role: 'user', content, blocks: [{ type: 'text', text: content }] }])
    setIsStreaming(true)

    const assistantMsg: Message = { role: 'assistant', content: '', blocks: [] }
    setMessages(prev => [...prev, assistantMsg])

    try {
      abortRef.current = new AbortController()

      const body: Record<string, unknown> = {
        session_id: sessionId,
        message: content,
        working_directory: dir,
        model,
        approval,
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break

          try {
            const obj = JSON.parse(data)
            processEvent(obj, assistantMsg, setMessages)
          } catch {
            //
          }
        }
      }
      if (assistantMsg.blocks.length === 0) {
        assistantMsg.blocks.push({ type: 'text', text: '（无输出）' })
        setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg, blocks: [...assistantMsg.blocks] }])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      assistantMsg.content += '\n\n[连接错误]'
      assistantMsg.blocks.push({ type: 'text', text: '[连接错误]' })
      setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg, blocks: [...assistantMsg.blocks] }])
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [sessionId, workingDirectory, model, approval])

  sendRef.current = sendMessage

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.sessionId === sessionId && sendRef.current) {
        if (detail.workingDirectory) setWorkingDirectory(detail.workingDirectory)
        sendRef.current(detail.message, detail.workingDirectory)
      }
    }
    window.addEventListener('send-message', handler)
    return () => window.removeEventListener('send-message', handler)
  }, [sessionId])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    sendMessage,
    isStreaming,
    stop,
    workingDirectory,
    setWorkingDirectory,
    model,
    setModel,
    approval,
    setApproval,
    pendingPermission,
    respondPermission,
  }
}

function processEvent(
  obj: Record<string, unknown>,
  assistantMsg: Message,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
) {
  if (obj.type === 'assistant') {
    const msg = obj.message as { content?: Array<{ type: string; text?: string; name?: string; id?: string; input?: Record<string, unknown> }> }
    if (!msg?.content) return

    for (const block of msg.content) {
      if (block.type === 'text' && block.text) {
        assistantMsg.content = block.text
        const lastBlock = assistantMsg.blocks[assistantMsg.blocks.length - 1]
        if (lastBlock && lastBlock.type === 'text') {
          lastBlock.text = block.text
        } else {
          assistantMsg.blocks.push({ type: 'text', text: block.text })
        }
      } else if (block.type === 'tool_use') {
        const existing = assistantMsg.blocks.find(
          b => b.type === 'tool_use' && b.tool.id === block.id
        )
        if (!existing) {
          assistantMsg.blocks.push({
            type: 'tool_use',
            tool: {
              id: block.id || '',
              name: block.name || '',
              input: block.input || {},
              status: 'done',
            },
          })
        }
      }
    }

    setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg, blocks: [...assistantMsg.blocks] }])
  }
}
