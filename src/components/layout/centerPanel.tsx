// src/components/layout/CenterPanel.tsx

import { useRef } from 'react';
import { useAppStore } from '../../store/parserStore'
import type { CenterTab, ActionType, ParseResult } from '../../types'

const fullscreenStyle = `
  :fullscreen .fullscreen-bg { background: var(--color-bg-base, #13131a); }
  :-webkit-full-screen .fullscreen-bg { background: var(--color-bg-base, #13131a); }
`

const TABS: { id: CenterTab; label: string }[] = [
  { id: 'steps', label: 'Paso a Paso' },
  { id: 'table', label: 'ACTION / GOTO' },
  { id: 'tree', label: 'Árbol Derivación' },
  { id: 'automata', label: 'Autómata LR' },
  { id: 'compare', label: 'Comparador' },
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

const getTableLabel = (parser: string) => parser === 'll1' ? 'Tabla Predictiva' : 'ACTION / GOTO'

export function CenterPanel() {
  const { activeTab, setActiveTab, parseResult, isRunning, activeParser, compiledParser, isCompiling } = useAppStore()
  const panelKey = activeParser

  // Si el parser está compilando o no está compilado válido, mostrar estado
  if (isCompiling && !parseResult) {
    return (
      <main key={panelKey} className="flex-1 min-w-0 bg-bg-base flex flex-col overflow-hidden">
        <div className="flex items-center h-9 bg-bg-surface border-b border-border-dim px-3.5 gap-0.5 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              disabled={true}
              className={[
                'h-9 px-3 text-[11px] whitespace-nowrap cursor-not-allowed',
                'border-b-2 border-transparent bg-transparent transition-colors duration-150',
                activeTab === t.id
                  ? 'text-accent-cyan border-b-accent-cyan'
                  : 'text-text-muted',
              ].join(' ')}
            >
              {t.id === 'table' ? getTableLabel(activeParser) : t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-5 flex flex-col items-center justify-center">
          <div className="flex gap-1.5 mb-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{ animationDelay: `${i * 0.15}s` }}
                className="w-2 h-2 rounded-full bg-accent-cyan animate-bounce"
              />
            ))}
          </div>
          <p className="text-text-muted text-xs">Compilando gramática para {activeParser.toUpperCase()}...</p>
        </div>
      </main>
    )
  }

  if (compiledParser && !compiledParser.isValid && !parseResult) {
    return (
      <main key={panelKey} className="flex-1 min-w-0 bg-bg-base flex flex-col overflow-hidden">
        <div className="flex items-center h-9 bg-bg-surface border-b border-border-dim px-3.5 gap-0.5 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={[
                'h-9 px-3 text-[11px] whitespace-nowrap cursor-pointer',
                'border-b-2 border-transparent bg-transparent transition-colors duration-150',
                activeTab === t.id
                  ? 'text-accent-red border-b-accent-red'
                  : 'text-text-muted hover:text-text-secondary',
              ].join(' ')}
            >
              {t.id === 'table' ? getTableLabel(activeParser) : t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-5 flex flex-col items-center justify-center">
          <div className="text-3xl text-accent-red mb-3">⚠</div>
          <p className="text-text-secondary text-sm font-medium mb-2">Gramática no es {activeParser.toUpperCase()}</p>
          <p className="text-text-muted text-xs max-w-[300px] text-center leading-relaxed">
            {compiledParser?.error || 'La gramática contiene conflictos y no puede ser utilizada por este parser'}
          </p>
          {compiledParser?.conflicts && compiledParser.conflicts.length > 0 && (
            <div className="mt-4 max-w-[400px] text-left">
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-2">Conflictos detectados:</p>
              <ul className="text-[10px] text-accent-red space-y-1 max-h-[150px] overflow-auto">
                {compiledParser.conflicts.slice(0, 5).map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
                {compiledParser.conflicts.length > 5 && (
                  <li>... y {compiledParser.conflicts.length - 5} más</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main key={panelKey} className="flex-1 min-w-0 bg-bg-base flex flex-col overflow-hidden">

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
            {t.id === 'table' ? getTableLabel(activeParser) : t.label}
          </button>
        ))}

        {/* Status badge */}
        {parseResult && !parseResult.grammarOnly && (
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

        {/* Empty - show when no parseResult and on steps tab */}
        {!isRunning && !parseResult && activeTab === 'steps' && (
          <Centered>
            <div className="text-4xl text-accent-green/30 mb-3">▶</div>
            <p className="text-text-secondary text-sm font-medium mb-1">
              {activeParser.toUpperCase()} listo
            </p>
            {compiledParser?.isValid ? (
              <p className="text-text-muted text-xs max-w-[260px] text-center leading-relaxed">
                Gramática compilada. Ingresa una cadena y presiona Run, o ve a la pestaña <span className="text-accent-cyan">{getTableLabel(activeParser)}</span> para ver las tablas.
              </p>
            ) : (
              <p className="text-text-muted text-xs max-w-[260px] text-center leading-relaxed">
                Ingresa una gramática y presiona Run para comenzar
              </p>
            )}
          </Centered>
        )}

        {/* Steps */}
        {!isRunning && parseResult && activeTab === 'steps' && (
          <StepsView />
        )}

        {!isRunning && activeTab === 'table' && parseResult && (
          <ActionGotoView />
        )}

        {!isRunning && activeTab === 'table' && !parseResult && compiledParser?.isValid && (
          <ActionGotoViewFromCompiled />
        )}

        {!isRunning && activeTab === 'table' && !parseResult && !compiledParser?.isValid && (
          <Centered>
            <div className="text-3xl text-text-muted mb-3">⊞</div>
            <p className="text-text-secondary text-sm font-medium mb-1">Tabla ACTION / GOTO</p>
            <p className="text-text-muted text-xs">Ejecuta el parser primero</p>
          </Centered>
        )}

        {!isRunning && activeTab === 'tree' && (
          <TreeView />
        )}

        {!isRunning && activeTab === 'automata' && (
          <AutomataView />
        )}
        {!isRunning && activeTab === 'compare' && (
          <CompareView />
        )}
      </div>
    </main>
  )
}

function CompareView() {
  const { compareResults, isComparing } = useAppStore()
  const ref = useRef<HTMLDivElement | null>(null)

  const handleExport = () => {
    if (!ref.current) return
    exportElementToPdf(ref.current, 'comparador-resultados')
  }

  if (isComparing) return (
    <div className="p-6">
      <div className="flex gap-1.5 mb-3">
        {[0, 1, 2].map(i => (
          <span key={i} style={{ animationDelay: `${i * 0.15}s` }} className="w-2 h-2 rounded-full bg-accent-cyan animate-bounce" />
        ))}
      </div>
      <p className="text-text-muted text-xs">Comparando parsers...</p>
    </div>
  )

  if (!compareResults || compareResults.length === 0) return (
    <div className="p-6">
      <p className="text-text-muted text-xs">No hay resultados de comparación. Presiona Comparar.</p>
    </div>
  )

  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3 font-semibold">Resultados Comparador</p>
      <div className="flex items-center justify-between mb-2">
        <div />
        <button
          onClick={handleExport}
          className="text-[11px] bg-bg-raised px-2 py-1 rounded border border-border-base text-text-secondary hover:text-text-primary"
        >
          Exportar PDF
        </button>
      </div>
      <div ref={ref} className="overflow-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr>
              <th className="bg-bg-raised text-text-muted text-left px-3 py-1.5 border-b border-border-base text-[10px] uppercase tracking-wide font-semibold">Parser</th>
              <th className="bg-bg-raised text-text-muted text-left px-3 py-1.5 border-b border-border-base text-[10px] uppercase tracking-wide font-semibold">Acepta</th>
              <th className="bg-bg-raised text-text-muted text-left px-3 py-1.5 border-b border-border-base text-[10px] uppercase tracking-wide font-semibold">Pasos</th>
              <th className="bg-bg-raised text-text-muted text-left px-3 py-1.5 border-b border-border-base text-[10px] uppercase tracking-wide font-semibold">Conflictos / Error</th>
            </tr>
          </thead>
          <tbody>
            {compareResults.map((r) => (
              <tr key={r.parser} className="group">
                <td className="px-3 py-1.5 border-b border-border-dim group-hover:bg-bg-surface font-mono">{r.parser}</td>
                <td className="px-3 py-1.5 border-b border-border-dim group-hover:bg-bg-surface">{r.accepted === null ? '—' : r.accepted ? '✓' : '✗'}</td>
                <td className="px-3 py-1.5 border-b border-border-dim group-hover:bg-bg-surface">{r.stepsCount ?? '—'}</td>
                <td className="px-3 py-1.5 border-b border-border-dim group-hover:bg-bg-surface text-[12px] text-text-secondary">{r.error ?? (r.conflicts && r.conflicts.length > 0 ? `${r.conflicts.length} conflicto(s)` : '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

// Same as ActionGotoView but reads from compiledParser (before Run is pressed)
function ActionGotoViewFromCompiled() {
  const { compiledParser, activeParser } = useAppStore()
  if (!compiledParser) return null

  const isLL1 = activeParser === 'll1'

  if (isLL1 && compiledParser.parseTable) {
    return <LL1TableView table={compiledParser.parseTable} />
  }

  if (compiledParser.actionTable && compiledParser.gotoTable) {
    return <LRTableView
      actionTable={compiledParser.actionTable}
      gotoTable={compiledParser.gotoTable}
      grammar={null}
    />
  }

  return (
    <Centered>
      <p className="text-text-muted text-xs">No hay tabla disponible para este parser.</p>
    </Centered>
  )
}

function LL1TableView({ table }: { table: Record<string, Record<string, string[]>> }) {
  // Filtrar no-terminales: excluir el símbolo aumentado (que empieza con $)
  const nonTerminals = Object.keys(table).filter(nt => !nt.startsWith('$'))
  const terminalsSet = new Set<string>()
  for (const nt of nonTerminals) {
    for (const t of Object.keys(table[nt])) terminalsSet.add(t)
  }
  const terminals = [...terminalsSet]
    .filter(t => t !== '$')
    .sort()
    .concat('$')

  const tableRef = useRef<HTMLDivElement | null>(null)

  const exportPdf = () => {
    if (!tableRef.current) return
    exportElementToPdf(tableRef.current, 'll1-table')
  }

  // en buildLL1Table, justo antes del return
  console.log('Tabla E\':', JSON.stringify(table["E'"]));
  console.log('Tabla T\':', JSON.stringify(table["T'"]));
  console.log('prod para E\' con +:', table["E'"]?.["+"], typeof table["E'"]?.["+"])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div />
        <button
          onClick={exportPdf}
          className="text-[11px] bg-bg-raised px-2 py-1 rounded border border-border-base text-text-secondary hover:text-text-primary"
        >
          Exportar PDF
        </button>
      </div>
      <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3 font-semibold">
        Tabla Predictiva LL(1)
      </p>
      <div ref={tableRef} className="overflow-auto">
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
                  console.log('renderizando NT:', nt, 'keys:', Object.keys(table[nt] ?? {}))
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
  grammar: ParseResult | null
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
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3 font-semibold">Tabla ACTION / GOTO</p>
        <button
          onClick={() => {
            const el = document.getElementById('action-goto-table')
            if (el) exportElementToPdf(el, 'action-goto-table')
          }}
          className="text-[11px] bg-bg-raised px-2 py-1 rounded border border-border-base text-text-secondary hover:text-text-primary"
        >
          Exportar PDF
        </button>
      </div>
      <div id="action-goto-table" className="overflow-auto">
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

function TreeView() {
  const { parseResult } = useAppStore()
  if (!parseResult?.treeRoot) return (
    <Centered>
      <div className="text-3xl text-text-muted mb-3">⊤</div>
      <p className="text-text-secondary text-sm font-medium mb-1">Árbol de Derivación</p>
      <p className="text-text-muted text-xs">Ejecuta el parser primero</p>
    </Centered>
  )
  return <TreeSVG root={parseResult.treeRoot} />
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface LayoutNode {
  label: string
  x: number
  y: number
  children: LayoutNode[]
}

const NODE_W = 44
const NODE_H = 36
const H_GAP = 10
const V_GAP = 48

function computeLayout(node: import('../../types').TreeNode, depth = 0): LayoutNode {
  if (node.children.length === 0) {
    return { label: node.label, x: 0, y: depth * (NODE_H + V_GAP), children: [] }
  }

  const children = node.children.map(c => computeLayout(c, depth + 1))

  // Posicionar hijos uno al lado del otro
  let offset = 0
  for (const child of children) {
    shiftTree(child, offset - minX(child))
    offset += treeWidth(child) + H_GAP
  }

  // Centrar el padre sobre sus hijos
  const leftmost = minX(children[0])
  const rightmost = maxX(children[children.length - 1])
  const cx = (leftmost + rightmost) / 2

  return {
    label: node.label,
    x: cx,
    y: depth * (NODE_H + V_GAP),
    children,
  }
}

function minX(node: LayoutNode): number {
  if (node.children.length === 0) return node.x
  return Math.min(node.x, ...node.children.map(minX))
}

function maxX(node: LayoutNode): number {
  if (node.children.length === 0) return node.x
  return Math.max(node.x, ...node.children.map(maxX))
}

function treeWidth(node: LayoutNode): number {
  return maxX(node) - minX(node) + NODE_W
}

function shiftTree(node: LayoutNode, dx: number): void {
  node.x += dx
  for (const c of node.children) shiftTree(c, dx)
}

function collectNodes(node: LayoutNode): LayoutNode[] {
  return [node, ...node.children.flatMap(collectNodes)]
}

function collectEdges(node: LayoutNode): { x1: number; y1: number; x2: number; y2: number }[] {
  return node.children.flatMap(child => [
    { x1: node.x, y1: node.y, x2: child.x, y2: child.y },
    ...collectEdges(child),
  ])
}

// ── Renderer ──────────────────────────────────────────────────────────────────

function TreeSVG({ root }: { root: import('../../types').TreeNode }) {
  const layout = computeLayout(root)

  // Normalizar para que empiece en x=0
  const allNodes = collectNodes(layout)
  const minXVal = Math.min(...allNodes.map(n => n.x))
  shiftTree(layout, -minXVal + NODE_W / 2 + 8)

  const allNodesNorm = collectNodes(layout)
  const edges = collectEdges(layout)

  const PADDING_TOP = 24
  const svgW = Math.max(...allNodesNorm.map(n => n.x)) + NODE_W / 2 + 16
  const svgH = Math.max(...allNodesNorm.map(n => n.y)) + NODE_H + PADDING_TOP + 16

  const isNonTerminal = (label: string) =>
    label !== 'ε' && label === label.toUpperCase() || /^[A-Z]/.test(label)

  return (
    <div className="overflow-auto w-full h-full">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="font-mono"
        style={{ display: 'block', margin: '0 auto' }}
      >
        <g transform={`translate(0, ${PADDING_TOP})`}>
          {/* Edges */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1}
              y1={e.y1 + NODE_H / 2}
              x2={e.x2}
              y2={e.y2 - NODE_H / 2}
              stroke="var(--color-border-strong, #444)"
              strokeWidth={1.5}
            />
          ))}

          {/* Nodes */}
          {allNodesNorm.map((n, i) => {
            const isNT = isNonTerminal(n.label)
            return (
              <g key={i} transform={`translate(${n.x - NODE_W / 2}, ${n.y - NODE_H / 2})`}>
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill={isNT ? 'var(--color-bg-raised, #1e1e2e)' : 'var(--color-bg-base, #13131a)'}
                  stroke={isNT
                    ? 'var(--color-accent-green, #00ff99)'
                    : 'var(--color-accent-cyan, #00d4ff)'}
                  strokeWidth={1.5}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                  fill={isNT
                    ? 'var(--color-accent-green, #00ff99)'
                    : 'var(--color-accent-cyan, #00d4ff)'}
                >
                  {n.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function AutomataView() {
  const { parseResult, compiledParser, activeParser } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // Use automata from parseResult if available, fall back to compiledParser
  const automata = parseResult?.automata ?? compiledParser?.automata

  if (!automata) return (
    <Centered>
      <div className="text-3xl text-text-muted mb-3">◎</div>
      <p className="text-text-secondary text-sm font-medium mb-1">Autómata LR</p>
      <p className="text-text-muted text-xs">
        {['ll1', 'recursive-descent'].includes(activeParser)
          ? 'No aplica para parsers top-down'
          : 'Ejecuta el parser primero'}
      </p>
    </Centered>
  )

  return (
    <div ref={containerRef} className="relative w-full h-full bg-bg-base">
      <style>{fullscreenStyle}</style>
      {/* Botón fullscreen */}
      <button
        onClick={toggleFullscreen}
        title="Pantalla completa"
        className="absolute top-2 right-2 z-10 bg-bg-raised border border-border-base rounded-md px-2 py-1 text-[10px] text-text-muted hover:text-text-primary hover:border-border-strong transition-colors cursor-pointer font-mono"
      >
        ⛶ Fullscreen
      </button>

      <AutomataSVG data={automata} />
    </div>
  )
}

// Utility: export element directly to PDF using html2canvas + jsPDF (direct download)
async function exportElementToPdf(el: HTMLElement, filename = 'table') {
  try {
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')

    // clone to avoid modifying original styles
    const clone = el.cloneNode(true) as HTMLElement
    const wrapper = document.createElement('div')
    wrapper.style.background = '#13131a'
    wrapper.style.padding = '16px'
    wrapper.style.color = '#e6eef3'
    wrapper.style.fontFamily = 'monospace'
    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(wrapper, { backgroundColor: '#13131a', scale: 2, useCORS: true, allowTaint: true })
    const imgData = canvas.toDataURL('image/png')

    // Landscape orientation for wide tables
    const pdf = new jsPDF({ orientation: 'landscape' })
    const imgProps = (pdf as any).getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
    const pageHeight = pdf.internal.pageSize.getHeight()

    let heightLeft = pdfHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
    heightLeft -= pageHeight

    // Add extra pages if content exceeds one page
    while (heightLeft > 0) {
      position = heightLeft - pdfHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`)

    // cleanup
    document.body.removeChild(wrapper)
  } catch (e) {
    console.error(e)
    alert('Error exportando a PDF: ' + String(e))
  }
}

function AutomataSVG({ data }: { data: import('../../types').AutomataData }) {
  const { states, transitions } = data

  const STATE_W = 180
  const STATE_PAD = 12
  const ITEM_H = 16
  const HEADER_H = 24
  const COL_GAP = 80
  const ROW_GAP = 100

  const stateHeight = (s: typeof states[0]) =>
    HEADER_H + STATE_PAD + s.items.length * ITEM_H + STATE_PAD

  // BFS para asignar nivel (fila) a cada estado
  const levels = new Map<number, number>()
  const queue = [0]
  levels.set(0, 0)
  const adjList = new Map<number, number[]>()
  for (const t of transitions) {
    if (!adjList.has(t.from)) adjList.set(t.from, [])
    adjList.get(t.from)!.push(t.to)
  }
  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const next of adjList.get(cur) ?? []) {
      if (!levels.has(next)) {
        levels.set(next, levels.get(cur)! + 1)
        queue.push(next)
      }
    }
  }

  // Agrupar estados por nivel
  const byLevel = new Map<number, number[]>()
  for (const [id, level] of levels) {
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)!.push(id)
  }
  // Estados sin nivel (si hay ciclos no alcanzados)
  for (const s of states) {
    if (!levels.has(s.id)) {
      const maxLevel = Math.max(...levels.values()) + 1
      levels.set(s.id, maxLevel)
      if (!byLevel.has(maxLevel)) byLevel.set(maxLevel, [])
      byLevel.get(maxLevel)!.push(s.id)
    }
  }

  // Calcular posiciones
  const positions: Record<number, { x: number; y: number }> = {}
  const maxPerRow = 4

  // Calcular altura máxima por fila real (agrupando niveles de a maxPerRow)
  const stateById = new Map(states.map(s => [s.id, s]))

  // Flatten niveles en filas de maxPerRow
  const rows: number[][] = []
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b)
  for (const level of sortedLevels) {
    const ids = byLevel.get(level)!.sort((a, b) => a - b)
    for (let i = 0; i < ids.length; i += maxPerRow) {
      rows.push(ids.slice(i, i + maxPerRow))
    }
  }

  let yOffset = 0
  for (const row of rows) {
    const rowH = Math.max(...row.map(id => stateHeight(stateById.get(id)!)))
    row.forEach((id, col) => {
      positions[id] = { x: col * (STATE_W + COL_GAP), y: yOffset }
    })
    yOffset += rowH + ROW_GAP
  }

  const totalW = Math.min(maxPerRow, Math.max(...rows.map(r => r.length))) * (STATE_W + COL_GAP) + 16
  const totalH = yOffset + 16

  return (
    <div className="overflow-auto w-full h-full">
      <svg
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="font-mono"
        style={{ display: 'block', margin: '0 auto' }}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="var(--color-border-strong, #555)" />
          </marker>
        </defs>

        {/* Transiciones */}
        {transitions.map((t, i) => {
          const fromPos = positions[t.from]
          const toPos = positions[t.to]
          if (!fromPos || !toPos) return null
          const fromState = stateById.get(t.from)!
          const toState = stateById.get(t.to)!
          const fromH = stateHeight(fromState)
          const toH = stateHeight(toState)

          // Self-loop
          if (t.from === t.to) {
            const cx = fromPos.x + STATE_W / 2
            const cy = fromPos.y + fromH
            return (
              <g key={i}>
                <path
                  d={`M${cx - 20},${cy} C${cx - 40},${cy + 40} ${cx + 40},${cy + 40} ${cx + 20},${cy}`}
                  fill="none"
                  stroke="var(--color-border-strong, #555)"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                />
                <text x={cx} y={cy + 44} textAnchor="middle" fontSize={10}
                  fill="var(--color-accent-orange, #ff9944)"
                  fontFamily="JetBrains Mono, monospace">
                  {t.symbol}
                </text>
              </g>
            )
          }

          // Determinar si va hacia abajo, arriba o al lado
          const fx = fromPos.x + STATE_W / 2
          const fy = fromPos.y + fromH / 2
          const tx = toPos.x + STATE_W / 2
          const ty = toPos.y + toH / 2

          // Offset lateral para evitar cruces entre flechas paralelas
          const dx = tx - fx
          const dy = ty - fy
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const perpX = -dy / len * 20
          const perpY = dx / len * 20

          const mx = (fx + tx) / 2 + perpX
          const my = (fy + ty) / 2 + perpY

          // Punto de salida/entrada en el borde del rect
          const exitX = fx + (dx / len) * (STATE_W / 2)
          const exitY = fy + (dy / len) * (fromH / 2)
          const entryX = tx - (dx / len) * (STATE_W / 2)
          const entryY = ty - (dy / len) * (toH / 2)

          return (
            <g key={i}>
              <path
                d={`M${exitX},${exitY} Q${mx},${my} ${entryX},${entryY}`}
                fill="none"
                stroke="var(--color-border-strong, #555)"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
              <text
                x={mx}
                y={my - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-accent-orange, #ff9944)"
                fontFamily="JetBrains Mono, monospace"
              >
                {t.symbol}
              </text>
            </g>
          )
        })}

        {/* Estados */}
        {states.map(state => {
          const pos = positions[state.id]
          if (!pos) return null
          const h = stateHeight(state)
          const isStart = state.id === 0

          return (
            <g key={state.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect width={STATE_W} height={h} rx={8}
                fill="var(--color-bg-raised, #1e1e2e)"
                stroke={isStart ? 'var(--color-accent-green, #00ff99)' : 'var(--color-border-base, #333)'}
                strokeWidth={isStart ? 2 : 1.5}
              />
              <rect width={STATE_W} height={HEADER_H} rx={8}
                fill={isStart ? 'var(--color-accent-green, #00ff99)22' : 'var(--color-bg-active, #252535)'}
              />
              <rect y={HEADER_H - 4} width={STATE_W} height={4}
                fill={isStart ? 'var(--color-accent-green, #00ff99)22' : 'var(--color-bg-active, #252535)'}
              />
              <text x={STATE_W / 2} y={HEADER_H / 2 + 4} textAnchor="middle"
                fontSize={11} fontWeight="bold"
                fill={isStart ? 'var(--color-accent-green, #00ff99)' : 'var(--color-text-secondary, #aaa)'}
                fontFamily="JetBrains Mono, monospace"
              >
                I{state.id}
              </text>
              {state.items.map((item, j) => (
                <text key={j} x={STATE_PAD} y={HEADER_H + STATE_PAD + j * ITEM_H + ITEM_H - 3}
                  fontSize={9.5} fontFamily="JetBrains Mono, monospace"
                  fill={item.includes('•') ? 'var(--color-text-primary, #eee)' : 'var(--color-text-muted, #666)'}
                >
                  {item.length > 26 ? item.slice(0, 24) + '…' : item}
                </text>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
