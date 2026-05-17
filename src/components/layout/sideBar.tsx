// src/components/layout/Sidebar.tsx

import { useEffect } from 'react'
import { useAppStore } from '../../store/parserStore'
import type { ParserType, ParserMeta } from '../../types'
import { parsers } from '../../parsers/parsers-map'

const PARSERS: ParserMeta[] = [
  { id: 'recursive-descent', label: 'Recursivo Desc.', category: 'top-down', description: 'Descenso recursivo predictivo' },
  { id: 'll1', label: 'LL(1)', category: 'top-down', description: 'Predictivo tabla-driven' },
  { id: 'lr0', label: 'LR(0)', category: 'bottom-up', description: 'Shift-reduce básico' },
  { id: 'slr1', label: 'SLR(1)', category: 'bottom-up', description: 'Simple LR con FOLLOW' },
  { id: 'lalr1', label: 'LALR(1)', category: 'bottom-up', description: 'LR(0) + lookaheads' },
  { id: 'lr1', label: 'LR(1)', category: 'bottom-up', description: 'LR canónico completo' },
]

const GRAMMAR_EXAMPLES = [
  { label: 'Aritmética', value: `S → E\nE → E + T | T\nT → T * F | F\nF → ( E ) | id` },
  { label: 'Simple', value: `S → a S b | ε` },
  { label: 'if-else', value: `S → if E then S else S | if E then S | a\nE → b` },
]

const SYMBOLS = ['ε', '→', '|', '$', 'λ', '⊢']

