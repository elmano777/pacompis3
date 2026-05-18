// src/components/layout/CenterPanel.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
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

type StateVisualOverride = {
  opacity?: number
  scale?: number
  stroke?: string
  badge?: string
  pulse?: boolean
  merging?: boolean      // en proceso de fusionarse (se va a mover)
  merged?: boolean       // ya fue absorbido (fade-out al representante)
  highlight?: boolean    // resaltado como destino del merge
  glow?: string          // color de glow
}

function AutomataView() {
  const { parseResult, compiledParser, activeParser } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [animatedMode, setAnimatedMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1200)  // ms por paso

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // Use automata from parseResult if available, fall back to compiledParser
  const automata = parseResult?.automata ?? compiledParser?.automata
  const construction = compiledParser?.lalrConstruction

  const lr1StateIds = useMemo(
    () => construction?.lr1Automata.states.map((s) => s.id).sort((a, b) => a - b) ?? [],
    [construction]
  )

  const mergeGroups = useMemo(() => construction?.mergeGroups ?? [], [construction])

  const phase1Steps = lr1StateIds.length
  const phase2Steps = mergeGroups.length * 3   // 3 sub-pasos por grupo: highlight → convergencia → merge listo
  const totalSteps = animatedMode && construction ? Math.max(1, phase1Steps + phase2Steps + 1) : 1

  useEffect(() => {
    if (!animatedMode) {
      setIsPlaying(false)
      setCurrentStep(0)
      return
    }
    setCurrentStep(0)
  }, [animatedMode])

  useEffect(() => {
    if (!animatedMode || !isPlaying) return
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, playSpeed)

    return () => clearInterval(timer)
  }, [animatedMode, isPlaying, totalSteps, playSpeed])

  const phaseInfo = useMemo(() => {
    const noArrows: { from: number; to: number; color: string }[] = []

    if (!construction) {
      return {
        phaseLabel: 'Autómata LR',
        status: '',
        data: automata!,
        hiddenStateIds: new Set<number>(),
        overrides: {} as Record<number, StateVisualOverride>,
        mergeArrows: noArrows,
      }
    }

    const overrides: Record<number, StateVisualOverride> = {}
    const hiddenStateIds = new Set<number>()

    if (currentStep < phase1Steps) {
      const visibleCount = currentStep + 1
      const visible = new Set(lr1StateIds.slice(0, visibleCount))
      for (const id of lr1StateIds) {
        if (!visible.has(id)) hiddenStateIds.add(id)
      }

      const currentId = lr1StateIds[Math.min(currentStep, lr1StateIds.length - 1)]
      if (currentId !== undefined) {
        overrides[currentId] = {
          stroke: 'var(--color-accent-cyan, #00d4ff)',
          scale: 1.06,
        }
      }

      return {
        phaseLabel: 'Fase 1 — Construyendo LR(1)',
        status: currentId !== undefined ? `Construyendo estado I${currentId}...` : 'Construyendo LR(1)...',
        data: construction.lr1Automata,
        hiddenStateIds,
        overrides,
        mergeArrows: noArrows,
      }
    }

    if (currentStep < phase1Steps + phase2Steps) {
      const localStep = currentStep - phase1Steps
      const groupIndex = Math.floor(localStep / 3)
      const subStep = localStep % 3   // 0=highlight todos, 1=convergencia (flechas), 2=merge listo
      const group = mergeGroups[groupIndex]

      const palette = [
        'var(--color-accent-cyan, #00d4ff)',
        'var(--color-accent-orange, #ff9944)',
        '#a78bfa',
        '#22c55e',
        '#f43f5e',
        '#fbbf24',
      ]

      // Aplicar merges ya completados (grupos anteriores)
      for (let i = 0; i < groupIndex; i++) {
        const doneGroup = mergeGroups[i]
        for (const id of doneGroup.members) {
          if (id !== doneGroup.representative) hiddenStateIds.add(id)
        }
        overrides[doneGroup.representative] = {
          stroke: 'var(--color-accent-green, #00ff99)',
          badge: '✓',
          scale: 1.04,
          glow: 'var(--color-accent-green, #00ff99)',
        }
      }

      if (group) {
        const groupColor = palette[groupIndex % palette.length]

        if (subStep === 0) {
          // Sub-paso 0: resaltar todos los miembros del grupo con pulse
          for (const id of group.members) {
            overrides[id] = {
              stroke: groupColor,
              pulse: true,
              scale: 1.05,
              glow: groupColor,
            }
          }
          return {
            phaseLabel: 'Fase 2 — Fusionando estados',
            status: `🔍 Mismo core: ${group.members.map((id) => `I${id}`).join(', ')} — solo difieren en lookaheads`,
            data: construction.lr1Automata,
            hiddenStateIds,
            overrides,
            mergeArrows: noArrows,
          }
        } else if (subStep === 1) {
          // Sub-paso 1: flechas animadas de convergencia + estados no-rep se contraen
          for (const id of group.members) {
            if (id !== group.representative) {
              overrides[id] = {
                stroke: groupColor,
                merging: true,
                opacity: 0.35,
                scale: 0.85,
              }
            }
          }
          overrides[group.representative] = {
            stroke: groupColor,
            highlight: true,
            pulse: true,
            scale: 1.08,
            glow: groupColor,
            badge: '⊕',
          }
          // Flechas de merge: cada no-representante apunta al representante
          const arrows = group.members
            .filter(id => id !== group.representative)
            .map(id => ({ from: id, to: group.representative, color: groupColor }))
          return {
            phaseLabel: 'Fase 2 — Fusionando estados',
            status: `⊕ Absorbiendo ${group.members.filter(id => id !== group.representative).map(id => `I${id}`).join(', ')} → I${group.representative}`,
            data: construction.lr1Automata,
            hiddenStateIds,
            overrides,
            mergeArrows: arrows,
          }
        } else {
          // Sub-paso 2: merge completado — duplicados desaparecen, representante ✓
          for (const id of group.members) {
            if (id !== group.representative) hiddenStateIds.add(id)
          }
          overrides[group.representative] = {
            stroke: 'var(--color-accent-green, #00ff99)',
            badge: '✓',
            scale: 1.06,
            glow: 'var(--color-accent-green, #00ff99)',
          }
          return {
            phaseLabel: 'Fase 2 — Fusionando estados',
            status: `✓ I${group.representative} listo — lookaheads de ${group.members.map(id => `I${id}`).join(' + ')} combinados`,
            data: construction.lr1Automata,
            hiddenStateIds,
            overrides,
            mergeArrows: noArrows,
          }
        }
      }
    }

    return {
      phaseLabel: 'Fase 3 — Autómata LALR(1) listo',
      status: 'Autómata LALR(1) final listo',
      data: construction.lalrAutomata,
      hiddenStateIds,
      overrides,
      mergeArrows: noArrows,
    }
  }, [automata, construction, currentStep, lr1StateIds, mergeGroups, phase1Steps, phase2Steps])

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
      <style>{`
        @keyframes statePulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes stateMergeIn {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes dashFlow {
          from { stroke-dashoffset: 20; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 flex-wrap">
        {activeParser === 'lalr1' && construction && !animatedMode && (
          <button
            onClick={() => setAnimatedMode(true)}
            className="bg-bg-raised border border-border-base rounded-md px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors cursor-pointer"
          >
            🎬 Ver construcción
          </button>
        )}

        {animatedMode && construction && (
          <>
            <button
              onClick={() => {
                setAnimatedMode(false)
                setIsPlaying(false)
              }}
              className="bg-bg-raised border border-border-base rounded-md px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors cursor-pointer"
            >
              Salir animación
            </button>

            <button onClick={() => { setCurrentStep(0); setIsPlaying(false) }} className="bg-bg-raised border border-border-base rounded px-2 py-1 text-[11px]">⏮</button>
            <button onClick={() => { setCurrentStep((s) => Math.max(0, s - 1)); setIsPlaying(false) }} className="bg-bg-raised border border-border-base rounded px-2 py-1 text-[11px]">⏪</button>
            <button onClick={() => setIsPlaying((p) => !p)} className="bg-bg-raised border border-border-base rounded px-2 py-1 text-[11px]">{isPlaying ? '⏸' : '▶'}</button>
            <button onClick={() => { setCurrentStep((s) => Math.min(totalSteps - 1, s + 1)); setIsPlaying(false) }} className="bg-bg-raised border border-border-base rounded px-2 py-1 text-[11px]">⏩</button>
            <button onClick={() => { setCurrentStep(totalSteps - 1); setIsPlaying(false) }} className="bg-bg-raised border border-border-base rounded px-2 py-1 text-[11px]">⏭</button>

            {/* Velocidad */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-text-muted">Vel:</span>
              {([2000, 1200, 600] as const).map((ms) => (
                <button
                  key={ms}
                  onClick={() => setPlaySpeed(ms)}
                  className={`rounded px-1.5 py-1 text-[10px] border transition-colors ${playSpeed === ms ? 'border-accent-cyan text-accent-cyan bg-bg-active' : 'border-border-base text-text-muted bg-bg-raised'}`}
                >
                  {ms === 2000 ? '×0.5' : ms === 1200 ? '×1' : '×2'}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(totalSteps - 1, 0)}
              value={currentStep}
              onChange={(e) => {
                setCurrentStep(Number(e.target.value))
                setIsPlaying(false)
              }}
              className="w-40 accent-cyan"
            />

            <div className="text-[11px] text-text-secondary px-2 py-1 rounded bg-bg-raised border border-border-base">
              {phaseInfo.phaseLabel}
            </div>
            <div className="text-[11px] text-text-muted px-2 py-1 rounded bg-bg-raised border border-border-base max-w-[280px] truncate" title={phaseInfo.status}>
              {phaseInfo.status}
            </div>
            <div className="text-[10px] text-text-muted px-2 py-1 rounded bg-bg-raised border border-border-base font-mono">
              {currentStep + 1}/{totalSteps}
            </div>
          </>
        )}
      </div>

      {/* Botón fullscreen */}
      <button
        onClick={toggleFullscreen}
        title="Pantalla completa"
        className="absolute top-2 right-2 z-10 bg-bg-raised border border-border-base rounded-md px-2 py-1 text-[10px] text-text-muted hover:text-text-primary hover:border-border-strong transition-colors cursor-pointer font-mono"
      >
        ⛶ Fullscreen
      </button>

      <AutomataSVG
        data={animatedMode && construction ? phaseInfo.data : automata}
        hiddenStateIds={animatedMode && construction ? phaseInfo.hiddenStateIds : undefined}
        stateOverrides={animatedMode && construction ? phaseInfo.overrides : undefined}
        mergeArrows={animatedMode && construction ? phaseInfo.mergeArrows : undefined}
        topPad={animatedMode ? 52 : 8}
      />
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

function AutomataSVG({
  data,
  hiddenStateIds,
  stateOverrides,
  mergeArrows,
  topPad = 0,
}: {
  data: import('../../types').AutomataData
  hiddenStateIds?: Set<number>
  stateOverrides?: Record<number, StateVisualOverride>
  mergeArrows?: { from: number; to: number; color: string }[]
  topPad?: number
}) {
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

  let yOffset = topPad
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
          if (hiddenStateIds?.has(t.from) || hiddenStateIds?.has(t.to)) return null
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

        {/* Flechas de merge — muestran visualmente qué estado se absorbe en cuál */}
        {mergeArrows?.map((arrow, i) => {
          const fromPos = positions[arrow.from]
          const toPos = positions[arrow.to]
          if (!fromPos || !toPos) return null
          const fromState = stateById.get(arrow.from)!
          const toState = stateById.get(arrow.to)!
          if (!fromState || !toState) return null
          const fromH = stateHeight(fromState)
          const toH = stateHeight(toState)
          const fx = fromPos.x + STATE_W / 2
          const fy = fromPos.y + fromH / 2
          const tx = toPos.x + STATE_W / 2
          const ty = toPos.y + toH / 2
          const dx = tx - fx
          const dy = ty - fy
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const exitX = fx + (dx / len) * (STATE_W / 2 + 8)
          const exitY = fy + (dy / len) * (fromH / 2 + 8)
          const entryX = tx - (dx / len) * (STATE_W / 2 + 8)
          const entryY = ty - (dy / len) * (toH / 2 + 8)
          const mx = (exitX + entryX) / 2
          const my = (exitY + entryY) / 2 - 30
          return (
            <g key={`merge-${i}`}>
              <defs>
                <marker id={`merge-arrow-${i}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={arrow.color} />
                </marker>
              </defs>
              {/* línea punteada animada */}
              <path
                d={`M${exitX},${exitY} Q${mx},${my} ${entryX},${entryY}`}
                fill="none"
                stroke={arrow.color}
                strokeWidth={2}
                strokeDasharray="6 4"
                markerEnd={`url(#merge-arrow-${i})`}
                opacity={0.85}
                style={{
                  strokeDashoffset: 0,
                  animation: 'dashFlow 1s linear infinite',
                }}
              />
              {/* etiqueta "⊕" en el punto medio */}
              <text x={mx} y={my - 6} textAnchor="middle" fontSize={13} fill={arrow.color} fontFamily="JetBrains Mono, monospace">⊕</text>
            </g>
          )
        })}
        {states.map(state => {
          const pos = positions[state.id]
          if (!pos) return null

          const override = stateOverrides?.[state.id]
          const isHidden = hiddenStateIds?.has(state.id)
          const h = stateHeight(state)
          const isStart = state.id === 0
          const scale = override?.scale ?? 1
          const cx = pos.x + STATE_W / 2
          const cy = pos.y + h / 2
          const strokeColor = override?.stroke ?? (isStart ? 'var(--color-accent-green, #00ff99)' : 'var(--color-border-strong, #666)')
          // El texto del header siempre visible — no usar el stroke (puede ser muy tenue en fase 3)
          const labelColor = override?.stroke ?? (isStart ? 'var(--color-accent-green, #00ff99)' : 'var(--color-text-secondary, #aaa)')

          return (
            <g
              key={state.id}
              style={{
                opacity: isHidden ? 0 : (override?.opacity ?? 1),
                transition: 'opacity 450ms ease',
                pointerEvents: isHidden ? 'none' : 'auto',
              }}
            >
              {/* Glow ring detrás del estado */}
              {override?.glow && !isHidden && (
                <rect
                  x={pos.x - 6}
                  y={pos.y - 6}
                  width={STATE_W + 12}
                  height={h + 12}
                  rx={12}
                  fill="none"
                  stroke={override.glow}
                  strokeWidth={3}
                  opacity={0.35}
                  style={{ transition: 'opacity 350ms ease' }}
                />
              )}

              <g
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: override?.pulse
                    ? undefined
                    : `scale(${scale})`,
                  transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  animation: override?.pulse ? `statePulse 700ms ease-in-out infinite` : undefined,
                }}
              >
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={STATE_W}
                  height={h}
                  rx={8}
                  fill="var(--color-bg-raised, #1e1e2e)"
                  stroke={strokeColor}
                  strokeWidth={override?.highlight ? 2.5 : (isStart ? 2 : 1.5)}
                  style={{ transition: 'stroke 350ms ease, stroke-width 350ms ease' }}
                />
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={STATE_W}
                  height={HEADER_H}
                  rx={8}
                  fill={isStart ? 'var(--color-accent-green, #00ff99)22' : 'var(--color-bg-active, #252535)'}
                />
                <rect
                  x={pos.x}
                  y={pos.y + HEADER_H - 4}
                  width={STATE_W}
                  height={4}
                  fill={isStart ? 'var(--color-accent-green, #00ff99)22' : 'var(--color-bg-active, #252535)'}
                />
                <text
                  x={pos.x + STATE_W / 2}
                  y={pos.y + HEADER_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="bold"
                  fill={labelColor}
                  fontFamily="JetBrains Mono, monospace"
                >
                  I{state.id}
                </text>
                {override?.badge && (
                  <text
                    x={pos.x + STATE_W - 14}
                    y={pos.y + 16}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="bold"
                    fill={override.badge === '✓' ? 'var(--color-accent-green, #00ff99)' : strokeColor}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {override.badge}
                  </text>
                )}
                {state.items.map((item, j) => (
                  <text
                    key={j}
                    x={pos.x + STATE_PAD}
                    y={pos.y + HEADER_H + STATE_PAD + j * ITEM_H + ITEM_H - 3}
                    fontSize={9.5}
                    fontFamily="JetBrains Mono, monospace"
                    fill={item.includes('•') ? 'var(--color-text-primary, #eee)' : 'var(--color-text-muted, #666)'}
                  >
                    {item.length > 26 ? item.slice(0, 24) + '…' : item}
                  </text>
                ))}
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}