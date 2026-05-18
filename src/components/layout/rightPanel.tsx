// src/components/layout/RightPanel.tsx

import { useRef, useEffect, useState } from 'react'
import { useAppStore } from '../../store/parserStore'

const BACKEND_CHAT_URL =
  import.meta.env.VITE_BACKEND_CHAT_URL ??
  'https://vercel-backend-3-qz80m1m13-yoselynmiranda-7487s-projects.vercel.app/api/chat'
const MAX_CHAT_HISTORY = 8

const QUICK_CHIPS = [
  '¿Es LL(1)?',
  'Explica el conflicto',
  'Calcula FIRST/FOLLOW',
  'Ver items LR(0)',
  '¿Es ambigua?',
  'Transfórmala a LL(1)',
]

// ── KaTeX lazy loader ─────────────────────────────────────────────────────────
// Carga KaTeX desde CDN la primera vez que se necesita
let katexLoaded = false
let katexLoadPromise: Promise<void> | null = null

function loadKatex(): Promise<void> {
  if (katexLoaded) return Promise.resolve()
  if (katexLoadPromise) return katexLoadPromise

  katexLoadPromise = new Promise((resolve) => {
    // CSS
    if (!document.querySelector('link[data-katex]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
      link.setAttribute('data-katex', '1')
      document.head.appendChild(link)
    }
    // JS
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'
    script.onload = () => { katexLoaded = true; resolve() }
    script.onerror = () => resolve() // fallback silencioso
    document.head.appendChild(script)
  })
  return katexLoadPromise
}

// Renderiza un fragmento LaTeX a HTML usando KaTeX; si falla devuelve el texto crudo
function renderLatex(src: string, displayMode: boolean): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const katex = (window as any).katex
    if (!katex) return src
    return katex.renderToString(src, {
      displayMode,
      throwOnError: false,
      trust: false,
      strict: false,
    })
  } catch {
    return src
  }
}

// ── Componente KatexSpan ──────────────────────────────────────────────────────
function KatexSpan({ src, display }: { src: string; display: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [ready, setReady] = useState(katexLoaded)

  useEffect(() => {
    if (!ready) {
      loadKatex().then(() => setReady(true))
    }
  }, [ready])

  useEffect(() => {
    if (!ready || !ref.current) return
    ref.current.innerHTML = renderLatex(src, display)
  }, [src, display, ready])

  if (!ready) {
    // Mientras carga KaTeX muestra el texto entre backticks para que no se vea vacío
    return (
      <code className="text-accent-cyan font-mono text-[11px]">{src}</code>
    )
  }

  return (
    <span
      ref={ref}
      className={display ? 'block my-1 text-center overflow-x-auto' : 'inline mx-0.5'}
      style={{ color: 'var(--color-accent-cyan, #00d4ff)' }}
    />
  )
}

// ── Inline renderer ───────────────────────────────────────────────────────────
function renderInlineContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let cursor = 0
  let keyIndex = 0

  const push = (node: React.ReactNode) => parts.push(node)

  while (cursor < text.length) {
    // Buscar $$ primero (display math inline poco común pero posible)
    const dd = text.indexOf('$$', cursor)
    const sd = text.indexOf('$', cursor)
    const bd = text.indexOf('**', cursor)

    // Prioridad: $$ antes que $ antes que **
    let nearest: 'dd' | 'sd' | 'bd' | null = null
    let nearestIdx = Infinity

    if (dd !== -1 && dd < nearestIdx) { nearest = 'dd'; nearestIdx = dd }
    if (bd !== -1 && bd < nearestIdx) { nearest = 'bd'; nearestIdx = bd }
    // Solo priorizar $ si no es parte de $$
    if (sd !== -1 && sd < nearestIdx && sd !== dd) { nearest = 'sd'; nearestIdx = sd }

    if (!nearest) {
      push(text.slice(cursor))
      break
    }

    if (nearestIdx > cursor) push(text.slice(cursor, nearestIdx))

    if (nearest === 'dd') {
      const end = text.indexOf('$$', nearestIdx + 2)
      if (end === -1) { push(text.slice(nearestIdx)); break }
      push(<KatexSpan key={`dd-${keyIndex++}`} src={text.slice(nearestIdx + 2, end)} display={false} />)
      cursor = end + 2
    } else if (nearest === 'bd') {
      const end = text.indexOf('**', nearestIdx + 2)
      if (end === -1) { push(text.slice(nearestIdx)); break }
      push(
        <strong key={`b-${keyIndex++}`} className="font-semibold text-text-primary">
          {renderInlineContent(text.slice(nearestIdx + 2, end))}
        </strong>
      )
      cursor = end + 2
    } else {
      const end = text.indexOf('$', nearestIdx + 1)
      if (end === -1) { push(text.slice(nearestIdx)); break }
      push(<KatexSpan key={`m-${keyIndex++}`} src={text.slice(nearestIdx + 1, end)} display={false} />)
      cursor = end + 1
    }
  }

  return parts
}

