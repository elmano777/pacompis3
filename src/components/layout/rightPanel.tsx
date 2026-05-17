// src/components/layout/RightPanel.tsx

import { useRef, useEffect, useState } from 'react'
import { useAppStore } from '../../store/parserStore'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`
const MAX_CHAT_HISTORY = 8

const QUICK_CHIPS = [
  '¿Es LL(1)?',
  'Explica el conflicto',
  'Calcula FIRST/FOLLOW',
  'Ver items LR(0)',
  '¿Es ambigua?',
  'Transfórmala a LL(1)',
]

function renderInlineContent(text: string) {
  const parts: React.ReactNode[] = []
  let cursor = 0
  let keyIndex = 0

  const pushText = (value: string) => {
    if (value) parts.push(value)
  }

  while (cursor < text.length) {
    const boldStart = text.indexOf('**', cursor)
    const inlineMathStart = text.indexOf('$', cursor)
    const displayMathStart = text.indexOf('$$', cursor)

    let nextType: 'bold' | 'math' | 'display' | null = null
    let nextIndex = -1

    if (displayMathStart !== -1 && (nextIndex === -1 || displayMathStart < nextIndex)) {
      nextType = 'display'
      nextIndex = displayMathStart
    }
    if (boldStart !== -1 && (nextIndex === -1 || boldStart < nextIndex)) {
      nextType = 'bold'
      nextIndex = boldStart
    }
    if (inlineMathStart !== -1 && (nextIndex === -1 || inlineMathStart < nextIndex)) {
      nextType = 'math'
      nextIndex = inlineMathStart
    }

    if (!nextType || nextIndex === -1) {
      pushText(text.slice(cursor))
      break
    }

    pushText(text.slice(cursor, nextIndex))

    if (nextType === 'bold') {
      const end = text.indexOf('**', nextIndex + 2)
      if (end === -1) {
        pushText(text.slice(nextIndex))
        break
      }

      parts.push(
        <strong key={`b-${keyIndex++}`} className="font-semibold text-text-primary">
          {text.slice(nextIndex + 2, end)}
        </strong>
      )
      cursor = end + 2
      continue
    }

    if (nextType === 'display') {
      const end = text.indexOf('$$', nextIndex + 2)
      if (end === -1) {
        pushText(text.slice(nextIndex))
        break
      }

      parts.push(
        <span
          key={`d-${keyIndex++}`}
          className="mx-0.5 rounded border border-border-base bg-bg-base px-1.5 py-0.5 font-mono text-[11px] text-accent-cyan whitespace-nowrap"
        >
          {text.slice(nextIndex + 2, end)}
        </span>
      )
      cursor = end + 2
      continue
    }

    const end = text.indexOf('$', nextIndex + 1)
    if (end === -1) {
      pushText(text.slice(nextIndex))
      break
    }

    parts.push(
      <span
        key={`m-${keyIndex++}`}
        className="mx-0.5 rounded border border-border-base bg-bg-base px-1.5 py-0.5 font-mono text-[11px] text-accent-cyan whitespace-nowrap"
      >
        {text.slice(nextIndex + 1, end)}
      </span>
    )
    cursor = end + 1
  }

  return parts
}

function renderAssistantMessage(content: string) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      blocks.push(<div key={`spacer-${i}`} className="h-2" />)
      i++
      continue
    }

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
      const bodyRows = rows.slice(1).filter((row) => {
        const text = row.join(' ').replace(/[-:\s]/g, '')
        return text.length > 0
      })

      blocks.push(
        <div key={`table-${i}`} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead>
              <tr>
                {header.map((cell, index) => (
                  <th key={index} className="border border-border-base bg-bg-surface px-2 py-1 text-left text-text-primary">
                    {renderInlineContent(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-border-dim px-2 py-1 align-top text-text-secondary">
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

    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#{1,3}/)?.[0].length ?? 1
      const text = line.replace(/^#{1,3}\s+/, '')
      const sizeClass = level === 1 ? 'text-sm' : level === 2 ? 'text-[13px]' : 'text-[12px]'

      blocks.push(
        <div key={`heading-${i}`} className={`${sizeClass} font-semibold text-text-primary mt-2 mb-1`}>
          {renderInlineContent(text)}
        </div>
      )
      i++
      continue
    }

    const trimmed = line.trim()
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      blocks.push(
        <div key={`display-math-${i}`} className="my-2 rounded-md border border-border-base bg-bg-base px-3 py-2 font-mono text-[11px] text-accent-cyan text-center overflow-x-auto">
          {trimmed.slice(2, -2).trim()}
        </div>
      )
      i++
      continue
    }

    blocks.push(
      <p key={`p-${i}`} className="whitespace-pre-wrap leading-relaxed">
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
    console.log('URL:', GEMINI_URL)
    console.log('Body:', JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...history,
        { role: 'user', parts: [{ text }] },
      ],
    }))
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            ...history,
            { role: 'user', parts: [{ text }] },
          ],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.4,
          },
        }),
      })

      const data = await response.json()
      console.log('Status:', response.status)
      console.log('Data:', JSON.stringify(data))
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        'No se pudo obtener respuesta.'
      addChatMessage({ role: 'ai', content: reply })
    } catch {
      addChatMessage({ role: 'ai', content: 'Error al conectar con Gemini.' })
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
        <span className="ml-auto font-mono text-[10px] text-text-muted">gemini-2.0-flash</span>
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
              'text-xs leading-relaxed rounded-md px-2.5 py-2 break-words whitespace-pre-wrap',
              m.role === 'ai'
                ? 'bg-bg-raised border border-border-dim text-text-secondary flex-1'
                : 'bg-bg-active border border-border-base text-text-primary max-w-[88%]',
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
