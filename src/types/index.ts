export type ParserType =
  | 'recursive-descent'
  | 'll1'
  | 'lr0'
  | 'slr1'
  | 'lalr1'
  | 'lr1'

export type ParserCategory = 'top-down' | 'bottom-up'

export interface ParserMeta {
  id: ParserType
  label: string
  category: ParserCategory
  description: string
}

export type CenterTab = 'steps' | 'table' | 'tree' | 'automata' | 'compare'
export type ComparisonResult = {
  parser: ParserType
  accepted: boolean | null
  stepsCount: number | null
  conflicts?: string[]
  error?: string
}

export type ActionType = 'shift' | 'reduce' | 'accept' | 'error' | 'predict' | 'match' | 'expand'

export interface ParseStep {
  step: number
  stack: string
  input: string
  action: string
  actionType: ActionType
}

// Resultado compilado del parser (tablas, autómata, sin ejecución)
export interface CompiledParser {
  actionTable?: Record<number, Record<string, string>>
  gotoTable?: Record<number, Record<string, number>>
  parseTable?: Record<string, Record<string, string[]>>
  automata?: AutomataData
  firstSets?: Record<string, Set<string>>
  followSets?: Record<string, Set<string>>
  error?: string
  conflicts?: string[]
  isValid: boolean
}

// Resultado de ejecutar el parsing sobre una cadena
export interface ParseResult {
  accepted: boolean
  steps: ParseStep[]
  error?: string
  firstSets?: Record<string, Set<string>>
  followSets?: Record<string, Set<string>>
  parseTable?: Record<string, Record<string, string[]>>
  actionTable?: Record<number, Record<string, string>>
  gotoTable?: Record<number, Record<string, number>>
  treeRoot?: TreeNode
  automata?: AutomataData
  grammarOnly?: boolean
}

export interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

export interface TreeNode {
  label: string
  children: TreeNode[]
}

export interface AutomataState {
  id: number
  items: string[]
}

export interface AutomataData {
  states: AutomataState[]
  transitions: { from: number; to: number; symbol: string }[]
}
