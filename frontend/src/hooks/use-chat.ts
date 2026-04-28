import { useState, useCallback, useRef, useEffect } from 'react'
import { useConfig } from './use-config'

export type ToolCall = {
  id: string
  name: string
  input: Record<string, unknown>
  output?: string
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

export type StreamingStats = {
  elapsed: number        // seconds
  inputTokens: number | null
}

export function useChat(sessionId: string) {
  const { defaultWorkingDirectory, _loaded } = useConfig()
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingStats, setStreamingStats] = useState<StreamingStats>({ elapsed: 0, inputTokens: null })
  const [workingDirectory, setWorkingDirectory] = useState(defaultWorkingDirectory)
  const [model, setModel] = useState('')
  const [approval, setApproval] = useState(true)
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sendRef = useRef<((content: string, wdOverride?: string) => Promise<void>) | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const configAppliedRef = useRef(false)

  useEffect(() => {
    if (!_loaded || configAppliedRef.current) return
    configAppliedRef.current = true
    setWorkingDirectory(defaultWorkingDirectory)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_loaded])

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
    const startTime = Date.now()
    setStreamingStats({ elapsed: 0, inputTokens: null })
    timerRef.current = setInterval(() => {
      setStreamingStats(s => ({ ...s, elapsed: Math.floor((Date.now() - startTime) / 1000) }))
    }, 1000)

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
            // Extract token usage from system/result events
            const usage = obj?.usage ?? obj?.message?.usage
            if (usage?.input_tokens != null) {
              setStreamingStats(s => ({ ...s, inputTokens: usage.input_tokens }))
            }
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
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
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
    streamingStats,
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
    return
  }

  if (obj.type === 'user') {
    const msg = obj.message as { content?: Array<{ type?: string; tool_use_id?: string; content?: unknown }> }
    if (!msg?.content) return

    let changed = false
    for (const block of msg.content) {
      if (block.type !== 'tool_result' || !block.tool_use_id) continue
      const target = assistantMsg.blocks.find(
        (item): item is Extract<ContentBlock, { type: 'tool_use' }> => item.type === 'tool_use' && item.tool.id === block.tool_use_id
      )
      if (!target) continue
      target.tool.output = stringifyToolResult(block.content)
      changed = true
    }

    if (changed) {
      setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg, blocks: [...assistantMsg.blocks] }])
    }
  }
}

function stringifyToolResult(content: unknown): string {
  if (typeof content === 'string') return content
  if (content == null) return ''
  try {
    return JSON.stringify(content, null, 2)
  } catch {
    return String(content)
  }
}
