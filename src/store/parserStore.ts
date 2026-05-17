import { create } from 'zustand'
import type {
  ParserType,
  CenterTab,
  ParseResult,
  ChatMessage,
  CompiledParser,
} from '../types'
import type { ComparisonResult } from '../types'

const DEFAULT_GRAMMAR = `S → E
E → E + T | T
T → T * F | F
F → ( E ) | id`

const DEFAULT_INPUT = ''

interface AppStore {
  // State
  grammar: string
  inputString: string
  activeParser: ParserType
  activeTab: CenterTab
  parseResult: ParseResult | null
  compiledParser: CompiledParser | null
  isRunning: boolean
  isCompiling: boolean
  chatMessages: ChatMessage[]
  isChatLoading: boolean
  // Comparison
  isComparing: boolean
  compareResults: ComparisonResult[]

  // Actions
  setGrammar: (g: string) => void
  setInputString: (s: string) => void
  setActiveParser: (p: ParserType) => void
  setActiveTab: (t: CenterTab) => void
  setParseResult: (r: ParseResult | null) => void
  setCompiledParser: (c: CompiledParser | null) => void
  setIsRunning: (v: boolean) => void
  setIsCompiling: (v: boolean) => void
  addChatMessage: (m: ChatMessage) => void
  setChatLoading: (v: boolean) => void
  clearChat: () => void
  // Comparison actions
  setIsComparing: (v: boolean) => void
  setCompareResults: (r: ComparisonResult[]) => void
  compareAllParsers: () => Promise<void>
}

export const useAppStore = create<AppStore>((set, get) => ({
  grammar: DEFAULT_GRAMMAR,
  inputString: DEFAULT_INPUT,
  activeParser: 'slr1',
  activeTab: 'steps',
  parseResult: null,
  compiledParser: null,
  isRunning: false,
  isCompiling: false,
  chatMessages: [
    {
      role: 'ai',
      content:
        'Hola! Ingresa una gramática, selecciona un parser y presiona Run. Puedo explicarte cada paso, conflictos shift/reduce, FIRST/FOLLOW, y más.',
    },
  ],
  isChatLoading: false,
  isComparing: false,
  compareResults: [],

  setGrammar: (grammar) => set({ grammar }),
  setInputString: (inputString) => set({ inputString }),
  setActiveParser: (activeParser) =>
    set({ activeParser, parseResult: null, activeTab: 'steps' }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setParseResult: (parseResult) => set({ parseResult }),
  setCompiledParser: (compiledParser) => set({ compiledParser }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setIsCompiling: (isCompiling) => set({ isCompiling }),
  addChatMessage: (m) =>
    set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  setChatLoading: (isChatLoading) => set({ isChatLoading }),
  clearChat: () =>
    set({
      chatMessages: [
        { role: 'ai', content: 'Chat reiniciado. ¿En qué puedo ayudarte?' },
      ],
    }),
  setIsComparing: (isComparing) => set({ isComparing }),
  setCompareResults: (compareResults) => set({ compareResults }),
  compareAllParsers: async () => {
    set({ isComparing: true, compareResults: [] })
    const state = (await import('../parsers/parsers-map')).parsers
    const results: ComparisonResult[] = []
    const getGrammar = (s: any) => s.grammar
    const getInput = (s: any) => s.inputString
    const grammar = get().grammar
    const input = get().inputString

    for (const id of Object.keys(state) as Array<keyof typeof state>) {
      try {
        const module = state[id]
        let compiled = null
        try {
          compiled = module.compile(grammar)
        } catch (e) {
          results.push({ parser: id as ParserType, accepted: null, stepsCount: null, error: String(e) })
          continue
        }

        if (!compiled || !compiled.isValid) {
          results.push({ parser: id as ParserType, accepted: null, stepsCount: null, conflicts: compiled?.conflicts, error: compiled?.error })
          continue
        }

        try {
          const res = module.parse(compiled, grammar, input)
          results.push({ parser: id as ParserType, accepted: res.accepted, stepsCount: res.steps?.length ?? null, conflicts: compiled.conflicts })
        } catch (e) {
          results.push({ parser: id as ParserType, accepted: null, stepsCount: null, error: String(e) })
        }
      } catch (err) {
        results.push({ parser: id as ParserType, accepted: null, stepsCount: null, error: String(err) })
      }
    }

    set({ compareResults: results, isComparing: false })
  },
}))
