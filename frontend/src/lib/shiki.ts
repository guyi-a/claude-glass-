import { createHighlighter, type Highlighter } from 'shiki'

let highlighter: Highlighter | null = null
let loading: Promise<Highlighter> | null = null

export async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter
  if (loading) return loading

  loading = createHighlighter({
    themes: ['github-light'],
    langs: [
      'javascript', 'typescript', 'jsx', 'tsx',
      'python', 'bash', 'json', 'html', 'css',
      'sql', 'yaml', 'markdown', 'rust', 'go',
      'java', 'c', 'cpp',
    ],
  })

  highlighter = await loading
  return highlighter
}

export async function highlight(code: string, lang: string): Promise<string> {
  const h = await getHighlighter()
  const supported = h.getLoadedLanguages()
  const resolvedLang = supported.includes(lang) ? lang : 'text'

  return h.codeToHtml(code, {
    lang: resolvedLang,
    theme: 'github-light',
  })
}
