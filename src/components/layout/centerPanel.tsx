// src/components/layout/CenterPanel.tsx

import { useAppStore } from '../../store/parserStore'
import type { CenterTab, ActionType, ParseResult } from '../../types'

const TABS: { id: CenterTab; label: string }[] = [
  { id: 'steps', label: 'Paso a Paso' },
  { id: 'table', label: 'ACTION / GOTO' },
  { id: 'tree', label: 'Árbol Derivación' },
  { id: 'automata', label: 'Autómata LR' },
]

const ACTION_COLORS: Record<ActionType, string> = {
  shift: 'text-accent-cyan',
  reduce: 'text-accent-orange',
  accept: 'text-accent-green font-bold',
  error: 'text-accent-red',
  predict: 'text-accent-cyan',
  match: 'text-accent-cyan',
  expand: 'text-accent-cyan',
}

export function CenterPanel() {
  const { activeTab, setActiveTab, parseResult, isRunning, activeParser } = useAppStore()

  return (
    <main className="flex-1 min-w-0 bg-bg-base flex flex-col overflow-hidden">

      {/* Tab bar */}
      <div className="flex items-center h-9 bg-bg-surface border-b border-border-dim px-3.5 gap-0.5 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              'h-9 px-3 text-[11px] whitespace-nowrap cursor-pointer',
              'border-b-2 border-transparent bg-transparent transition-colors duration-150',
              activeTab === t.id
                ? 'text-accent-cyan border-b-accent-cyan'
                : 'text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}

        {/* Status badge */}
        {parseResult && (
          <span className={[
            'ml-auto font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
            parseResult.accepted
              ? 'bg-accent-green/10 text-accent-green border-accent-green/25'
              : 'bg-accent-red/10 text-accent-red border-accent-red/25',
          ].join(' ')}>
            {parseResult.accepted ? '✓ ACEPTADA' : '✗ RECHAZADA'}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-5">

        {/* Loading */}
        {isRunning && (
          <Centered>
            <div className="flex gap-1.5 mb-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${i * 0.15}s` }}
                  className="w-2 h-2 rounded-full bg-accent-green animate-bounce"
                />
              ))}
            </div>
            <p className="text-text-muted text-xs">Analizando cadena...</p>
          </Centered>
        )}

        {/* Empty */}
        {!isRunning && !parseResult && (
          <Centered>
            <div className="text-4xl text-accent-green/30 mb-3">▶</div>
            <p className="text-text-secondary text-sm font-medium mb-1">
              {activeParser.toUpperCase()} listo
            </p>
            <p className="text-text-muted text-xs max-w-[260px] text-center leading-relaxed">
              Ingresa una gramática y presiona Run para comenzar
            </p>
          </Centered>
        )}

        {/* Steps */}
        {!isRunning && parseResult && activeTab === 'steps' && (
          <StepsView />
        )}

        {!isRunning && activeTab === 'table' && parseResult && (
          <ActionGotoView />
        )}

        {!isRunning && activeTab === 'table' && !parseResult && (
          <Centered>
            <div className="text-3xl text-text-muted mb-3">⊞</div>
            <p className="text-text-secondary text-sm font-medium mb-1">Tabla ACTION / GOTO</p>
            <p className="text-text-muted text-xs">Ejecuta el parser primero</p>
          </Centered>
        )}

        {!isRunning && activeTab === 'tree' && (
          <Centered>
            <div className="text-3xl text-text-muted mb-3">⊤</div>
            <p className="text-text-secondary text-sm font-medium mb-1">Árbol de Derivación</p>
            <p className="text-text-muted text-xs">Se renderizará tras el análisis</p>
          </Centered>
        )}

        {!isRunning && activeTab === 'automata' && (
          <Centered>
            <div className="text-3xl text-text-muted mb-3">◎</div>
            <p className="text-text-secondary text-sm font-medium mb-1">Autómata LR</p>
            <p className="text-text-muted text-xs">Visualización de estados e items LR</p>
          </Centered>
        )}
      </div>
    </main>
  )
}