export function Sidebar() {
  const {
    grammar, setGrammar,
    inputString, setInputString,
    activeParser, setActiveParser,
    isRunning, setIsRunning,
    compiledParser, setCompiledParser,
    isCompiling, setIsCompiling,
    setParseResult, setActiveTab,
     setIsComparing, setCompareResults, compareAllParsers,
  } = useAppStore()

  // Recompilar cuando cambia la gramática o el parser activo
  useEffect(() => {
    if (!grammar.trim()) {
      setCompiledParser(null)
      setIsCompiling(false)
      return
    }

    setIsCompiling(true)
    setCompiledParser(null)

    // setTimeout lets React render the "compiling" spinner before the sync work runs
    const timer = setTimeout(() => {
      try {
        const module = parsers[activeParser]
        const compiled = module.compile(grammar)
        setCompiledParser(compiled)
      } catch (err) {
        setCompiledParser({
          isValid: false,
          error: `Error compilando: ${err instanceof Error ? err.message : String(err)}`,
        })
      } finally {
        setIsCompiling(false)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [grammar, activeParser, setCompiledParser, setIsCompiling])

  const handleRun = () => {
    setIsRunning(true)
    setActiveTab('steps')
    setParseResult(null)

    if (!compiledParser || !compiledParser.isValid) {
      setParseResult({
        accepted: false,
        steps: [],
        error: compiledParser?.error || 'Parser no está compilado',
      })
      setIsRunning(false)
      return
    }

    try {
      const module = parsers[activeParser]
      const result = module.parse(compiledParser, grammar, inputString)
      setParseResult(result)
    } catch (err) {
      setParseResult({
        accepted: false,
        steps: [],
        error: `Error ejecutando parser: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleCompare = async () => {
    setIsCompiling(false)
    setIsComparing(true)
    setCompareResults([])
    if (compareAllParsers) await compareAllParsers()
    setActiveTab('compare')
  }

  const topDown = PARSERS.filter((p) => p.category === 'top-down')
  const bottomUp = PARSERS.filter((p) => p.category === 'bottom-up')

  return (
    <aside className="w-[230px] bg-bg-surface border-r border-border-dim flex flex-col overflow-hidden flex-shrink-0">

      {/* Grammar input */}
      <section className="p-3 border-b border-border-dim">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">
            Gramática
          </span>
          <select
            className="text-[10px] bg-bg-raised border border-border-base rounded text-text-secondary px-1.5 py-0.5 cursor-pointer outline-none hover:border-border-strong"
            defaultValue=""
            onChange={(e) => {
              const ex = GRAMMAR_EXAMPLES.find((x) => x.label === e.target.value)
              if (ex) setGrammar(ex.value)
            }}
          >
            <option value="" disabled>ejemplos</option>
            {GRAMMAR_EXAMPLES.map((ex) => (
              <option key={ex.label} value={ex.label}>{ex.label}</option>
            ))}
          </select>
        </div>
        <textarea
          value={grammar}
          onChange={(e) => setGrammar(e.target.value)}
          spellCheck={false}
          rows={6}
          placeholder="S → a S b | ε"
          className="w-full bg-bg-base border border-border-base rounded-md p-2 font-mono text-[11px] text-text-primary leading-relaxed resize-none outline-none transition-colors focus:border-accent-green placeholder:text-text-muted"
        />
      </section>

      {/* String input */}
      <section className="p-3 border-b border-border-dim">
        <span className="block text-[10px] text-text-muted uppercase tracking-widest font-semibold mb-1.5">
          Cadena de entrada
        </span>
        <div className="flex gap-1.5 items-center mb-2">
          <input
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            spellCheck={false}
            placeholder="id + id * id (opcional)"
            className="flex-1 min-w-0 bg-bg-base border border-border-base rounded-md px-2 py-1.5 font-mono text-[11px] text-text-primary outline-none transition-colors focus:border-accent-cyan placeholder:text-text-muted"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={isRunning || isCompiling || !compiledParser?.isValid}
              title={!compiledParser?.isValid ? compiledParser?.error || 'Compilando...' : ''}
              className="bg-accent-green text-black text-[11px] font-bold px-2.5 py-1.5 rounded-md flex-shrink-0 transition-opacity hover:opacity-85 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isCompiling ? '⟳' : isRunning ? '...' : '▶ Run'}
            </button>
            <button
              onClick={handleCompare}
              disabled={isCompiling || !grammar.trim()}
              title={isCompiling ? 'Compilando...' : 'Comparar en todos los parsers'}
              className="bg-bg-raised text-text-secondary text-[11px] px-2.5 py-1.5 rounded-md flex-shrink-0 transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-border-base"
            >
              ☯ Comparar
            </button>
          </div>
        </div>

        {/* Symbol keyboard */}
        <div className="flex gap-1 flex-wrap">
          {SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => setGrammar(grammar + sym)}
              title={`Insertar ${sym}`}
              className="bg-bg-raised border border-border-base rounded text-accent-cyan font-mono text-[12px] px-1.5 py-0.5 cursor-pointer transition-colors hover:bg-bg-active hover:border-accent-cyan"
            >
              {sym}
            </button>
          ))}
        </div>
      </section>

      {/* Parser selector */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ParserGroup label="Top-Down" parsers={topDown} active={activeParser} onSelect={setActiveParser} icon="↓" />
        <ParserGroup label="Bottom-Up" parsers={bottomUp} active={activeParser} onSelect={setActiveParser} icon="↑" />
      </nav>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-border-dim">
        <span className="font-mono text-[10px] text-text-muted">CS3402 · UTEC 2026-1</span>
      </div>
    </aside>
  )
}

function ParserGroup({
  label, parsers, active, onSelect, icon,
}: {
  label: string
  parsers: ParserMeta[]
  active: ParserType
  onSelect: (p: ParserType) => void
  icon: string
}) {
  return (
    <div className="px-2 pb-2">
      <div className="text-[9px] text-text-muted uppercase tracking-widest font-bold px-1 py-2">
        {label}
      </div>
      {parsers.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          title={p.description}
          className={[
            'flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md',
            'border-none text-left cursor-pointer text-[12px]',
            'transition-colors duration-100',
            active === p.id
              ? 'bg-bg-active text-text-primary'
              : 'bg-transparent text-text-secondary hover:bg-bg-raised hover:text-text-primary',
          ].join(' ')}
        >
          <span className={[
            'text-[12px] w-3.5 text-center flex-shrink-0',
            active === p.id ? 'text-accent-green' : 'text-text-muted',
          ].join(' ')}>
            {icon}
          </span>
          <span className="font-mono text-[11px] flex-1">{p.label}</span>
          <span className={[
            'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0',
            p.category === 'top-down'
              ? 'bg-accent-cyan/10 text-accent-cyan'
              : 'bg-accent-green/10 text-accent-green',
          ].join(' ')}>
            {p.category === 'top-down' ? 'TD' : 'BU'}
          </span>
        </button>
      ))}
    </div>
  )
}
