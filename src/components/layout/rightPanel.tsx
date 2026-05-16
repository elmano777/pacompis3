// src/components/layout/RightPanel.tsx

import { useRef, useEffect, useState } from 'react'
import { useAppStore } from '../../store/parserStore'

const GEMINI_API_KEY = 'AIzaSyAAZSgmzQpQu81BSM9m7sckK75L5kA5eb4'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`

const QUICK_CHIPS = [
  '¿Es LL(1)?',
  'Explica el conflicto',
  'Calcula FIRST/FOLLOW',
  'Ver items LR(0)',
  '¿Es ambigua?',
  'Transfórmala a LL(1)',
]

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
Usa notación formal cuando sea necesario (→, ε, FIRST, FOLLOW, items LR).
Contexto actual del parser:\n${buildContext()}`

    // Construir historial para Gemini
    const history = chatMessages.map((m) => ({
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
            maxOutputTokens: 1024,
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
              {m.content}
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