function StepsView() {
  const { parseResult, activeParser } = useAppStore()
  if (!parseResult) return null

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="font-mono text-sm font-semibold text-text-primary">
          {activeParser.toUpperCase()} parsing
        </span>
      </div>

      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr>
            {['#', 'Pila', 'Entrada', 'Acción'].map((h) => (
              <th
                key={h}
                className="bg-bg-raised text-text-muted text-left px-3 py-1.5 border-b border-border-base text-[10px] uppercase tracking-wide font-semibold sticky top-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parseResult.steps.map((s) => (
            <tr key={s.step} className="group">
              <td className="px-3 py-1.5 border-b border-border-dim group-hover:bg-bg-surface">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-bg-active text-text-muted text-[10px]">
                  {s.step}
                </span>
              </td>
              <td className="px-3 py-1.5 border-b border-border-dim text-text-primary group-hover:bg-bg-surface">
                {s.stack}
              </td>
              <td className="px-3 py-1.5 border-b border-border-dim text-text-secondary group-hover:bg-bg-surface">
                {s.input}
              </td>
              <td className={[
                'px-3 py-1.5 border-b border-border-dim group-hover:bg-bg-surface',
                ACTION_COLORS[s.actionType],
              ].join(' ')}>
                {s.action}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-2 text-center">
      {children}
    </div>
  )
}

function ActionGotoView() {
  const { parseResult, activeParser } = useAppStore()
  if (!parseResult) return null

  const isLL1 = activeParser === 'll1'

  if (isLL1 && parseResult.parseTable) {
    return <LL1TableView table={parseResult.parseTable} />
  }

  if (parseResult.actionTable && parseResult.gotoTable) {
    return <LRTableView
      actionTable={parseResult.actionTable}
      gotoTable={parseResult.gotoTable}
      grammar={parseResult}
    />
  }

  return (
    <Centered>
      <p className="text-text-muted text-xs">No hay tabla disponible para este parser.</p>
    </Centered>
  )
}

function LL1TableView({ table }: { table: Record<string, Record<string, string[]>> }) {
  const nonTerminals = Object.keys(table)
  const terminalsSet = new Set<string>()
  for (const nt of nonTerminals) {
    for (const t of Object.keys(table[nt])) terminalsSet.add(t)
  }
  const terminals = [...terminalsSet, '$'].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3 font-semibold">
        Tabla Predictiva LL(1)
      </p>
      <div className="overflow-auto">
        <table className="border-collapse font-mono text-[11px]">
          <thead>
            <tr>
              <th className="bg-bg-raised text-text-muted px-3 py-1.5 border border-border-base text-left">NT \ T</th>
              {terminals.map(t => (
                <th key={t} className="bg-bg-raised text-accent-cyan px-3 py-1.5 border border-border-base text-center">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonTerminals.map(nt => (
              <tr key={nt} className="group">
                <td className="bg-bg-raised text-accent-green font-bold px-3 py-1.5 border border-border-base">
                  {nt}
                </td>
                {terminals.map(t => {
                  const prod = table[nt]?.[t]
                  return (
                    <td key={t} className="px-3 py-1.5 border border-border-dim text-center group-hover:bg-bg-surface">
                      {prod ? (
                        <span className="text-text-primary">
                          {nt} → {prod[0] === 'ε' ? 'ε' : prod.join(' ')}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LRTableView({
  actionTable,
  gotoTable,
}: {
  actionTable: Record<number, Record<string, string>>
  gotoTable: Record<number, Record<string, number>>
  grammar: ParseResult
}) {
  const states = Object.keys(actionTable).map(Number).sort((a, b) => a - b)

  const actionSymbols = new Set<string>()
  const gotoSymbols = new Set<string>()
  for (const s of states) {
    for (const sym of Object.keys(actionTable[s] ?? {})) actionSymbols.add(sym)
    for (const sym of Object.keys(gotoTable[s] ?? {})) gotoSymbols.add(sym)
  }

  // Ordenar: terminals primero, $ al final
  const actionCols = [...actionSymbols].sort((a, b) =>
    a === '$' ? 1 : b === '$' ? -1 : a.localeCompare(b)
  )
  const gotoCols = [...gotoSymbols].sort()

  const cellColor = (val: string) => {
    if (val.startsWith('s')) return 'text-accent-cyan'
    if (val.startsWith('r')) return 'text-accent-orange'
    if (val === 'acc') return 'text-accent-green font-bold'
    return 'text-text-primary'
  }

  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3 font-semibold">
        Tabla ACTION / GOTO
      </p>
      <div className="overflow-auto">
        <table className="border-collapse font-mono text-[11px]">
          <thead>
            <tr>
              <th className="bg-bg-raised text-text-muted px-3 py-1.5 border border-border-base" rowSpan={2}>
                Estado
              </th>
              {actionCols.length > 0 && (
                <th
                  className="bg-bg-raised text-accent-cyan px-3 py-1.5 border border-border-base text-center"
                  colSpan={actionCols.length}
                >
                  ACTION
                </th>
              )}
              {gotoCols.length > 0 && (
                <th
                  className="bg-bg-raised text-accent-green px-3 py-1.5 border border-border-base text-center"
                  colSpan={gotoCols.length}
                >
                  GOTO
                </th>
              )}
            </tr>
            <tr>
              {actionCols.map(t => (
                <th key={t} className="bg-bg-raised text-accent-cyan px-3 py-1.5 border border-border-base text-center">
                  {t}
                </th>
              ))}
              {gotoCols.map(nt => (
                <th key={nt} className="bg-bg-raised text-accent-green px-3 py-1.5 border border-border-base text-center">
                  {nt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map(state => (
              <tr key={state} className="group">
                <td className="bg-bg-raised text-text-muted font-bold px-3 py-1.5 border border-border-base text-center">
                  {state}
                </td>
                {actionCols.map(t => {
                  const val = actionTable[state]?.[t]
                  return (
                    <td key={t} className={`px-3 py-1.5 border border-border-dim text-center group-hover:bg-bg-surface ${val ? cellColor(val) : ''}`}>
                      {val ?? <span className="text-text-muted">—</span>}
                    </td>
                  )
                })}
                {gotoCols.map(nt => {
                  const val = gotoTable[state]?.[nt]
                  return (
                    <td key={nt} className="px-3 py-1.5 border border-border-dim text-center text-text-secondary group-hover:bg-bg-surface">
                      {val !== undefined ? val : <span className="text-text-muted">—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