// ── Block renderer ────────────────────────────────────────────────────────────
function renderAssistantMessage(content: string) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Línea vacía → espaciado
    if (!line.trim()) {
      blocks.push(<div key={`sp-${i}`} className="h-2" />)
      i++
      continue
    }

    // Display math block: línea que empieza y termina con $$
    const trimmed = line.trim()
    if (trimmed.startsWith('$$')) {
      // Puede ser $$...$$ en una sola línea o bloque multilinea
      const restOfLine = trimmed.slice(2)
      if (restOfLine.endsWith('$$') && restOfLine.length > 2) {
        // Una sola línea: $$...$$
        blocks.push(
          <div key={`dm-${i}`} className="my-1.5 rounded-md border border-border-base bg-bg-base px-3 py-2 overflow-x-auto text-center">
            <KatexSpan src={restOfLine.slice(0, -2).trim()} display={true} />
          </div>
        )
        i++
      } else {
        // Bloque multilinea: recolectar hasta el $$ de cierre
        const mathLines: string[] = [restOfLine]
        i++
        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          mathLines.push(lines[i])
          i++
        }
        if (i < lines.length) {
          const last = lines[i].trim()
          mathLines.push(last.endsWith('$$') ? last.slice(0, -2) : last)
          i++
        }
        const mathSrc = mathLines.join('\n').trim()
        blocks.push(
          <div key={`dm-${i}`} className="my-1.5 rounded-md border border-border-base bg-bg-base px-3 py-2 overflow-x-auto text-center">
            <KatexSpan src={mathSrc} display={true} />
          </div>
        )
      }
      continue
    }

    // Tabla markdown
    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines
        .map((row) => row.trim().replace(/^\|/, '').replace(/\|$/, ''))
        .map((row) => row.split('|').map((cell) => cell.trim()))
      const header = rows[0] ?? []
      const bodyRows = rows.slice(1).filter((row) => row.join('').replace(/[-:\s]/g, '').length > 0)
      blocks.push(
        <div key={`tbl-${i}`} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead>
              <tr>
                {header.map((cell, ci) => (
                  <th key={ci} className="border border-border-base bg-bg-surface px-2 py-1 text-left text-text-primary">
                    {renderInlineContent(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-border-dim px-2 py-1 align-top text-text-secondary">
                      {renderInlineContent(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Encabezados markdown
    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#{1,3}/)?.[0].length ?? 1
      const text = line.replace(/^#{1,3}\s+/, '')
      const sizeClass = level === 1 ? 'text-sm' : level === 2 ? 'text-[13px]' : 'text-[12px]'
      blocks.push(
        <div key={`h-${i}`} className={`${sizeClass} font-semibold text-text-primary mt-2 mb-1`}>
          {renderInlineContent(text)}
        </div>
      )
      i++
      continue
    }

    // Lista con bullet (- o *)
    if (/^[\-\*]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[\-\*]\s+/, '')
      blocks.push(
        <div key={`li-${i}`} className="flex gap-1.5 leading-relaxed">
          <span className="text-accent-cyan mt-0.5 flex-shrink-0">•</span>
          <span className="text-xs text-text-secondary">{renderInlineContent(itemText)}</span>
        </div>
      )
      i++
      continue
    }

    // Párrafo normal
    blocks.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-text-secondary">
        {renderInlineContent(line)}
      </p>
    )
    i++
  }

  return blocks
}


export function RightPanel() {
  const {
    chatMessages, addChatMessage,
    isChatLoading, setChatLoading,
    grammar, inputString, activeParser, parseResult,
    clearChat,
  } = useAppStore()

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isChatLoading])

  const buildContext = () =>
    `Gramática actual:\n${grammar}\n\nCadena de entrada: ${inputString}\nParser activo: ${activeParser.toUpperCase()}\n${parseResult
      ? `Resultado: ${parseResult.accepted ? 'ACEPTADA' : 'RECHAZADA'}`
      : 'Aún no ejecutado.'
    }`

  const sendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return
    setInput('')
    addChatMessage({ role: 'user', content: text })
    setChatLoading(true)

    const systemPrompt = `Eres un asistente experto en compiladores y análisis sintáctico.
Responde de forma clara, concisa y pedagógica en español.
  Evita usar títulos Markdown como ### o ##.
  Si presentas listas o explicaciones, usa texto simple o viñetas.
  Si incluyes una tabla, fórmala como tabla Markdown limpia con encabezado y filas alineadas.
  Escribe las ecuaciones en formato $...$ o $$...$$ y usa **negritas** solo cuando quieras resaltar conceptos.
  Usa notación formal cuando sea necesario (→, ε, FIRST, FOLLOW, items LR).
Contexto actual del parser:\n${buildContext()}`

    // Limitar historial para dejar más espacio a la respuesta del modelo
    const history = chatMessages.slice(-MAX_CHAT_HISTORY).map((m) => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    console.log('Chat backend URL:', BACKEND_CHAT_URL)
    
    try {
      const response = await fetch(
        BACKEND_CHAT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: text,
            history,
            systemPrompt,
          })
        }
      );

      const data = await response.json()
      console.log('Status:', response.status)
      console.log('Data:', JSON.stringify(data))
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        'No se pudo obtener respuesta.'
      addChatMessage({ role: 'ai', content: reply })
    } catch {
      addChatMessage({ role: 'ai', content: 'Error al conectar con el backend de chat.' })
    } finally {
      setChatLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <aside className="w-[290px] bg-bg-surface border-l border-border-dim flex flex-col overflow-hidden flex-shrink-0">

      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border-dim flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_5px_#00e5a0] flex-shrink-0" />
        <span className="text-xs font-semibold text-text-primary">AI Assistant</span>
        <span className="ml-auto font-mono text-[10px] text-text-muted">vercel-backend</span>
        <button
          onClick={clearChat}
          title="Limpiar chat"
          className="text-text-muted hover:text-text-secondary text-sm px-1 cursor-pointer bg-transparent border-none transition-colors"
        >
          ↺
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {chatMessages.map((m, i) => (
          <div key={i} className={['flex gap-1.5 items-start', m.role === 'user' ? 'flex-row-reverse' : ''].join(' ')}>
            {m.role === 'ai' && (
              <span className="font-mono text-[9px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/20 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">
                AI
              </span>
            )}
            <div className={[
              'text-xs leading-relaxed rounded-md px-2.5 py-2 break-words min-w-0',
              m.role === 'ai'
                ? 'bg-bg-raised border border-border-dim text-text-secondary flex-1 flex flex-col gap-0.5'
                : 'bg-bg-active border border-border-base text-text-primary max-w-[88%] whitespace-pre-wrap',
            ].join(' ')}>
              {m.role === 'ai' ? renderAssistantMessage(m.content) : m.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isChatLoading && (
          <div className="flex gap-1.5 items-start">
            <span className="font-mono text-[9px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/20 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">
              AI
            </span>
            <div className="bg-bg-raised border border-border-dim rounded-md px-2.5 py-2.5 flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${i * 0.15}s` }}
                  className="w-1.5 h-1.5 rounded-full bg-accent-green animate-bounce"
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1 px-2.5 py-2 border-t border-border-dim">
        {QUICK_CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => sendMessage(c)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-border-base text-text-secondary bg-transparent cursor-pointer transition-colors hover:border-accent-green hover:text-accent-green whitespace-nowrap"
          >
            {c}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-1.5 items-end px-3 py-2.5 border-t border-border-dim">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre la gramática..."
          rows={2}
          disabled={isChatLoading}
          className="flex-1 bg-bg-base border border-border-base rounded-md px-2.5 py-1.5 text-[11px] font-sans text-text-primary resize-none outline-none transition-colors focus:border-accent-green placeholder:text-text-muted disabled:opacity-50 leading-relaxed"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isChatLoading || !input.trim()}
          className="w-8 h-8 bg-accent-green text-black font-bold text-sm rounded-md flex-shrink-0 cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-35 disabled:cursor-not-allowed"
        >
          ↑
        </button>
      </div>
    </aside>
  )
}